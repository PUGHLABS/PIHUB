#!/usr/bin/env bash
# =============================================================================
# PiVault — Manual NAS Unlock Script
# =============================================================================
# Run ON THE PI after reboot:  bash scripts/unlock-nas.sh
#
# What this script does:
#   1.  Checks if the NAS drive is already unlocked/mounted
#   2.  Opens the LUKS container (prompts for passphrase)
#   3.  Mounts /mnt/nas
#   4.  Restarts Docker containers that depend on the NAS
# =============================================================================

set -euo pipefail

LUKS_DEVICE="/dev/sda"
MAPPER_NAME="pivault-hdd"
MAPPER_PATH="/dev/mapper/${MAPPER_NAME}"
MOUNT_POINT="/mnt/nas"
COMPOSE_FILE="/home/jeff/PIHUB/docker-compose.yml"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
info()    { echo -e "${GREEN}[✓]${NC} $*"; }
warn()    { echo -e "${YELLOW}[!]${NC} $*"; }
die()     { echo -e "${RED}[✗]${NC} $*" >&2; exit 1; }

# ── Already mounted? ──────────────────────────────────────────────────────────
if mountpoint -q "$MOUNT_POINT"; then
  info "NAS is already mounted at ${MOUNT_POINT}"
  df -h "$MOUNT_POINT"
  exit 0
fi

# ── Check device exists ───────────────────────────────────────────────────────
[[ -b "$LUKS_DEVICE" ]] || die "Device ${LUKS_DEVICE} not found. Is the drive connected?"

# ── Open LUKS container ───────────────────────────────────────────────────────
if [[ ! -b "$MAPPER_PATH" ]]; then
  echo ""
  warn "NAS drive is locked. Enter your LUKS passphrase:"
  sudo cryptsetup luksOpen "$LUKS_DEVICE" "$MAPPER_NAME"
  info "LUKS container opened"
else
  warn "LUKS container already open, skipping unlock"
fi

# ── Mount filesystem ──────────────────────────────────────────────────────────
sudo mkdir -p "$MOUNT_POINT"
sudo mount "$MAPPER_PATH" "$MOUNT_POINT"
info "Mounted ${MAPPER_PATH} → ${MOUNT_POINT}"

df -h "$MOUNT_POINT"

# ── Restart Docker services that depend on NAS ────────────────────────────────
if [[ -f "$COMPOSE_FILE" ]]; then
  echo ""
  warn "Restarting Docker services (samba, server)..."
  sudo docker compose -f "$COMPOSE_FILE" restart samba server 2>/dev/null \
    || sudo docker compose -f "$COMPOSE_FILE" up -d samba server
  info "Docker services restarted"
else
  warn "docker-compose.yml not found at ${COMPOSE_FILE} — restart containers manually if needed"
fi

echo ""
info "NAS unlock complete. Shares and API are back online."
