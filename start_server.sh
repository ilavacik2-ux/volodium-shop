#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

if [[ ! -x "$PROJECT_DIR/venv/bin/python3" ]]; then
  echo "Ошибка: виртуальное окружение venv не найдено в $PROJECT_DIR/venv"
  echo "Создайте его командой: python3 -m venv venv && venv/bin/pip install -r requirements.txt"
  exit 1
fi

if [[ ! -f "$PROJECT_DIR/.env" ]]; then
  echo "Внимание: .env не найден. Создайте .env на основе .env.example."
  exit 1
fi

chmod 600 "$PROJECT_DIR/.env" 2>/dev/null || true

exec "$PROJECT_DIR/venv/bin/python3" "$PROJECT_DIR/server.py"
