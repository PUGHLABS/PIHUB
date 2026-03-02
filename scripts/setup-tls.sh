#!/usr/bin/env bash
# =============================================================================
# PiVault — Self-Signed TLS Certificate Generator
# =============================================================================
# Run ON THE PI as jeff (no root needed):  bash scripts/setup-tls.sh
#
# What this does:
#   Generates a 10-year self-signed TLS certificate with a proper SAN
#   (Subject Alternative Name) for both the Pi's IP and hostname.
#   Outputs to docker/nginx/certs/ (gitignored — never committed).
#
# After running this, restart Nginx:
#   docker compose restart nginx
#
# To trust the cert on your devices, see the instructions printed at the end.
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
CERTS_DIR="${PROJECT_ROOT}/docker/nginx/certs"

PI_IP="192.168.0.22"
PI_HOSTNAME="pivault"
CERT_DAYS=3650   # ~10 years

# ── Colors ────────────────────────────────────────────────────────────────────
RED='\033[0;31m'; YELLOW='\033[1;33m'; GREEN='\033[0;32m'
CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

info()    { echo -e "${CYAN}[INFO]${NC}  $*"; }
success() { echo -e "${GREEN}[OK]${NC}    $*"; }
fatal()   { echo -e "${RED}[FATAL]${NC} $*" >&2; exit 1; }

# ── Preflight ─────────────────────────────────────────────────────────────────
command -v openssl &>/dev/null || fatal "openssl not found: sudo apt install openssl"

echo ""
echo -e "${BOLD}════════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}  PiVault — TLS Certificate Generator${NC}"
echo -e "${BOLD}════════════════════════════════════════════════════════${NC}"
echo ""

# ── Create certs directory ────────────────────────────────────────────────────
mkdir -p "$CERTS_DIR"
chmod 750 "$CERTS_DIR"

CERT_FILE="${CERTS_DIR}/pivault.crt"
KEY_FILE="${CERTS_DIR}/pivault.key"

# Warn if overwriting
if [[ -f "$CERT_FILE" ]]; then
    echo -e "${YELLOW}[WARN]${NC}  Certificate already exists at ${CERT_FILE}"
    read -r -p "Overwrite it? (y/N): " answer
    [[ "$answer" =~ ^[Yy]$ ]] || { echo "Aborted."; exit 0; }
fi

# ── Generate certificate ──────────────────────────────────────────────────────
info "Generating RSA 4096 private key + self-signed certificate ..."
info "Valid for: ${CERT_DAYS} days (~10 years)"
info "SANs: IP:${PI_IP}, DNS:${PI_HOSTNAME}, DNS:${PI_HOSTNAME}.local, DNS:localhost"
echo ""

openssl req -x509 -nodes \
    -newkey rsa:4096 \
    -days "$CERT_DAYS" \
    -keyout "$KEY_FILE" \
    -out "$CERT_FILE" \
    -subj "/C=US/ST=CA/O=PiVault/CN=${PI_HOSTNAME}" \
    -addext "subjectAltName=IP:${PI_IP},IP:127.0.0.1,DNS:${PI_HOSTNAME},DNS:${PI_HOSTNAME}.local,DNS:localhost"

chmod 600 "$KEY_FILE"
chmod 644 "$CERT_FILE"

success "Certificate generated."

# ── Show cert info ────────────────────────────────────────────────────────────
echo ""
info "Certificate details:"
openssl x509 -in "$CERT_FILE" -noout -subject -issuer -dates -ext subjectAltName 2>/dev/null || true

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}${BOLD}════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}${BOLD}  TLS Certificate Ready!${NC}"
echo -e "${GREEN}${BOLD}════════════════════════════════════════════════════════${NC}"
echo ""
echo "  Certificate: ${CERT_FILE}"
echo "  Private key: ${KEY_FILE}"
echo ""
echo -e "${BOLD}Restart Nginx to apply:${NC}"
echo ""
echo "  docker compose restart nginx"
echo ""
echo -e "${BOLD}Then test:${NC}"
echo ""
echo "  curl -k https://${PI_IP}/api/health"
echo "  curl -I http://${PI_IP}   # should redirect to https"
echo ""
echo -e "${YELLOW}═══ Trusting the Certificate on Your Devices ═══${NC}"
echo ""
echo -e "${BOLD}Windows:${NC}"
echo "  1. Copy pivault.crt to your Windows PC (scp or SMB)"
echo "  2. Double-click pivault.crt → Install Certificate"
echo "  3. Choose 'Local Machine' → 'Trusted Root Certification Authorities'"
echo "  4. Restart browser"
echo ""
echo -e "${BOLD}macOS:${NC}"
echo "  1. Copy pivault.crt to your Mac"
echo "  2. Double-click → Keychain Access → add to 'System' keychain"
echo "  3. Find 'pivault' cert → Get Info → Trust → Always Trust"
echo ""
echo -e "${BOLD}Android (Chrome):${NC}"
echo "  1. Copy pivault.crt to phone"
echo "  2. Settings → Security → Install from storage → CA Certificate"
echo ""
echo -e "${BOLD}Firefox (any OS — does its own cert store):${NC}"
echo "  Settings → Privacy & Security → View Certificates → Authorities → Import"
echo "  → select pivault.crt → check 'Trust this CA to identify websites'"
echo ""
echo -e "${YELLOW}NOTE:${NC} The cert is gitignored and stays only on this Pi."
echo "       Run this script again on a new Pi or after regenerating."
echo ""
