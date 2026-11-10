#!/usr/bin/env bash
# ==============================================================================
# VOLODIUM ATELIER — Persistent Public Tunnel Supervisor
# Auto-reconnects to localhost.run, monitors URLs, and keeps link updated.
# ==============================================================================

PORT="${1:-8010}"
BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
URL_FILE="${BASE_DIR}/tunnel_url.txt"
LOG_FILE="/tmp/volodium_tunnel.log"

echo "[Tunnel] Starting auto-reconnect tunnel on port ${PORT}..."
echo "[Tunnel] Live URL will be saved to ${URL_FILE}"

while true; do
  ssh \
    -o StrictHostKeyChecking=no \
    -o UserKnownHostsFile=/dev/null \
    -o ServerAliveInterval=10 \
    -o ServerAliveCountMax=3 \
    -o ExitOnForwardFailure=yes \
    -R 80:127.0.0.1:${PORT} \
    nokey@localhost.run 2>&1 | while IFS= read -r line; do
      echo "${line}" >> "${LOG_FILE}"
      if [[ "${line}" =~ (https://[a-zA-Z0-9.-]+\.lhr\.life) ]]; then
        ACTIVE_URL="${BASH_REMATCH[1]}"
        echo "${ACTIVE_URL}" > "${URL_FILE}"
        echo "[Tunnel] Active public URL: ${ACTIVE_URL}"
      fi
    done
  
  echo "[Tunnel] Tunnel disconnected. Reconnecting in 3 seconds..."
  sleep 3
done
