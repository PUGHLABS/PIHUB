#!/usr/bin/env bash
# =============================================================================
# PiVault — Samba NAS Share Setup (native, not Docker)
# =============================================================================
# Run ON THE PI as root:  sudo bash scripts/setup-samba.sh
#
# What this does:
#   1.  Verifies /mnt/nas is mounted (LUKS drive must be unlocked)
#   2.  Installs Samba via apt
#   3.  Copies smb.conf from the project
#   4.  Creates the Samba user for jeff and sets a password
#   5.  Sets correct permissions on the NAS share directories
#   6.  Enables and starts the Samba service
#   7.  Prints Windows / macOS / Linux connection strings
#
# Tested on: Raspberry Pi OS Lite 64-bit (Trixie / Debian 13)
# =============================================================================

set -euo pipefail

SAMBA_USER="jeff"
NAS_MOUNT="/mnt/nas"
PI_IP="192.168.0.22"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
SMB_CONF_SRC="${PROJECT_ROOT}/docker/samba/smb.conf"

# ── Colors ────────────────────────────────────────────────────────────────────
RED='\033[0;31m'; YELLOW='\033[1;33m'; GREEN='\033[0;32m'
CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

info()    { echo -e "${CYAN}[INFO]${NC}  $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
success() { echo -e "${GREEN}[OK]${NC}    $*"; }
fatal()   { echo -e "${RED}[FATAL]${NC} $*" >&2; exit 1; }

# ── Preflight ─────────────────────────────────────────────────────────────────
[[ "$EUID" -eq 0 ]] || fatal "Must run as root: sudo bash $0"

echo ""
echo -e "${BOLD}════════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}  PiVault — Samba NAS Share Setup${NC}"
echo -e "${BOLD}════════════════════════════════════════════════════════${NC}"
echo ""

# ── Step 1: Verify LUKS drive is mounted ─────────────────────────────────────
info "Checking NAS mount at ${NAS_MOUNT} ..."
if ! mountpoint -q "$NAS_MOUNT"; then
    fatal "${NAS_MOUNT} is not mounted.\n       Unlock the LUKS drive first:\n       sudo cryptsetup luksOpen /dev/sda pivault-hdd && sudo mount ${NAS_MOUNT}"
fi
success "${NAS_MOUNT} is mounted."

# ── Step 2: Install Samba ─────────────────────────────────────────────────────
info "Installing Samba ..."
apt-get update -qq
DEBIAN_FRONTEND=noninteractive apt-get install -y samba
success "Samba installed."

# ── Step 3: Copy smb.conf ─────────────────────────────────────────────────────
if [[ ! -f "$SMB_CONF_SRC" ]]; then
    fatal "smb.conf not found at: ${SMB_CONF_SRC}"
fi
info "Installing smb.conf ..."
# Back up any existing config
[[ -f /etc/samba/smb.conf ]] && cp /etc/samba/smb.conf /etc/samba/smb.conf.bak
cp "$SMB_CONF_SRC" /etc/samba/smb.conf
success "smb.conf installed."

# Validate config
testparm -s /etc/samba/smb.conf 2>/dev/null && success "smb.conf syntax OK." \
    || warn "testparm reported warnings — check smb.conf manually."

# ── Step 4: Create Samba user ────────────────────────────────────────────────
if ! id "$SAMBA_USER" &>/dev/null; then
    fatal "System user '${SAMBA_USER}' does not exist."
fi

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
mkdir -p "${NAS_MOUNT}/nas/shared" "${NAS_MOUNT}/nas/jeff"
chown -R "${JEFF_UID}:${JEFF_GID}" "${NAS_MOUNT}/nas/shared"
chmod 770 "${NAS_MOUNT}/nas/shared"
chown -R "${JEFF_UID}:${JEFF_GID}" "${NAS_MOUNT}/nas/jeff"
chmod 700 "${NAS_MOUNT}/nas/jeff"
success "Permissions set."

# ── Step 6: Enable and start Samba ───────────────────────────────────────────
info "Enabling and starting Samba services ..."
systemctl enable smbd nmbd
systemctl restart smbd nmbd
success "Samba started."

# Verify
if systemctl is-active --quiet smbd; then
    success "smbd is running."
else
    warn "smbd may not have started — check: sudo systemctl status smbd"
fi

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}${BOLD}════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}${BOLD}  Samba Setup Complete!${NC}"
echo -e "${GREEN}${BOLD}════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${BOLD}Connect from Windows (File Explorer address bar or Run dialog):${NC}"
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
echo "  sudo systemctl status smbd    ← check Samba status"
echo "  sudo journalctl -u smbd -f    ← tail Samba logs"
echo ""
