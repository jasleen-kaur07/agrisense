#!/usr/bin/env sh
# Starts AgriSense with one command: ./start.sh
# Requires only Docker (Docker Desktop on macOS/Windows, Docker Engine + Compose v2 on Linux).
set -eu
cd "$(dirname "$0")"

command -v docker >/dev/null 2>&1 || { echo "Docker is not installed. Get it from https://docs.docker.com/get-docker/"; exit 1; }
docker info >/dev/null 2>&1 || { echo "Docker is installed but not running. Start Docker Desktop and retry."; exit 1; }

rand() { LC_ALL=C tr -dc 'A-Za-z0-9' </dev/urandom | head -c "${1:-32}"; }

if [ ! -f .env ]; then
  echo "Creating .env with freshly generated secrets..."
  sed \
    -e "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=$(rand)|" \
    -e "s|^IDENTITY_DB_PASSWORD=.*|IDENTITY_DB_PASSWORD=$(rand)|" \
    -e "s|^ADVISORY_DB_PASSWORD=.*|ADVISORY_DB_PASSWORD=$(rand)|" \
    -e "s|^DATA_DB_PASSWORD=.*|DATA_DB_PASSWORD=$(rand)|" \
    -e "s|^ML_DB_PASSWORD=.*|ML_DB_PASSWORD=$(rand)|" \
    -e "s|^INTERNAL_API_TOKEN=.*|INTERNAL_API_TOKEN=$(rand 48)|" \
    -e "s|^ADMIN_BOOTSTRAP_PASSWORD=.*|ADMIN_BOOTSTRAP_PASSWORD=$(rand 20)|" \
    .env.example > .env
  echo "Admin login: $(grep '^ADMIN_BOOTSTRAP_EMAIL=' .env | cut -d= -f2-) / $(grep '^ADMIN_BOOTSTRAP_PASSWORD=' .env | cut -d= -f2-)"
fi

docker compose up --build -d --wait
echo "AgriSense is running at http://localhost:3000"
