#!/usr/bin/env bash
# =============================================================================
# PiVault — ufw Firewall Setup Script
# =============================================================================
# Run ON THE PI as root:  sudo bash scripts/setup-ufw.sh
# Safe to re-run (resets rules to a known state each time).
#
# Ports opened:
#   22/tcp    — SSH
#   80/tcp    — HTTP (Nginx)
#   443/tcp   — HTTPS (Nginx TLS, future)
#   3001/tcp  — Express API direct (PM2 mode — remove once behind Nginx)
#   51820/udp — WireGuard VPN
#   445/tcp   — Samba SMB (LAN only: 192.168.0.0/24)
#   139/tcp   — Samba NetBIOS (LAN only: 192.168.0.0/24)
# =============================================================================

set -euo pipefail

RED='\033[0;31m'; YELLOW='\033[1;33m'; GREEN='\033[0;32m'
CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

info()    { echo -e "${CYAN}[INFO]${NC}  $*"; }
success() { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
fatal()   { echo -e "${RED}[FATAL]${NC} $*" >&2; exit 1; }

[[ "$EUID" -eq 0 ]] || fatal "Must run as root: sudo bash $0"
command -v ufw &>/dev/null || fatal "ufw not found: sudo apt install ufw"

# Adjust if your LAN uses a different subnet
LAN_SUBNET="192.168.0.0/24"

echo ""
echo -e "${BOLD}════════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}  PiVault — ufw Firewall Configuration${NC}"
echo -e "${BOLD}════════════════════════════════════════════════════════${NC}"
echo ""

# ── Reset to clean state ──────────────────────────────────────────────────────
info "Disabling and resetting ufw to a clean slate ..."
ufw --force disable
ufw --force reset

# ── Default policies ──────────────────────────────────────────────────────────
info "Setting default policies: deny incoming, allow outgoing ..."
ufw default deny incoming
ufw default allow outgoing

# ── SSH — do this first to avoid locking yourself out ────────────────────────
info "Allowing SSH (22/tcp) ..."
ufw allow 22/tcp comment 'SSH'

# ── Web traffic ───────────────────────────────────────────────────────────────
info "Allowing HTTP (80/tcp) and HTTPS (443/tcp) ..."
ufw allow 80/tcp  comment 'HTTP (Nginx)'
ufw allow 443/tcp comment 'HTTPS (Nginx TLS)'

# ── Express API ───────────────────────────────────────────────────────────────
# NOTE: Remove this rule once Nginx is proxying all API traffic.
# In full Docker deployment the API will not be directly exposed.
info "Allowing Express API (3001/tcp) — PM2 mode only ..."
ufw allow 3001/tcp comment 'PiVault API — PM2 (remove when behind Nginx)'

# ── WireGuard VPN ─────────────────────────────────────────────────────────────
info "Allowing WireGuard VPN (51820/udp) ..."
ufw allow 51820/udp comment 'WireGuard VPN'

# ── Samba — LAN only ──────────────────────────────────────────────────────────
# Samba should never be internet-facing. Restrict to LAN subnet.
# WireGuard clients (10.13.13.x) can also reach Samba via the VPN tunnel.
info "Allowing Samba (445/tcp + 139/tcp) from LAN only (${LAN_SUBNET}) ..."
ufw allow from "$LAN_SUBNET" to any port 445 proto tcp comment 'SMB (Samba LAN)'
ufw allow from "$LAN_SUBNET" to any port 139 proto tcp comment 'NetBIOS (Samba LAN)'

# ── Enable ────────────────────────────────────────────────────────────────────
info "Enabling ufw ..."
ufw --force enable

# ── Show status ───────────────────────────────────────────────────────────────
echo ""
success "ufw configured. Current rules:"
echo ""
ufw status verbose

echo ""
echo -e "${YELLOW}Notes:${NC}"
echo "  - Port 3001 is open for the current PM2 setup."
echo "    Remove it once Nginx is proxying API traffic:"
echo "    sudo ufw delete allow 3001/tcp"
echo ""
echo "  - Samba is LAN-restricted (${LAN_SUBNET})."
echo "    Update LAN_SUBNET at the top of this script if your network differs."
echo ""
echo "  - WireGuard clients connecting on 51820/udp are on 10.13.13.0/24."
echo "    They can reach Samba through the VPN tunnel without an extra rule."
echo ""
echo "  - Router setup required: forward UDP 51820 to 192.168.0.22 for VPN access."
echo ""
