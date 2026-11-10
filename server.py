"""
VOLODIUM PARFUM — Secure Backend & Stealth Atelier Admin Gateway
FastAPI + Uvicorn + SQLite WAL

Security Highlights:
- ZERO mentions or hints of admin routes in public storefront
- Non-standard stealth admin path (VP_ADMIN_PATH) + dual Secret Gateway Tokens (Owner / Assistant)
- Strict 404 Cloaking: missing/invalid token returns identical 404 on admin & probe paths
- Zero local/proxy IP authentication bypass; trusted-proxy-only IP extraction
- PBKDF2-HMAC-SHA256 salted password verification + CSPRNG sessions + HttpOnly SameSite cookies
- Persistent IP rate-limiting, 15-min brute-force lockout & honeypot trap
- Strict magic-byte image validation (no SVG/HTML upload XSS)
- Zero Telegram alerts for admin logins or actions
"""

import os
import re
import hmac
import json
import time
import hashlib
import secrets
from typing import Optional, Dict, Any, List
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request, Response, UploadFile, File, Form
from fastapi.responses import HTMLResponse, JSONResponse, FileResponse, PlainTextResponse
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from pydantic import BaseModel, Field

import database as db

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

VP_ENV = os.environ.get("VP_ENV", "development").strip().lower()
VP_HOST = os.environ.get("VP_HOST", "127.0.0.1").strip()
VP_PORT = int(os.environ.get("VP_PORT", "8000"))
VP_BEHIND_PROXY = os.environ.get("VP_BEHIND_PROXY", "false").strip().lower() == "true"
VP_TRUSTED_PROXIES = {
    ip.strip() for ip in os.environ.get("VP_TRUSTED_PROXIES", "127.0.0.1,::1").split(",") if ip.strip()
}

_raw_admin_path = "/" + os.environ.get("VP_ADMIN_PATH", "/vp-atelier").strip("/")
VP_ADMIN_PATH = _raw_admin_path if len(_raw_admin_path) > 1 else "/vp-atelier"

VP_SECRET_KEY = os.environ.get("VP_SECRET_KEY", "").strip()
if not VP_SECRET_KEY or VP_SECRET_KEY.startswith("CHANGE_ME"):
    # Persist auto-generated secret key in DB if missing
    db.init_db()
    saved_secret = db.get_setting("runtime_hmac_secret")
    if not saved_secret:
        saved_secret = secrets.token_urlsafe(36)
        db.set_setting("runtime_hmac_secret", saved_secret)
    VP_SECRET_KEY = saved_secret
else:
    db.init_db()

MAX_LOGIN_ATTEMPTS = int(os.environ.get("VP_MAX_LOGIN_ATTEMPTS", "5"))
LOCKOUT_MINUTES = int(os.environ.get("VP_LOCKOUT_MINUTES", "15"))
MAX_GATE_FAILS = int(os.environ.get("VP_MAX_GATE_FAILS", "12"))
GATE_LOCKOUT_MINUTES = int(os.environ.get("VP_GATE_LOCKOUT_MINUTES", "30"))

CORS_ORIGINS = [
    o.strip()
    for o in os.environ.get(
        "VP_CORS_ALLOWED_ORIGINS",
        "http://127.0.0.1:8000,http://localhost:8000,http://127.0.0.1:3000,http://localhost:3000",
    ).split(",")
    if o.strip() and o.strip() != "*"
]

PRIVATE_ADMIN_DIR = BASE_DIR / "private_admin"
UPLOADS_DIR = BASE_DIR / "assets" / "uploads"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

GATE_COOKIE_NAME = "vp_gate"
SESSION_COOKIE_NAME = "vp_session"
IS_PROD = VP_ENV == "production"

NOT_FOUND_HTML = """<!doctype html>
<html lang="ru"><head><meta charset="utf-8"><meta name="robots" content="noindex,nofollow">
<title>404 Not Found</title>
<style>body{font-family:system-ui,-apple-system,sans-serif;background:#FAF8F5;color:#111216;display:grid;place-items:center;min-height:100vh;margin:0}main{text-align:center;padding:24px}h1{font-size:48px;margin:0 0 8px;font-weight:500}p{margin:0;color:#5A5455}</style>
</head><body><main><h1>404</h1><p>Страница не найдена</p></main></body></html>"""


def not_found_response() -> HTMLResponse:
    return HTMLResponse(
        content=NOT_FOUND_HTML,
        status_code=404,
        headers={
            "X-Robots-Tag": "noindex, nofollow",
            "Cache-Control": "no-store, no-cache, must-revalidate",
        },
    )


# ==============================================================================
# TRUSTED IP & HMAC GATE HELPERS
# ==============================================================================

def get_client_ip(request: Request) -> str:
    peer_ip = request.client.host if request.client else "unknown"
    if VP_BEHIND_PROXY and peer_ip in VP_TRUSTED_PROXIES:
        x_real = (request.headers.get("x-real-ip") or "").strip()
        if x_real:
            return x_real.split(",")[0].strip()
        x_fwd = (request.headers.get("x-forwarded-for") or "").strip()
        if x_fwd:
            return x_fwd.split(",")[0].strip()
    return peer_ip


def sign_gate_cookie(role: str, ttl_seconds: int = 43200) -> str:
    exp = int(time.time()) + ttl_seconds
    nonce = secrets.token_hex(8)
    payload = f"{role}|{exp}|{nonce}"
    sig = hmac.new(VP_SECRET_KEY.encode("utf-8"), payload.encode("utf-8"), hashlib.sha256).hexdigest()
    return f"{payload}|{sig}"


def verify_gate_cookie(cookie_val: Optional[str]) -> Optional[tuple]:
    if not cookie_val:
        return None
    parts = cookie_val.split("|")
    if len(parts) != 4:
        return None
    role, exp_s, nonce, sig = parts
    if role not in ("owner", "assistant"):
        return None
    try:
        exp = int(exp_s)
    except ValueError:
        return None
    if exp < int(time.time()):
        return None
    payload = f"{role}|{exp_s}|{nonce}"
    expected_sig = hmac.new(VP_SECRET_KEY.encode("utf-8"), payload.encode("utf-8"), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(sig, expected_sig):
        return None
    label = "Владимир (Владелец)" if role == "owner" else "Помощница"
    return (role, label)


def resolve_gate_from_request(request: Request) -> Optional[tuple]:
    """Authenticate gateway via HttpOnly signed cookie OR explicit X-Gateway-Token header."""
    header_tok = (request.headers.get("x-gateway-token") or "").strip()
    if header_tok:
        resolved = db.resolve_gateway_token_role(header_tok)
        if resolved:
            return resolved
    cookie_val = request.cookies.get(GATE_COOKIE_NAME)
    return verify_gate_cookie(cookie_val)


def require_session(request: Request) -> Dict[str, Any]:
    """Verify active CSPRNG session bound to HttpOnly cookie or Authorization header."""
    raw_token = ""
    auth_hdr = (request.headers.get("authorization") or "").strip()
    if auth_hdr.lower().startswith("bearer "):
        raw_token = auth_hdr[7:].strip()
    if not raw_token:
        raw_token = (request.cookies.get(SESSION_COOKIE_NAME) or "").strip()

    sess = db.get_admin_session(raw_token)
    if not sess:
        raise HTTPException(status_code=401, detail="Требуется авторизация в студии VOLODIUM")
    sess["raw_token"] = raw_token
    return sess


def require_owner(sess: Dict[str, Any]):
    if sess.get("operator_role") != "owner":
        raise HTTPException(
            status_code=403,
            detail="Это действие доступно только по токену владельца (Владимир).",
        )


# ==============================================================================
# APP & SECURITY MIDDLEWARE
# ==============================================================================

app = FastAPI(
    title="VOLODIUM PARFUM Atelier Hub",
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-Gateway-Token"],
)


BLOCKED_PREFIXES = (
    "/admin",
    "/wp-admin",
    "/wp-login",
    "/administrator",
    "/phpmyadmin",
    "/private_admin",
    "/server.py",
    "/database.py",
    "/requirements.txt",
    "/readme",
    "/scripts/",
    "/deploy/",
)
BLOCKED_EXTENSIONS = (".env", ".db", ".db-wal", ".db-shm", ".sqlite", ".sqlite3", ".py", ".pyc", ".log", ".bak", ".sh", ".example", ".md")


@app.middleware("http")
async def security_cloak_middleware(request: Request, call_next):
    path = request.url.path
    lower_path = path.lower()

    # Never expose sensitive system files or generic admin brute-force paths (unless VP_ADMIN_PATH explicitly matches)
    if lower_path != VP_ADMIN_PATH.lower():
        if any(lower_path == p or lower_path.startswith(p + "/") or lower_path.startswith(p + ".") for p in BLOCKED_PREFIXES if not p.endswith("/")):
            return not_found_response()
        if any(lower_path.startswith(p) for p in BLOCKED_PREFIXES if p.endswith("/")):
            return not_found_response()
    if any(lower_path.endswith(ext) for ext in BLOCKED_EXTENSIONS) or "/." in lower_path:
        return not_found_response()

    # Cloak admin/auth API endpoints BEFORE FastAPI/Pydantic body parsing so empty/malformed probes return 404 (not 422)
    if request.method != "OPTIONS" and (lower_path.startswith("/api/auth/") or lower_path.startswith("/api/admin/")):
        if lower_path in ("/api/auth/gate-status", "/api/auth/login"):
            if not resolve_gate_from_request(request):
                return not_found_response()
        else:
            has_gate = bool(resolve_gate_from_request(request))
            has_bearer = bool((request.headers.get("authorization") or "").strip())
            has_sess_cookie = bool((request.cookies.get(SESSION_COOKIE_NAME) or "").strip())
            if not (has_gate or has_bearer or has_sess_cookie):
                return not_found_response()

    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "SAMEORIGIN"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    if path.startswith(VP_ADMIN_PATH) or path.startswith("/_atelier_assets") or path.startswith("/api/admin") or path.startswith("/api/auth"):
        response.headers["X-Robots-Tag"] = "noindex, nofollow"
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
    return response


# ==============================================================================
# STEALTH GATEWAY & PRIVATE ADMIN UI ROUTES
# ==============================================================================

@app.get(VP_ADMIN_PATH)
async def stealth_admin_entry(request: Request, token: Optional[str] = None):
    ip = get_client_ip(request)
    gate_rl_key = f"gate:{ip}"
    is_locked, _ = db.check_rate_limit(gate_rl_key)
    if is_locked:
        return not_found_response()

    resolved: Optional[tuple] = None
    used_url_token = False

    if token is not None:
        resolved = db.resolve_gateway_token_role(token.strip())
        if not resolved:
            db.record_rate_limit_fail(gate_rl_key, MAX_GATE_FAILS, GATE_LOCKOUT_MINUTES)
            return not_found_response()
        db.clear_rate_limit(gate_rl_key)
        used_url_token = True
    else:
        resolved = verify_gate_cookie(request.cookies.get(GATE_COOKIE_NAME))

    if not resolved:
        return not_found_response()

    admin_html_path = PRIVATE_ADMIN_DIR / "admin.html"
    if not admin_html_path.exists():
        return not_found_response()

    html_content = admin_html_path.read_text(encoding="utf-8")
    resp = HTMLResponse(
        content=html_content,
        status_code=200,
        headers={
            "X-Robots-Tag": "noindex, nofollow",
            "Cache-Control": "no-store, no-cache, must-revalidate",
        },
    )
    if used_url_token:
        cookie_val = sign_gate_cookie(resolved[0], ttl_seconds=43200)
        resp.set_cookie(
            key=GATE_COOKIE_NAME,
            value=cookie_val,
            max_age=43200,
            httponly=True,
            samesite="strict",
            secure=IS_PROD,
            path="/",
        )
    return resp


@app.get("/_atelier_assets/{filename}")
async def serve_private_admin_asset(filename: str, request: Request):
    if not resolve_gate_from_request(request):
        return not_found_response()
    if filename not in ("admin.css", "admin.js"):
        return not_found_response()
    fpath = PRIVATE_ADMIN_DIR / filename
    if not fpath.exists():
        return not_found_response()
    media_type = "text/css; charset=utf-8" if filename.endswith(".css") else "application/javascript; charset=utf-8"
    return Response(
        content=fpath.read_bytes(),
        media_type=media_type,
        headers={
            "X-Robots-Tag": "noindex, nofollow",
            "Cache-Control": "no-store, no-cache, must-revalidate",
        },
    )


# ==============================================================================
# AUTHENTICATION API (PASSWORD + DUAL TOKEN ROLES, ZERO TELEGRAM)
# ==============================================================================

class LoginRequest(BaseModel):
    password: str = Field(..., min_length=1, max_length=256)
    honeypot: Optional[str] = ""


class ChangePasswordRequest(BaseModel):
    currentPassword: str = Field(..., min_length=1, max_length=256)
    newPassword: str = Field(..., min_length=6, max_length=256)


class RotateTokenRequest(BaseModel):
    role: str = Field(..., pattern="^(owner|assistant)$")


@app.get("/api/auth/gate-status")
async def auth_gate_status(request: Request):
    resolved = resolve_gate_from_request(request)
    if not resolved:
        return not_found_response()
    return {"gateActive": True, "operatorRole": resolved[0], "operatorLabel": resolved[1]}


@app.post("/api/auth/login")
async def auth_login(payload: LoginRequest, request: Request, response: Response):
    # Gate verification is mandatory on login endpoint (cloak as 404 if missing)
    resolved = resolve_gate_from_request(request)
    if not resolved:
        return not_found_response()

    ip = get_client_ip(request)
    if (payload.honeypot or "").strip():
        db.record_rate_limit_fail(f"login:{ip}", 1, LOCKOUT_MINUTES * 2)
        raise HTTPException(status_code=403, detail="Запрос отклонён системой защиты")

    rl_key = f"login:{ip}"
    is_locked, remain_sec = db.check_rate_limit(rl_key)
    if is_locked:
        mins = max(1, (remain_sec + 59) // 60)
        raise HTTPException(
            status_code=429,
            detail=f"Слишком много неверных попыток. Доступ временно заблокирован на {mins} мин.",
        )

    if not db.verify_admin_password(payload.password):
        fails, lock_sec = db.record_rate_limit_fail(rl_key, MAX_LOGIN_ATTEMPTS, LOCKOUT_MINUTES)
        db.add_audit_log(
            resolved[0],
            resolved[1],
            "AUTH_FAIL",
            f"Неудачная попытка входа ({fails}/{MAX_LOGIN_ATTEMPTS})",
            ip=ip,
        )
        if lock_sec > 0:
            raise HTTPException(
                status_code=429,
                detail=f"Превышен лимит попыток ({MAX_LOGIN_ATTEMPTS}). Вход заблокирован на {LOCKOUT_MINUTES} минут.",
            )
        left = MAX_LOGIN_ATTEMPTS - fails
        raise HTTPException(status_code=401, detail=f"Неверный пароль. Осталось попыток: {left}")

    db.clear_rate_limit(rl_key)
    role, label = resolved
    ua = request.headers.get("user-agent", "")
    session_token = db.create_admin_session(role, label, ip=ip, user_agent=ua, ttl_seconds=43200)
    db.add_audit_log(role, label, "AUTH_LOGIN", f"Успешный вход в студию ({label})", ip=ip)

    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=session_token,
        max_age=43200,
        httponly=True,
        samesite="strict",
        secure=IS_PROD,
        path="/",
    )
    return {
        "status": "ok",
        "operatorRole": role,
        "operatorName": label,
        "sessionToken": session_token,
    }


@app.get("/api/auth/verify")
async def auth_verify(request: Request):
    sess = require_session(request)
    return {
        "authenticated": True,
        "operatorRole": sess["operator_role"],
        "operatorName": sess["operator_name"],
        "expiresAt": sess["expires_at"],
    }


@app.post("/api/auth/logout")
async def auth_logout(request: Request, response: Response):
    raw_token = ""
    auth_hdr = (request.headers.get("authorization") or "").strip()
    if auth_hdr.lower().startswith("bearer "):
        raw_token = auth_hdr[7:].strip()
    if not raw_token:
        raw_token = (request.cookies.get(SESSION_COOKIE_NAME) or "").strip()

    sess = db.get_admin_session(raw_token)
    if sess:
        db.add_audit_log(
            sess["operator_role"],
            sess["operator_name"],
            "AUTH_LOGOUT",
            "Выход из студии администратора",
            ip=get_client_ip(request),
        )
    db.revoke_admin_session(raw_token)
    response.delete_cookie(SESSION_COOKIE_NAME, path="/")
    return {"status": "ok"}


@app.post("/api/auth/change-password")
async def auth_change_password(payload: ChangePasswordRequest, request: Request):
    sess = require_session(request)
    require_owner(sess)
    if not db.verify_admin_password(payload.currentPassword):
        raise HTTPException(status_code=400, detail="Текущий пароль указан неверно")
    db.update_admin_password(payload.newPassword)
    db.add_audit_log(
        sess["operator_role"],
        sess["operator_name"],
        "SECURITY",
        "Изменён мастер-пароль администратора",
        ip=get_client_ip(request),
    )
    return {"status": "ok"}


@app.get("/api/auth/tokens")
async def auth_get_tokens(request: Request):
    sess = require_session(request)
    require_owner(sess)
    tokens = db.get_gateway_tokens()
    base = str(request.base_url).rstrip("/")
    return {
        "adminPath": VP_ADMIN_PATH,
        "ownerToken": tokens["owner"],
        "assistantToken": tokens["assistant"],
        "ownerUrl": f"{base}{VP_ADMIN_PATH}?token={tokens['owner']}",
        "assistantUrl": f"{base}{VP_ADMIN_PATH}?token={tokens['assistant']}",
    }


@app.post("/api/auth/rotate-token")
async def auth_rotate_token(payload: RotateTokenRequest, request: Request):
    sess = require_session(request)
    require_owner(sess)
    new_tok = db.rotate_gateway_token(payload.role)
    role_title = "Владимира (Владельца)" if payload.role == "owner" else "Помощницы"
    db.add_audit_log(
        sess["operator_role"],
        sess["operator_name"],
        "SECURITY",
        f"Перевыпущен секретный токен доступа для: {role_title}",
        entity_type="token",
        entity_id=payload.role,
        ip=get_client_ip(request),
    )
    base = str(request.base_url).rstrip("/")
    return {
        "status": "ok",
        "role": payload.role,
        "token": new_tok,
        "url": f"{base}{VP_ADMIN_PATH}?token={new_tok}",
    }


@app.post("/api/auth/revoke-all-sessions")
async def auth_revoke_all(request: Request, response: Response):
    sess = require_session(request)
    require_owner(sess)
    db.revoke_all_sessions()
    db.add_audit_log(
        sess["operator_role"],
        sess["operator_name"],
        "SECURITY",
        "Принудительно завершены все активные админ-сессии",
        ip=get_client_ip(request),
    )
    response.delete_cookie(SESSION_COOKIE_NAME, path="/")
    return {"status": "ok"}


# ==============================================================================
# PUBLIC STOREFRONT READ-ONLY API
# ==============================================================================

@app.get("/api/health")
async def api_health():
    return {"status": "ok", "service": "volodium-parfum"}


@app.get("/api/bootstrap")
async def api_bootstrap():
    """Live storefront payload (no secrets exposed)."""
    return {
        "perfumes": db.get_all_perfumes(active_only=True),
        "aromaboxes": db.get_all_aromaboxes(active_only=True),
        "secretBoxes": db.get_all_secret_boxes(active_only=True),
        "siteContent": db.get_site_content(),
        "updatedAt": int(time.time()),
    }


# ==============================================================================
# ADMIN CATALOG, PRICING & CONTENT APIs
# ==============================================================================

@app.get("/api/admin/overview")
async def admin_overview(request: Request):
    sess = require_session(request)
    perfumes = db.get_all_perfumes()
    boxes = db.get_all_aromaboxes()
    secrets_list = db.get_all_secret_boxes()
    site_content = db.get_site_content()
    snapshots = db.get_price_snapshots(limit=10)
    audits = db.get_audit_logs(limit=60)
    return {
        "operatorRole": sess["operator_role"],
        "operatorName": sess["operator_name"],
        "perfumes": perfumes,
        "aromaboxes": boxes,
        "secretBoxes": secrets_list,
        "siteContent": site_content,
        "priceSnapshots": snapshots,
        "auditLogs": audits,
    }


class PerfumePayload(BaseModel):
    id: Optional[str] = None
    uid: Optional[Any] = None
    brand: str = ""
    name: str = Field(..., min_length=1)
    fullTitle: Optional[str] = ""
    gender: str = "unisex"
    category: str = "perfume"
    notesFamily: Optional[str] = ""
    image: Optional[str] = ""
    objectPosition: Optional[str] = "center center"
    badge: Optional[str] = ""
    subtitle: Optional[str] = ""
    bottleSize: Optional[str] = ""
    description: Optional[str] = ""
    season: Optional[str] = "Круглый год"
    seasonIcon: Optional[str] = ""
    timeOfDay: Optional[str] = ""
    timeIcon: Optional[str] = ""
    mood: Optional[str] = ""
    longevity: Optional[str] = ""
    sillage: Optional[str] = ""
    prices: Dict[str, Any] = Field(default_factory=dict)
    pyramid: Optional[Dict[str, Any]] = None
    metrics: Optional[Dict[str, Any]] = None
    url: Optional[str] = ""
    sortOrder: Optional[int] = None
    isActive: bool = True


@app.post("/api/admin/perfumes")
async def admin_upsert_perfume(payload: PerfumePayload, request: Request):
    sess = require_session(request)
    data = payload.model_dump(exclude_none=True)
    is_new = not data.get("id") or db.get_perfume(data["id"]) is None
    saved = db.upsert_perfume(data)
    db.add_audit_log(
        sess["operator_role"],
        sess["operator_name"],
        "ADD" if is_new else "UPDATE",
        f"{'Добавлен' if is_new else 'Обновлён'} аромат: {saved.get('brand', '')} — {saved.get('name', '')}".strip(),
        entity_type="perfume",
        entity_id=saved["id"],
        details={"season": saved.get("season"), "prices": saved.get("prices")},
        ip=get_client_ip(request),
    )
    return {"status": "ok", "item": saved}


@app.delete("/api/admin/perfumes/{perfume_id}")
async def admin_delete_perfume(perfume_id: str, request: Request):
    sess = require_session(request)
    existing = db.get_perfume(perfume_id)
    if not existing or not db.delete_perfume(perfume_id):
        raise HTTPException(status_code=404, detail="Аромат не найден")
    db.add_audit_log(
        sess["operator_role"],
        sess["operator_name"],
        "DELETE",
        f"Удалён аромат: {existing.get('brand', '')} — {existing.get('name', '')}",
        entity_type="perfume",
        entity_id=perfume_id,
        ip=get_client_ip(request),
    )
    return {"status": "ok"}


class AromaBoxPayload(BaseModel):
    id: Optional[str] = None
    uid: Optional[Any] = None
    name: str = Field(..., min_length=1)
    gender: str = "unisex"
    genderLabel: Optional[str] = ""
    badge: Optional[str] = ""
    image: Optional[str] = ""
    cdnImage: Optional[str] = ""
    objectPosition: Optional[str] = "center center"
    prices: Dict[str, Any] = Field(default_factory=dict)
    oldPrices: Optional[Dict[str, Any]] = Field(default_factory=dict)
    shortSubtitle: Optional[str] = ""
    perfumes: List[str] = Field(default_factory=list)
    fullDescription: Optional[str] = ""
    sortOrder: Optional[int] = None
    isActive: bool = True


@app.post("/api/admin/aromaboxes")
async def admin_upsert_aromabox(payload: AromaBoxPayload, request: Request):
    sess = require_session(request)
    data = payload.model_dump(exclude_none=True)
    is_new = not data.get("id") or db.get_aromabox(data["id"]) is None
    saved = db.upsert_aromabox(data)
    db.add_audit_log(
        sess["operator_role"],
        sess["operator_name"],
        "ADD" if is_new else "UPDATE",
        f"{'Добавлен' if is_new else 'Обновлён'} аромабокс: {saved.get('name', '')}",
        entity_type="aromabox",
        entity_id=saved["id"],
        ip=get_client_ip(request),
    )
    return {"status": "ok", "item": saved}


@app.delete("/api/admin/aromaboxes/{box_id}")
async def admin_delete_aromabox(box_id: str, request: Request):
    sess = require_session(request)
    existing = db.get_aromabox(box_id)
    if not existing or not db.delete_aromabox(box_id):
        raise HTTPException(status_code=404, detail="Аромабокс не найден")
    db.add_audit_log(
        sess["operator_role"],
        sess["operator_name"],
        "DELETE",
        f"Удалён аромабокс: {existing.get('name', '')}",
        entity_type="aromabox",
        entity_id=box_id,
        ip=get_client_ip(request),
    )
    return {"status": "ok"}


class SecretBoxPayload(BaseModel):
    id: str = Field(..., min_length=1)
    level: str = Field(..., min_length=1)
    name: str = Field(..., min_length=1)
    title: Optional[str] = ""
    subtitle: Optional[str] = ""
    price: int = Field(..., ge=100)
    oldPrice: Optional[int] = 0
    image: Optional[str] = ""
    cdnImage: Optional[str] = ""
    objectPosition: Optional[str] = "center center"
    description: Optional[str] = ""
    badge: Optional[str] = ""
    features: List[str] = Field(default_factory=list)
    isHit: bool = False
    isActive: bool = True


@app.post("/api/admin/secret-boxes")
async def admin_upsert_secret_box(payload: SecretBoxPayload, request: Request):
    sess = require_session(request)
    saved = db.upsert_secret_box(payload.model_dump())
    db.add_audit_log(
        sess["operator_role"],
        sess["operator_name"],
        "UPDATE",
        f"Обновлён Secret Box «{saved.get('level', saved['name'])}» ({saved.get('price')} ₽)",
        entity_type="secret_box",
        entity_id=saved["id"],
        ip=get_client_ip(request),
    )
    return {"status": "ok", "item": saved}


class BulkPriceRequest(BaseModel):
    scope: str = Field("all", pattern="^(all|perfumes|aromaboxes|secret_boxes)$")
    percent: float = Field(..., ge=-90.0, le=500.0)
    roundStep: int = Field(10, ge=1, le=500)
    genderFilter: str = "all"
    seasonFilter: str = "all"
    brandFilter: str = ""
    applyToOldPrices: bool = False
    dryRun: bool = True


@app.post("/api/admin/bulk-price")
async def admin_bulk_price(payload: BulkPriceRequest, request: Request):
    sess = require_session(request)
    try:
        res = db.bulk_adjust_prices(
            scope=payload.scope,
            percent=payload.percent,
            round_step=payload.roundStep,
            gender_filter=payload.genderFilter,
            season_filter=payload.seasonFilter,
            brand_filter=payload.brandFilter,
            apply_to_old_prices=payload.applyToOldPrices,
            dry_run=payload.dryRun,
            operator_role=sess["operator_role"],
            operator_name=sess["operator_name"],
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    if not payload.dryRun and res["totalAffected"] > 0:
        sign = f"+{payload.percent}%" if payload.percent > 0 else f"{payload.percent}%"
        db.add_audit_log(
            sess["operator_role"],
            sess["operator_name"],
            "BULK_PRICE",
            f"Массовое изменение цен {sign} (позиций: {res['totalAffected']}, округление до {payload.roundStep} ₽)",
            entity_type="pricing",
            entity_id=str(res["snapshotId"] or ""),
            details={"scope": payload.scope, "percent": payload.percent, "gender": payload.genderFilter, "season": payload.seasonFilter},
            ip=get_client_ip(request),
        )
    return {"status": "ok", "result": res, "snapshots": db.get_price_snapshots(limit=10)}


@app.post("/api/admin/price-snapshots/{snapshot_id}/rollback")
async def admin_rollback_price(snapshot_id: int, request: Request):
    sess = require_session(request)
    try:
        res = db.rollback_price_snapshot(snapshot_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    db.add_audit_log(
        sess["operator_role"],
        sess["operator_name"],
        "PRICE_ROLLBACK",
        f"Откат цен по снимку #{snapshot_id}: {res['summary']} (восстановлено позиций: {res['restoredCount']})",
        entity_type="pricing",
        entity_id=str(snapshot_id),
        ip=get_client_ip(request),
    )
    return {"status": "ok", "result": res, "snapshots": db.get_price_snapshots(limit=10)}


@app.post("/api/admin/site-content")
async def admin_save_site_content(payload: Dict[str, Any], request: Request):
    sess = require_session(request)
    saved = db.save_site_content(payload)
    db.add_audit_log(
        sess["operator_role"],
        sess["operator_name"],
        "CONTENT",
        "Обновлён контент витрины, заглавного экрана, промокодов или контактов",
        entity_type="site_content",
        ip=get_client_ip(request),
    )
    return {"status": "ok", "siteContent": saved}


# ==============================================================================
# SECURE IMAGE UPLOAD (MAGIC BYTES CHECK, NO SVG XSS)
# ==============================================================================

def _detect_image_ext(data: bytes) -> Optional[str]:
    if data.startswith(b"\xff\xd8\xff"):
        return ".jpg"
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return ".png"
    if len(data) >= 12 and data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return ".webp"
    if data.startswith((b"GIF87a", b"GIF89a")):
        return ".gif"
    return None


@app.post("/api/admin/upload")
async def admin_upload_image(
    request: Request,
    file: UploadFile = File(...),
    folder: str = Form("general"),
):
    sess = require_session(request)
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Пустой файл")
    if len(content) > 8 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Файл слишком большой (максимум 8 МБ)")

    ext = _detect_image_ext(content)
    if not ext:
        raise HTTPException(
            status_code=400,
            detail="Неподдерживаемый или небезопасный формат. Разрешены только JPG, PNG, WebP, GIF (без SVG).",
        )

    safe_folder = re.sub(r"[^a-zA-Z0-9_-]", "", folder or "general")[:24] or "general"
    target_dir = UPLOADS_DIR / safe_folder
    target_dir.mkdir(parents=True, exist_ok=True)

    fname = f"vp_{int(time.time())}_{secrets.token_hex(6)}{ext}"
    out_path = target_dir / fname
    out_path.write_bytes(content)

    rel_url = f"assets/uploads/{safe_folder}/{fname}"
    db.add_audit_log(
        sess["operator_role"],
        sess["operator_name"],
        "MEDIA_UPLOAD",
        f"Загружено изображение: {rel_url}",
        entity_type="media",
        entity_id=rel_url,
        ip=get_client_ip(request),
    )
    return {"status": "ok", "url": rel_url, "size": len(content)}


# ==============================================================================
# BACKUP / EXPORT / AUDIT
# ==============================================================================

@app.get("/api/admin/audit")
async def admin_get_audit(request: Request, action: str = "all", operator: str = "all"):
    require_session(request)
    return {"logs": db.get_audit_logs(limit=120, action_filter=action, operator_filter=operator)}


@app.get("/api/admin/backup/export")
async def admin_export_json(request: Request):
    sess = require_session(request)
    bundle = db.export_full_backup()
    db.add_audit_log(sess["operator_role"], sess["operator_name"], "BACKUP", "Выгружен JSON-бэкап базы данных", ip=get_client_ip(request))
    return JSONResponse(
        content=bundle,
        headers={"Content-Disposition": 'attachment; filename="volodium_backup.json"'},
    )


@app.get("/api/admin/backup/export-js")
async def admin_export_js(request: Request):
    sess = require_session(request)
    js_src = db.generate_perfumes_js_bundle()
    db.add_audit_log(sess["operator_role"], sess["operator_name"], "BACKUP", "Экспортирован статический файл perfumes.js", ip=get_client_ip(request))
    return PlainTextResponse(
        content=js_src,
        media_type="application/javascript; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="perfumes.js"'},
    )


@app.post("/api/admin/backup/restore")
async def admin_restore_backup(payload: Dict[str, Any], request: Request):
    sess = require_session(request)
    require_owner(sess)
    perfumes = payload.get("perfumes")
    boxes = payload.get("aromaboxes")
    secrets_list = payload.get("secretBoxes")
    site_content = payload.get("siteContent")
    if not isinstance(perfumes, list) or not isinstance(boxes, list):
        raise HTTPException(status_code=400, detail="Некорректный формат JSON-бэкапа")

    # Pre-save bulk safety snapshot before overwrite
    db.bulk_adjust_prices(
        scope="all",
        percent=0.0,
        dry_run=False,
        operator_role=sess["operator_role"],
        operator_name=sess["operator_name"],
    )

    restored_p = 0
    for p in perfumes:
        if isinstance(p, dict) and p.get("name"):
            db.upsert_perfume(p)
            restored_p += 1
    restored_b = 0
    for b in boxes:
        if isinstance(b, dict) and b.get("name"):
            db.upsert_aromabox(b)
            restored_b += 1
    restored_s = 0
    if isinstance(secrets_list, list):
        for s in secrets_list:
            if isinstance(s, dict) and s.get("id"):
                db.upsert_secret_box(s)
                restored_s += 1
    if isinstance(site_content, dict):
        db.save_site_content(site_content)

    db.add_audit_log(
        sess["operator_role"],
        sess["operator_name"],
        "BACKUP",
        f"Восстановлен бэкап: духов={restored_p}, аромабоксов={restored_b}, secret={restored_s}",
        ip=get_client_ip(request),
    )
    return {"status": "ok", "perfumes": restored_p, "aromaboxes": restored_b, "secretBoxes": restored_s}


# ==============================================================================
# SAFE PUBLIC STATIC FILE SERVING
# ==============================================================================

@app.get("/")
async def serve_storefront_index():
    return FileResponse(
        BASE_DIR / "index.html",
        media_type="text/html; charset=utf-8",
        headers={"Cache-Control": "no-cache"},
    )


@app.get("/index.html")
async def serve_storefront_index_alias():
    return await serve_storefront_index()


@app.get("/favicon.ico")
async def serve_favicon():
    fav = BASE_DIR / "assets" / "images" / "E610BB2F-DBAE-4672-9.PNG"
    if fav.is_file():
        return FileResponse(fav, media_type="image/png")
    return not_found_response()


@app.get("/assets/{asset_path:path}")
async def serve_public_assets(asset_path: str):
    if ".." in asset_path or asset_path.startswith("."):
        return not_found_response()
    target = (BASE_DIR / "assets" / asset_path).resolve()
    assets_root = (BASE_DIR / "assets").resolve()
    if not str(target).startswith(str(assets_root)) or not target.is_file():
        return not_found_response()
    return FileResponse(target)


@app.api_route("/{other_path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"])
async def catch_all_404(other_path: str):
    return not_found_response()


if __name__ == "__main__":
    import uvicorn

    print("=" * 72)
    print("  VOLODIUM PARFUM — STEALTH ATELIER HUB STARTED")
    print("=" * 72)
    print(f"  Storefront : http://{VP_HOST}:{VP_PORT}/")
    tokens = db.get_gateway_tokens()
    print(f"  Vova URL   : http://{VP_HOST}:{VP_PORT}{VP_ADMIN_PATH}?token={tokens['owner']}")
    print(f"  Assist URL : http://{VP_HOST}:{VP_PORT}{VP_ADMIN_PATH}?token={tokens['assistant']}")
    print("=" * 72)

    uvicorn.run(
        "server:app",
        host=VP_HOST,
        port=VP_PORT,
        reload=(VP_ENV == "development"),
        reload_excludes=["assets/*", "*.db*", "*.sqlite*", ".env", "venv/*"],
        proxy_headers=VP_BEHIND_PROXY,
        forwarded_allow_ips=",".join(VP_TRUSTED_PROXIES) if VP_BEHIND_PROXY else "127.0.0.1",
    )
