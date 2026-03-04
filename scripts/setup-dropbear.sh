#!/usr/bin/env bash
# =============================================================================
# PiVault — Dropbear Remote LUKS Unlock Setup
# =============================================================================
# Run ON THE PI as root:  sudo bash scripts/setup-dropbear.sh
#
# What this does:
#   Installs dropbear-initramfs so you can SSH into the Pi at boot time
#   (before the OS fully starts) and unlock the LUKS drive remotely.
#
# After setup, the unlock workflow on every reboot is:
#   ssh root@192.168.0.22 cryptroot-unlock
#
# Tested on: Raspberry Pi OS Lite 64-bit (Trixie / Debian 13)
# =============================================================================

set -euo pipefail

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
echo -e "${BOLD}  PiVault — Dropbear Remote LUKS Unlock Setup${NC}"
echo -e "${BOLD}════════════════════════════════════════════════════════${NC}"
echo ""

# Verify LUKS is configured
if ! grep -q "pivault-hdd" /etc/crypttab 2>/dev/null; then
    fatal "No pivault-hdd entry found in /etc/crypttab. Run setup-luks.sh first."
fi

# Verify the invoking user's SSH key exists (need it for dropbear auth)
SSH_KEY_SOURCE="/home/jeff/.ssh/authorized_keys"
if [[ ! -f "$SSH_KEY_SOURCE" ]]; then
    # Fall back to root's keys
    SSH_KEY_SOURCE="/root/.ssh/authorized_keys"
fi

if [[ ! -f "$SSH_KEY_SOURCE" ]]; then
    fatal "No authorized_keys found at /home/jeff/.ssh/authorized_keys or /root/.ssh/authorized_keys.\n       Add your SSH public key first: ssh-copy-id jeff@192.168.0.22"
fi

# ── Step 1: Install dropbear-initramfs ────────────────────────────────────────
info "Installing dropbear-initramfs ..."
apt-get update -qq
apt-get install -y dropbear-initramfs
success "dropbear-initramfs installed."

# ── Step 2: Copy authorized SSH key ──────────────────────────────────────────
# dropbear-initramfs 2025.x on Debian 13 uses /etc/dropbear/initramfs/ (NOT /etc/dropbear-initramfs/)
DROPBEAR_KEYS_DIR="/etc/dropbear/initramfs"
mkdir -p "$DROPBEAR_KEYS_DIR"

info "Copying SSH authorized_keys from: ${SSH_KEY_SOURCE}"
# Strip Windows CRLF line endings if present (key copied from Windows)
sed 's/\r//' "$SSH_KEY_SOURCE" > "${DROPBEAR_KEYS_DIR}/authorized_keys"
chmod 600 "${DROPBEAR_KEYS_DIR}/authorized_keys"
success "Authorized keys copied."

# Show which keys were added
KEY_COUNT=$(wc -l < "${DROPBEAR_KEYS_DIR}/authorized_keys")
info "${KEY_COUNT} key(s) authorized for remote unlock."

# ── Step 3: Configure dropbear ────────────────────────────────────────────────
DROPBEAR_CONF="${DROPBEAR_KEYS_DIR}/dropbear.conf"
info "Writing dropbear configuration ..."

cat > "$DROPBEAR_CONF" <<'EOF'
# Dropbear initramfs configuration
# Listens on port 22 during early boot for LUKS unlock

# Listen on standard SSH port during initramfs
DROPBEAR_OPTIONS="-p 22 -s -j -k -I 60"
# -s  disable password auth (keys only)
# -j  disable local port forwarding
# -k  disable remote port forwarding
# -I  idle timeout in seconds
EOF

success "Dropbear configured (port 22, key-auth only)."

# ── Step 4: Rebuild initramfs ─────────────────────────────────────────────────
info "Rebuilding initramfs (this takes ~30 seconds) ..."
update-initramfs -u -k all
success "initramfs updated."

# ── Step 5: Verify the dropbear binary is in the initramfs ───────────────────
info "Verifying dropbear is in initramfs ..."
KERNEL_VER=$(uname -r)
INITRD="/boot/initrd.img-${KERNEL_VER}"
if [[ -f "$INITRD" ]] && lsinitramfs "$INITRD" 2>/dev/null | grep -q "dropbear"; then
    success "dropbear confirmed in initramfs."
else
    warn "Could not verify dropbear in initramfs — check /boot/initrd.img manually."
fi

# ── Step 6: Copy initramfs to boot firmware partition (Pi-specific) ──────────
# The Pi bootloader reads from /boot/firmware/ (FAT32), not /boot/ (ext4).
# update-initramfs writes to /boot/, so we must copy it across.
FIRMWARE_DIR="/boot/firmware"
if [[ -d "$FIRMWARE_DIR" ]]; then
    info "Copying initramfs to Pi boot partition (${FIRMWARE_DIR}) ..."
    cp "$INITRD" "${FIRMWARE_DIR}/initrd.img-${KERNEL_VER}"
    success "initramfs copied to ${FIRMWARE_DIR}."

    # Add initramfs line to config.txt if not already present
    CONFIG_TXT="${FIRMWARE_DIR}/config.txt"
    INITRAMFS_LINE="initramfs initrd.img-${KERNEL_VER} followkernel"
    if grep -q "^initramfs" "$CONFIG_TXT" 2>/dev/null; then
        warn "initramfs line already in config.txt — updating it."
        sed -i "s|^initramfs.*|${INITRAMFS_LINE}|" "$CONFIG_TXT"
    else
        echo "$INITRAMFS_LINE" >> "$CONFIG_TXT"
        success "initramfs line added to config.txt."
    fi
else
    warn "/boot/firmware not found — skipping Pi bootloader config."
    warn "If using a Pi, manually copy ${INITRD} to your boot partition and add:"
    warn "  initramfs initrd.img-${KERNEL_VER} followkernel"
    warn "to /boot/firmware/config.txt"
fi

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}${BOLD}════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}${BOLD}  Dropbear Setup Complete!${NC}"
echo -e "${GREEN}${BOLD}════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${BOLD}Remote LUKS unlock workflow (after every reboot):${NC}"
echo ""
echo "  1. Wait ~30 seconds after the Pi powers on"
echo "  2. From your PC:"
echo ""
echo -e "     ${CYAN}ssh root@192.168.0.22 cryptroot-unlock${NC}"
echo ""
echo "  3. Enter your LUKS passphrase when prompted"
echo "  4. The Pi will finish booting and drop you back to your shell"
echo "  5. Re-SSH normally: ssh jeff@192.168.0.22"
echo ""
echo -e "${YELLOW}IMPORTANT:${NC}"
echo "  • Your SSH private key must match the authorized_keys copied above"
echo "  • If your Pi's IP changes, update the ssh command accordingly"
echo "  • Test this NOW before relying on it:"
echo ""
echo "      sudo reboot"
echo "      # Wait 30s, then: ssh root@192.168.0.22 cryptroot-unlock"
echo ""
