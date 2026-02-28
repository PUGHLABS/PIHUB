# WireGuard VPN — PiVault

WireGuard runs as a Docker container using the `linuxserver/wireguard` image.
Peer configs (including private keys) are stored in the `wg-config` Docker named volume
and are **gitignored** — they never leave the Pi.

---

## First-time setup

```bash
# On the Pi, from ~/PIHUB
cp .env.example .env
nano .env                  # Set WG_PEERS, WG_SERVERURL, etc.

./scripts/setup-wireguard.sh start
./scripts/setup-wireguard.sh qr phone       # Scan with WireGuard app
./scripts/setup-wireguard.sh conf laptop    # Copy output to laptop
```

Then forward **UDP port 51820** on your router to **192.168.0.22**.

---

## Helper script reference

```bash
./scripts/setup-wireguard.sh start          # Start container
./scripts/setup-wireguard.sh stop           # Stop container
./scripts/setup-wireguard.sh status         # Show wg0 interface + connected peers
./scripts/setup-wireguard.sh logs           # Tail live container logs
./scripts/setup-wireguard.sh peers          # List all configured peer names
./scripts/setup-wireguard.sh qr <peer>      # Show QR code (scan with phone app)
./scripts/setup-wireguard.sh conf <peer>    # Print .conf file (import on laptop)
```

---

## Adding a new peer

1. Edit `.env` on the Pi — add the new name to `WG_PEERS`:
   ```
   WG_PEERS=laptop,phone,tablet
   ```
2. Recreate the container to regenerate configs:
   ```bash
   docker compose up -d --force-recreate wireguard
   ```
3. Show the new peer's QR or conf:
   ```bash
   ./scripts/setup-wireguard.sh qr tablet
   ```

---

## Revoking a peer

1. Remove the peer name from `WG_PEERS` in `.env`
2. Recreate the container:
   ```bash
   docker compose up -d --force-recreate wireguard
   ```
   The peer's config directory is deleted from the volume on recreation.

---

## Dynamic DNS (if your public IP changes)

If your ISP assigns a dynamic public IP, set up DuckDNS:

1. Register at [duckdns.org](https://www.duckdns.org) — get a free subdomain (e.g. `myhome.duckdns.org`) and your token
2. On the Pi:
   ```bash
   mkdir -p ~/duckdns
   cat << 'EOF' > ~/duckdns/duck.sh
   #!/bin/bash
   curl -sk "https://www.duckdns.org/update?domains=YOURSUBDOMAIN&token=YOURTOKEN&ip=" \
     -o ~/duckdns/duck.log
   EOF
   chmod +x ~/duckdns/duck.sh
   ~/duckdns/duck.sh   # test it

   # Add cron job to update every 5 minutes
   (crontab -l 2>/dev/null; echo "*/5 * * * * ~/duckdns/duck.sh >/dev/null 2>&1") | crontab -
   ```
3. Update `.env`:
   ```
   WG_SERVERURL=myhome.duckdns.org
   ```
4. Recreate WireGuard so peer configs use the hostname:
   ```bash
   docker compose up -d --force-recreate wireguard
   ```

---

## Split tunnel vs full tunnel

Controlled by `WG_ALLOWEDIPS` in `.env`:

| Value | Mode | Effect |
|-------|------|--------|
| `0.0.0.0/0` | Full tunnel | All device traffic routes through Pi (default) |
| `192.168.0.0/24` | Split tunnel | Only LAN traffic; internet goes direct |

Split tunnel is faster for daily use. Full tunnel gives you privacy on public Wi-Fi.

---

## Headless LUKS unlock after reboot

If the Pi's HDD is LUKS-encrypted, you must unlock it after every reboot.
Install `dropbear-initramfs` for remote unlock via SSH:

```bash
sudo apt install dropbear-initramfs

# Add your laptop's public key (run this on your laptop first if needed: ssh-keygen -t ed25519)
cat ~/.ssh/id_ed25519.pub   # copy this output

# On the Pi:
sudo nano /etc/dropbear/initramfs/authorized_keys   # paste the public key
sudo update-initramfs -u
sudo reboot

# After reboot, unlock remotely from your laptop:
ssh -p 22 root@192.168.0.22 cryptroot-unlock
```
