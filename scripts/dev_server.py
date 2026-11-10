#!/usr/bin/env python3
"""
VOLODIUM PARFUM — Local LAN & Desktop Dev Server
Runs the full FastAPI + SQLite backend with 404 cloaking (replaces raw static SimpleHTTPServer
so .env, database files, and private_admin stay strictly protected during local/Wi-Fi testing).
"""

import os
import sys
import socket
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
VENV_PYTHON = BASE_DIR / "venv" / "bin" / "python3"


def _ensure_venv():
    try:
        import fastapi  # noqa: F401
        import uvicorn  # noqa: F401
        return
    except ImportError:
        if VENV_PYTHON.is_file() and Path(sys.executable).resolve() != VENV_PYTHON.resolve():
            os.execv(str(VENV_PYTHON), [str(VENV_PYTHON), str(Path(__file__).resolve()), *sys.argv[1:]])
        raise SystemExit(
            "FastAPI/Uvicorn не установлены. Запустите через ./start_server.sh или активируйте venv."
        )


def get_wifi_ip() -> str:
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"


def run():
    _ensure_venv()
    sys.path.insert(0, str(BASE_DIR))
    os.chdir(str(BASE_DIR))

    from dotenv import load_dotenv
    load_dotenv(BASE_DIR / ".env")

    import uvicorn
    import database as db

    db.init_db()
    port = int(os.environ.get("DEV_PORT", os.environ.get("VP_PORT", "8000")))
    wifi_ip = get_wifi_ip()

    print("\n" + "═" * 64)
    print("  VOLODIUM PARFUM — ATELIER DEV SERVER (FastAPI + 404 Cloaking)")
    print("═" * 64)
    print(f"  Storefront (Mac)   : http://127.0.0.1:{port}/")
    print(f"  Storefront (Local) : http://localhost:{port}/")
    print(f"  Mobile (Wi-Fi LAN) : http://{wifi_ip}:{port}/")
    print("═" * 64)
    print("  404 Cloaking & Live /api/bootstrap ACTIVE.")
    print("  Скрытые токены входа смотрите в .env или через ./start_server.sh")
    print("═" * 64 + "\n")

    uvicorn.run(
        "server:app",
        host="0.0.0.0",
        port=port,
        reload=True,
        reload_excludes=["assets/*", "*.db*", "*.sqlite*", ".env", "venv/*"],
    )


if __name__ == "__main__":
    run()

