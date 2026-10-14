#!/usr/bin/env bash
set -e

PORT="${PORT:-8000}"
PYTHON="python3"

echo "Starting RDKit Lab on port ${PORT}..."
cd "$(dirname "$0")"
php -S 0.0.0.0:"${PORT}" -t public/
