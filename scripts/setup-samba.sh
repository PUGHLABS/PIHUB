#!/usr/bin/env bash
# =============================================================================
# PiVault — Samba NAS Share Setup
# =============================================================================
# Run ON THE PI as root:  sudo bash scripts/setup-samba.sh
#
# What this does:
#   1.  Verifies /mnt/nas is mounted (LUKS drive must be unlocked)
#   2.  Creates the Samba user for jeff and sets a password
#   3.  Sets correct permissions on the NAS share directories
#   4.  Starts the Samba Docker container
#   5.  Prints Windows / macOS / Linux connection strings
#
# Tested on: Raspberry Pi OS Lite 64-bit (Trixie / Debian 13)
# =============================================================================

set -euo pipefail

SAMBA_USER="jeff"
NAS_MOUNT="/mnt/nas"
PI_IP="192.168.0.22"

# ── Colors ────────────────────────────────────────────────────────────────────
RED='\033[0;31m'; YELLOW='\033[1;33m'; GREEN='\033[0;32m'
CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

info()    { echo -e "${CYAN}[INFO]${NC}  $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
success() { echo -e "${GREEN}[OK]${NC}    $*"; }
fatal()   { echo -e "${RED}[FATAL]${NC} $*" >&2; exit 1; }

# ── Preflight ─────────────────────────────────────────────────────────────────
[[ "$EUID" -eq 0 ]] || fatal "Must run as root: sudo bash $0"

for cmd in docker smbpasswd id; do
    command -v "$cmd" &>/dev/null \
        || fatal "Required tool not found: $cmd"
done

echo ""
echo -e "${BOLD}════════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}  PiVault — Samba NAS Share Setup${NC}"
echo -e "${BOLD}════════════════════════════════════════════════════════${NC}"
echo ""

# ── Step 1: Verify LUKS drive is mounted ─────────────────────────────────────
info "Checking NAS mount at ${NAS_MOUNT} ..."
if ! mountpoint -q "$NAS_MOUNT"; then
    fatal "${NAS_MOUNT} is not mounted.\n       The LUKS drive must be unlocked before setting up Samba.\n       Run: cryptsetup luksOpen /dev/sda pivault-hdd && mount ${NAS_MOUNT}"
fi
success "${NAS_MOUNT} is mounted."

# ── Step 2: Verify user jeff exists ──────────────────────────────────────────
if ! id "$SAMBA_USER" &>/dev/null; then
    fatal "System user '${SAMBA_USER}' does not exist. Create it first."
fi

# ── Step 3: Install smbpasswd tool if not present ────────────────────────────
if ! command -v smbpasswd &>/dev/null; then
    info "Installing samba-common-bin for smbpasswd ..."
    apt-get update -qq
    apt-get install -y samba-common-bin
fi

# ── Step 4: Create Samba user ────────────────────────────────────────────────
info "Setting Samba password for user '${SAMBA_USER}' ..."
echo -e "${YELLOW}You will be prompted to set the Samba (SMB) password for jeff.${NC}"
echo -e "${YELLOW}This is separate from your Linux login password.${NC}"
echo ""
smbpasswd -a "$SAMBA_USER"
smbpasswd -e "$SAMBA_USER"
success "Samba user '${SAMBA_USER}' created and enabled."

# ── Step 5: Set directory permissions ────────────────────────────────────────
JEFF_UID=$(id -u "$SAMBA_USER")
JEFF_GID=$(id -g "$SAMBA_USER")

info "Setting permissions on NAS directories ..."

# Shared directory — jeff owns it, group readable
chown -R "${JEFF_UID}:${JEFF_GID}" "${NAS_MOUNT}/nas/shared"
chmod 770 "${NAS_MOUNT}/nas/shared"

# Private directory — jeff only
chown -R "${JEFF_UID}:${JEFF_GID}" "${NAS_MOUNT}/nas/jeff"
chmod 700 "${NAS_MOUNT}/nas/jeff"

success "Permissions set."

# ── Step 6: Start Samba container ────────────────────────────────────────────
COMPOSE_FILE="$(dirname "$(dirname "$(realpath "$0")")")/docker-compose.yml"

if [[ ! -f "$COMPOSE_FILE" ]]; then
    fatal "docker-compose.yml not found at: ${COMPOSE_FILE}"
fi

info "Starting Samba container ..."
docker compose -f "$COMPOSE_FILE" up -d samba
success "Samba container started."

# Wait a moment for it to initialize
sleep 3

# Check it's running
if docker compose -f "$COMPOSE_FILE" ps samba | grep -q "running\|Up"; then
    success "Samba container is running."
else
    warn "Container may not have started cleanly. Check: docker compose logs samba"
fi

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}${BOLD}════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}${BOLD}  Samba Setup Complete!${NC}"
echo -e "${GREEN}${BOLD}════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${BOLD}Connect from Windows (File Explorer or Run dialog):${NC}"
echo ""
echo "  \\\\${PI_IP}\\nas-jeff      ← Jeff's private share"
echo "  \\\\${PI_IP}\\nas-shared    ← Shared storage"
echo ""
echo -e "${BOLD}Connect from macOS (Finder → Go → Connect to Server):${NC}"
echo ""
echo "  smb://${PI_IP}/nas-jeff"
echo "  smb://${PI_IP}/nas-shared"
echo ""
echo -e "${BOLD}Connect from Linux:${NC}"
echo ""
echo "  sudo mount -t cifs //${PI_IP}/nas-jeff /mnt/nas-jeff -o user=jeff"
echo ""
echo -e "${YELLOW}Login credentials:${NC} username = ${SAMBA_USER}, password = (what you just set)"
echo ""
echo -e "${YELLOW}Troubleshooting:${NC}"
echo "  docker compose logs samba     ← view Samba logs"
echo "  docker compose restart samba  ← restart the container"
echo ""
