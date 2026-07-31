#!/usr/bin/env bash
# =============================================================================
# PiVault — Deploy Script
# =============================================================================
# Run ON THE PI:  bash scripts/deploy.sh
#
# What this script does:
#   1.  Pulls the latest code from git
#   2.  Rebuilds the server Docker image (picks up new/changed dependencies)
#   3.  Rebuilds the client's production bundle (client/dist) — this is the
#       piece nginx actually serves; nothing else regenerates it
#   4.  Recreates containers with the new images/config
#
# Why this exists: nginx serves a pre-built client/dist, not the live Vite
# dev server. A plain `git pull` + `docker compose up` looks like it deployed
# but silently leaves the browser on the old frontend bundle.
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
info()    { echo -e "${GREEN}[✓]${NC} $*"; }
warn()    { echo -e "${YELLOW}[!]${NC} $*"; }
die()     { echo -e "${RED}[✗]${NC} $*" >&2; exit 1; }

echo ""
echo "════════════════════════════════════════════════════════"
echo "  PiVault — Deploy"
echo "════════════════════════════════════════════════════════"
echo ""

# ── Pull latest code ─────────────────────────────────────────────────────────
if [[ -n "$(git status --porcelain)" ]]; then
  die "Working tree has uncommitted changes — commit, stash, or discard them before deploying."
fi
git pull origin main
info "Code updated"

# ── Rebuild server image ─────────────────────────────────────────────────────
docker compose build server
info "Server image rebuilt"

# ── Rebuild client production bundle ─────────────────────────────────────────
docker compose run --rm client npm run build
info "Client bundle rebuilt (client/dist)"

# ── Recreate containers ──────────────────────────────────────────────────────
docker compose up -d
info "Containers recreated"

echo ""
info "Deploy complete. Hard-refresh the browser (Ctrl+Shift+R) to bypass any cached assets."
echo ""
echo "Troubleshooting:"
echo "  docker compose ps                ← confirm containers are up"
echo "  docker compose logs server -f    ← tail server logs"
echo ""
