#!/usr/bin/env bash
# Orchestrate backend and frontend dev servers
# macOS/zsh friendly; works with bash as well
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend"
BANK=""
BACKEND_PORT="${PORT:-3001}"
FRONTEND_URL_DEFAULT="http://localhost:3000" # Next.js default; Vite often 5173
BACKEND_HEALTH_URL="http://localhost:${BACKEND_PORT}/api/health"

BE_PID="" 
FE_PID="" 

log() { echo -e "\033[1;34m[orchestrator]\033[0m $*"; }
warn() { echo -e "\033[1;33m[warn]\033[0m $*"; }
err() { echo -e "\033[1;31m[error]\033[0m $*"; }

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    err "Missing required command: $1"
    exit 1
  fi
}

healthcheck_backend() {
  local retries=30
  local sleep_sec=1
  for ((i=1; i<=retries; i++)); do
    if curl -fsS "$BACKEND_HEALTH_URL" >/dev/null 2>&1; then
      log "Backend healthy at $BACKEND_HEALTH_URL"
      return 0
    fi
    sleep "$sleep_sec"
  done
  warn "Backend health not confirmed after $((retries*sleep_sec))s; continuing anyway"
}

start_backend() {
  if [[ ! -d "$BACKEND_DIR" ]]; then
    err "Backend directory not found: $BACKEND_DIR"; exit 1
  fi
  pushd "$BACKEND_DIR" >/dev/null
  if [[ ! -d node_modules ]]; then
    log "Installing backend dependencies..."
    npm install
  fi
  log "Starting backend (npm run dev) on port ${BACKEND_PORT}..."
  # Stream logs with prefix for readability
  npm run dev 2>&1 | sed -e 's/^/[backend] /' &
  BE_PID=$!
  popd >/dev/null
  healthcheck_backend || true
}

detect_frontend_url() {
  local pkg="$FRONTEND_DIR/package.json"
  local default="$FRONTEND_URL_DEFAULT"
  local from_env="${FRONTEND_URL:-}"
  if [[ -n "$from_env" ]]; then echo "$from_env"; return; fi
  if [[ -f "$pkg" ]]; then
    if grep -q '"next"' "$pkg" >/dev/null 2>&1; then
      echo "http://localhost:3000"; return
    fi
    if grep -q '"vite"' "$pkg" >/dev/null 2>&1; then
      echo "http://localhost:5173"; return
    fi
  fi
  echo "$default"
}

start_frontend() {
  if [[ ! -d "$FRONTEND_DIR" ]]; then
    warn "Frontend directory not found: $FRONTEND_DIR — skipping frontend startup"
    return 0
  fi
  if [[ ! -f "$FRONTEND_DIR/package.json" ]]; then
    warn "No frontend package.json found. Initialize your framework in $FRONTEND_DIR first. Skipping frontend startup."
    return 0
  fi
  pushd "$FRONTEND_DIR" >/dev/null
  if [[ ! -d node_modules ]]; then
    log "Installing frontend dependencies..."
    npm install
  fi
  local FE_URL
  FE_URL=$(detect_frontend_url)
  log "Starting frontend (npm run dev)... (expected URL: $FE_URL)"
  # Stream logs with prefix for readability
  npm run dev 2>&1 | sed -e 's/^/[frontend] /' &
  FE_PID=$!
  # Attempt to open the browser (macOS) if 'open' exists and not disabled
  if command -v open >/dev/null 2>&1; then
    if [[ "${OPEN_BROWSER:-1}" != "0" ]]; then
      ( sleep 2; open "$FE_URL" ) &
    fi
  fi
  popd >/dev/null
}

cleanup() {
  log "Shutting down services..."
  set +e
  if [[ -n "$FE_PID" ]] && ps -p "$FE_PID" >/dev/null 2>&1; then
    kill "$FE_PID" 2>/dev/null || true
    wait "$FE_PID" 2>/dev/null || true
  fi
  if [[ -n "$BE_PID" ]] && ps -p "$BE_PID" >/dev/null 2>&1; then
    kill "$BE_PID" 2>/dev/null || true
    wait "$BE_PID" 2>/dev/null || true
  fi
}

main() {
  require_cmd node
  require_cmd npm
  require_cmd curl

  log "Project root: $PROJECT_ROOT"
  log "Backend health: $BACKEND_HEALTH_URL"

  # Friendly env hints
  if [[ ! -f "$PROJECT_ROOT/.env" ]]; then
    warn "No .env found at project root. Backend may still start, but some endpoints will return config errors."
  fi

  trap cleanup EXIT INT TERM

  start_backend
  start_frontend

  log "Services started. Press Ctrl+C to stop."
  # Keep script attached to child processes
  wait
}

main "$@"
