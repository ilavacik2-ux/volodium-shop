#!/usr/bin/env bash
# ==============================================================================
# VOLODIUM ATELIER — Persistent Public Tunnel Supervisor
# Auto-reconnects to localhost.run with keepalive ping every 10 seconds.
# ==============================================================================

PORT="${1:-8010}"
LOG_FILE="/tmp/volodium_tunnel.log"

echo "[Tunnel] Starting auto-reconnect tunnel on port ${PORT}..."

while true; do
  ssh \
    -o StrictHostKeyChecking=no \
    -o UserKnownHostsFile=/dev/null \
    -o ServerAliveInterval=10 \
    -o ServerAliveCountMax=3 \
    -o ExitOnForwardFailure=yes \
    -R 80:127.0.0.1:${PORT} \
    nokey@localhost.run 2>&1 | tee -a "${LOG_FILE}"
  
  echo "[Tunnel] Disconnected. Reconnecting in 3 seconds..."
  sleep 3
done
