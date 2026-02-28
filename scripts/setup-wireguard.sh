#!/usr/bin/env bash
# =============================================================================
# PiVault — WireGuard Container Helper
# =============================================================================
# Run from ~/PIHUB on the Pi (where docker-compose.yml lives).
#
# Usage:
#   bash scripts/setup-wireguard.sh start          Start WireGuard
#   bash scripts/setup-wireguard.sh stop           Stop WireGuard
#   bash scripts/setup-wireguard.sh status         Show wg0 interface + peers
#   bash scripts/setup-wireguard.sh logs           Tail container logs
#   bash scripts/setup-wireguard.sh peers          List configured peer names
#   bash scripts/setup-wireguard.sh qr <peer>      Show QR code (scan with phone)
#   bash scripts/setup-wireguard.sh conf <peer>    Print .conf file (copy to laptop)
# =============================================================================

set -euo pipefail

CONTAINER="pivault-wireguard"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="${SCRIPT_DIR}/../docker-compose.yml"

RED='\033[0;31m'; YELLOW='\033[1;33m'; GREEN='\033[0;32m'
CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

info()  { echo -e "${CYAN}[INFO]${NC}  $*"; }
ok()    { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
fatal() { echo -e "${RED}[FATAL]${NC} $*" >&2; exit 1; }

usage() {
    echo -e "${BOLD}Usage:${NC} bash $0 <command> [peer]"
    echo ""
    echo "Commands:"
    echo "  start          Start WireGuard via docker compose"
    echo "  stop           Stop WireGuard container"
    echo "  status         Show wg0 interface status and connected peers"
    echo "  logs           Tail live container logs (Ctrl+C to exit)"
    echo "  peers          List all configured peer names"
    echo "  qr <peer>      Show QR code for a peer (scan with WireGuard app)"
    echo "  conf <peer>    Print .conf file for a peer (import on laptop)"
    echo ""
    echo "Examples:"
    echo "  bash $0 start"
    echo "  bash $0 qr phone"
    echo "  bash $0 conf laptop"
    exit 1
}

require_running() {
    docker inspect -f '{{.State.Running}}' "$CONTAINER" 2>/dev/null | grep -q true \
        || fatal "Container '$CONTAINER' is not running. Start it with: bash $0 start"
}

[[ $# -ge 1 ]] || usage
CMD="$1"

case "$CMD" in

  start)
    info "Starting WireGuard container ..."
    docker compose -f "$COMPOSE_FILE" up -d wireguard
    ok "WireGuard started."
    echo ""
    info "On first run, peer configs are generated in the wg-config Docker volume."
    info "View QR codes with:  bash $0 qr <peer-name>"
    info "View .conf files with: bash $0 conf <peer-name>"
    info "Check logs with:     bash $0 logs"
    ;;

  stop)
    info "Stopping WireGuard container ..."
    docker compose -f "$COMPOSE_FILE" stop wireguard
    ok "Stopped."
    ;;

  status)
    require_running
    info "WireGuard interface status:"
    echo ""
    docker exec "$CONTAINER" wg show
    ;;

  logs)
    info "Tailing logs for '$CONTAINER' (Ctrl+C to exit) ..."
    docker logs -f --tail 50 "$CONTAINER"
    ;;

  peers)
    require_running
    info "Configured peers:"
    docker exec "$CONTAINER" ls /config \
        | grep '^peer_' \
        | sed 's/^peer_/  /'
    ;;

  qr)
    [[ $# -ge 2 ]] || fatal "Specify a peer name. Example: bash $0 qr phone"
    PEER="$2"
    require_running
    info "QR code for peer '${PEER}' (scan with the WireGuard mobile app):"
    echo ""
    docker exec "$CONTAINER" /app/show-peer "$PEER" \
        || fatal "Peer '$PEER' not found. Check names with: bash $0 peers"
    ;;

  conf)
    [[ $# -ge 2 ]] || fatal "Specify a peer name. Example: bash $0 conf laptop"
    PEER="$2"
    require_running
    CONF="/config/peer_${PEER}/peer_${PEER}.conf"
    info "WireGuard .conf for peer '${PEER}':"
    echo ""
    docker exec "$CONTAINER" cat "$CONF" \
        || fatal "Peer '$PEER' config not found. Check names with: bash $0 peers"
    echo ""
    info "Copy the above into a file and import into the WireGuard app on your laptop."
    info "On macOS/Windows: File → Import Tunnel → paste above content."
    ;;

  *)
    warn "Unknown command: $CMD"
    echo ""
    usage
    ;;

esac
