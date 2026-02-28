#!/usr/bin/env bash
# =============================================================================
# PiVault — LUKS Encrypted HDD Setup Script
# =============================================================================
# Run ON THE PI as root:  sudo bash scripts/setup-luks.sh
#
# Tested on: Raspberry Pi OS Lite 64-bit (Trixie / Debian 13)
#
# What this script does:
#   1.  Lists available block devices and prompts you to choose the target
#   2.  Guards against accidentally selecting the SD card (/dev/mmcblk*)
#   3.  Shows device info and requires typing YES before erasing
#   4.  LUKS2-formats the device (AES-256-XTS, passphrase-protected)
#   5.  Creates ext4 filesystem on the LUKS container
#   6.  Adds entries to /etc/crypttab and /etc/fstab for auto-mount at boot
#   7.  Mounts the drive at /mnt/nas and sets ownership to jeff (uid 1000)
#   8.  Creates the PiVault directory structure on the drive
# =============================================================================

set -euo pipefail

# ── Configuration ─────────────────────────────────────────────────────────────
MAPPER_NAME="pivault-hdd"
MOUNT_POINT="/mnt/nas"
LUKS_LABEL="pivault-data"
FS_LABEL="PIVAULT"
OWNER_UID=1000   # jeff

# ── Colors ────────────────────────────────────────────────────────────────────
RED='\033[0;31m'; YELLOW='\033[1;33m'; GREEN='\033[0;32m'
CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

info()    { echo -e "${CYAN}[INFO]${NC}  $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
success() { echo -e "${GREEN}[OK]${NC}    $*"; }
fatal()   { echo -e "${RED}[FATAL]${NC} $*" >&2; exit 1; }

confirm() {
    echo -e "${YELLOW}$1${NC}"
    read -r -p "Type YES (all caps) to continue, anything else to abort: " answer
    [[ "$answer" == "YES" ]] || { echo "Aborted."; exit 0; }
}

# ── Preflight ─────────────────────────────────────────────────────────────────
[[ "$EUID" -eq 0 ]] || fatal "Must run as root: sudo bash $0"

for cmd in lsblk cryptsetup mkfs.ext4 blkid findmnt; do
    command -v "$cmd" &>/dev/null \
        || fatal "Required tool not found: $cmd  →  sudo apt install cryptsetup e2fsprogs util-linux"
done

echo ""
echo -e "${BOLD}════════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}  PiVault — LUKS Encrypted HDD Setup${NC}"
echo -e "${BOLD}════════════════════════════════════════════════════════${NC}"
echo ""

# ── Step 1: Show block devices ────────────────────────────────────────────────
info "Available block devices:"
echo ""
lsblk -o NAME,SIZE,TYPE,FSTYPE,MOUNTPOINT,LABEL -e 11
echo ""

# ── Step 2: Choose target device ─────────────────────────────────────────────
read -r -p "Enter the target device (e.g. /dev/sda, NOT the SD card /dev/mmcblk0): " TARGET

[[ -b "$TARGET" ]] || fatal "Not a block device: $TARGET"

# SD card guard
if [[ "$TARGET" == /dev/mmcblk* ]]; then
    fatal "Refused: $TARGET looks like the SD card. Will not format the boot drive."
fi

# ── Step 3: Device info + confirmation ───────────────────────────────────────
echo ""
info "Device info for ${TARGET}:"
lsblk -o NAME,SIZE,TYPE,FSTYPE,MOUNTPOINT,LABEL "$TARGET"
echo ""

# Check not already mounted
if mount | grep -q "^${TARGET}"; then
    fatal "$TARGET is currently mounted. Unmount it first."
fi

echo -e "${RED}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${RED}${BOLD}  WARNING: ALL DATA ON ${TARGET} WILL BE PERMANENTLY DESTROYED${NC}"
echo -e "${RED}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
confirm "Are you absolutely sure you want to LUKS2-format ${TARGET}?"

# ── Step 4: LUKS2 format ──────────────────────────────────────────────────────
info "LUKS2-formatting ${TARGET} ..."
info "You will be prompted to create a passphrase. WRITE IT DOWN — it cannot be recovered."
echo ""

cryptsetup luksFormat \
    --type luks2 \
    --cipher aes-xts-plain64 \
    --key-size 512 \
    --hash sha256 \
    --iter-time 2000 \
    --label "$LUKS_LABEL" \
    "$TARGET"

success "LUKS2 format complete."
echo ""

# ── Step 5: Open LUKS container ───────────────────────────────────────────────
info "Opening LUKS container as /dev/mapper/${MAPPER_NAME} ..."
cryptsetup luksOpen "$TARGET" "$MAPPER_NAME"
success "Container opened."

# ── Step 6: Create ext4 filesystem ───────────────────────────────────────────
info "Creating ext4 filesystem (label: ${FS_LABEL}) ..."
mkfs.ext4 \
    -L "$FS_LABEL" \
    -m 1 \
    -E lazy_itable_init=0,lazy_journal_init=0 \
    "/dev/mapper/${MAPPER_NAME}"
success "ext4 filesystem created."

# ── Step 7: Get UUIDs ─────────────────────────────────────────────────────────
LUKS_UUID=$(blkid -s UUID -o value "$TARGET")
EXT4_UUID=$(blkid -s UUID -o value "/dev/mapper/${MAPPER_NAME}")
info "LUKS UUID:  ${LUKS_UUID}"
info "ext4 UUID:  ${EXT4_UUID}"

# ── Step 8: /etc/crypttab ────────────────────────────────────────────────────
CRYPTTAB_LINE="${MAPPER_NAME}  UUID=${LUKS_UUID}  none  luks,discard"
if grep -q "$LUKS_UUID" /etc/crypttab 2>/dev/null; then
    warn "crypttab entry already exists — skipping."
else
    info "Adding entry to /etc/crypttab ..."
    echo "$CRYPTTAB_LINE" >> /etc/crypttab
    success "crypttab updated."
fi

# ── Step 9: Create mount point ────────────────────────────────────────────────
mkdir -p "$MOUNT_POINT"

# ── Step 10: /etc/fstab ───────────────────────────────────────────────────────
FSTAB_LINE="UUID=${EXT4_UUID}  ${MOUNT_POINT}  ext4  defaults,noatime,nofail  0  2"
if grep -q "$EXT4_UUID" /etc/fstab 2>/dev/null; then
    warn "fstab entry already exists — skipping."
else
    info "Adding entry to /etc/fstab ..."
    echo "$FSTAB_LINE" >> /etc/fstab
    success "fstab updated."
fi

# Validate fstab syntax
info "Validating fstab ..."
findmnt --verify --verbose || warn "fstab warnings above — review before rebooting."

# ── Step 11: Mount and set ownership ─────────────────────────────────────────
info "Mounting ${MOUNT_POINT} ..."
mount "$MOUNT_POINT"
chown -R "${OWNER_UID}:${OWNER_UID}" "$MOUNT_POINT"
success "Mounted and ownership set."

# ── Step 12: Directory structure ──────────────────────────────────────────────
info "Creating directory structure ..."
mkdir -p \
    "${MOUNT_POINT}/nas/shared" \
    "${MOUNT_POINT}/nas/jeff" \
    "${MOUNT_POINT}/media/movies" \
    "${MOUNT_POINT}/media/music" \
    "${MOUNT_POINT}/media/photos" \
    "${MOUNT_POINT}/cameras/recordings" \
    "${MOUNT_POINT}/cameras/snapshots" \
    "${MOUNT_POINT}/docker/server-data" \
    "${MOUNT_POINT}/backups"

chown -R "${OWNER_UID}:${OWNER_UID}" "$MOUNT_POINT"
chmod 750 "${MOUNT_POINT}/nas/jeff"
chmod 770 "${MOUNT_POINT}/nas/shared"
success "Directory structure created."

df -h "$MOUNT_POINT"

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}${BOLD}════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}${BOLD}  LUKS Setup Complete!${NC}"
echo -e "${GREEN}${BOLD}════════════════════════════════════════════════════════${NC}"
echo ""
echo "  Device:      ${TARGET}"
echo "  LUKS UUID:   ${LUKS_UUID}"
echo "  Mapper:      /dev/mapper/${MAPPER_NAME}"
echo "  Mount point: ${MOUNT_POINT}"
echo ""
echo -e "${YELLOW}IMPORTANT NEXT STEPS:${NC}"
echo ""
echo "  1. STORE YOUR LUKS PASSPHRASE in a password manager NOW."
echo "     It cannot be recovered if lost. The encrypted data is gone with it."
echo ""
echo "  2. Reboot and verify auto-mount:"
echo "     sudo reboot"
echo "     # At the console, enter the LUKS passphrase when prompted."
echo "     # Then re-SSH and check: df -h /mnt/nas"
echo ""
echo "  3. For REMOTE unlock after reboot (no monitor needed), install dropbear:"
echo "     sudo apt install dropbear-initramfs"
echo "     sudo bash -c 'cat ~/.ssh/authorized_keys > /etc/dropbear/initramfs/authorized_keys'"
echo "     sudo update-initramfs -u"
echo "     # After next reboot: ssh root@192.168.0.22 cryptroot-unlock"
echo ""
echo "  4. Once working, update docker-compose.yml server volumes to use"
echo "     ${MOUNT_POINT}/docker/server-data instead of the named volume."
echo ""
