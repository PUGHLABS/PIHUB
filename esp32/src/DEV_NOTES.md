# 🛠️ PiHub Development Cheat Sheet

## 🔗 Connection Quick-Start
- **Server (Pi):** "to ssh in": ` ssh  jeff@192.168.0.22`
- **Client (PC):** `http://localhost:5173` (or 5174)

---

## 📟 Terminal Reference Guide


| Task | Terminal | Command |
| :--- | :--- | :--- |
| **Start Website** | PowerShell (PC) | `cd client` then `npm run dev` | cd "C:\!PROJECTS\HOME PROJECTS\PIHUB\client" && npm run dev |
| **See Live Logs** | SSH (Pi) | `pm2 logs pihub-server` |
| **Check Status** | SSH (Pi) | `pm2 status` |
| **Restart Server**| SSH (Pi) | `pm2 restart pihub-server` |
| **Update Code**   | SSH (Pi) | `cd ~/PIHUB/server` then `git pull` |
| **Power Down Pi** | SSH (Pi) | `sudo shutdown -h now` |
| **curl http://192.168.0.22:3001/api/health** | PowerShell (PC) |
| **cd "c:/!PROJECTS/HOME PROJECTS/PIHUB/esp32"**|
| **pio run -t upload -e esp32** | `PowerShell (PC) | `change firmware on ESP and flash via USB - note root!`|
| **ESP Serial port**| *watch data from ESP32*| `pio device monitor -b 115200 `|



---

## 🔒 WireGuard VPN (Docker on Pi)

| Task | Terminal | Command |
| :--- | :--- | :--- |
| **Start WireGuard** | SSH (Pi) | `cd ~/PIHUB && bash scripts/setup-wireguard.sh start` |
| **Stop WireGuard** | SSH (Pi) | `bash scripts/setup-wireguard.sh stop` |
| **Check status / handshakes** | SSH (Pi) | `bash scripts/setup-wireguard.sh status` |
| **Show phone QR code** | SSH (Pi) | `bash scripts/setup-wireguard.sh qr phone` |
| **Get laptop .conf file** | SSH (Pi) | `bash scripts/setup-wireguard.sh conf laptop` |
| **List peer names** | SSH (Pi) | `bash scripts/setup-wireguard.sh peers` |
| **Tail container logs** | SSH (Pi) | `bash scripts/setup-wireguard.sh logs` |
| **Check Docker containers** | SSH (Pi) | `docker ps` |
| **Restart WireGuard container** | SSH (Pi) | `docker compose -f ~/PIHUB/docker-compose.yml restart wireguard` |

**First-time setup on Pi:**
```bash
cd ~/PIHUB
cp .env.example .env       # edit with nano .env
bash scripts/setup-wireguard.sh start
bash scripts/setup-wireguard.sh qr phone    # scan with WireGuard app
bash scripts/setup-wireguard.sh conf laptop # import on laptop
```
Router: Forward **UDP 51820 → 192.168.0.22** in port forwarding settings.

---

## 🔐 LUKS Encrypted Drive

**Every reboot** — SSH in and run the unlock script:
```bash
ssh jeff@192.168.0.22
bash ~/PIHUB/scripts/unlock-nas.sh   # enter LUKS passphrase → NAS mounts + Docker restarts
```

| Task | Terminal | Command |
| :--- | :--- | :--- |
| **Unlock NAS after reboot** | SSH (Pi) | `bash ~/PIHUB/scripts/unlock-nas.sh` |
| **Verify NAS mounted** | SSH (Pi) | `df -h /mnt/nas` |
| **Check LUKS status** | SSH (Pi) | `sudo cryptsetup status pivault-hdd` |
| **Lock + unmount** (clean shutdown) | SSH (Pi) | `sudo umount /mnt/nas && sudo cryptsetup luksClose pivault-hdd` |
| **List LUKS key slots** | SSH (Pi) | `sudo cryptsetup luksDump /dev/sda` |

**First-time setup on Pi:**
```bash
sudo bash ~/PIHUB/scripts/setup-luks.sh   # format + mount drive
```

> **Note:** Root filesystem is on the unencrypted SD card. `pivault-hdd` is a secondary data
> drive — it requires manual unlock after every reboot via `unlock-nas.sh`.

---

## 📁 Samba NAS Shares

| Share | Windows path | macOS/Linux path |
| :--- | :--- | :--- |
| **jeff's private share** | `\\192.168.0.22\nas-jeff` | `smb://192.168.0.22/nas-jeff` |
| **shared folder** | `\\192.168.0.22\nas-shared` | `smb://192.168.0.22/nas-shared` |

Login with user `jeff` and the Samba password set during setup.

| Task | Terminal | Command |
| :--- | :--- | :--- |
| **Check Samba service** | SSH (Pi) | `sudo systemctl status smbd` |
| **Restart Samba** | SSH (Pi) | `sudo systemctl restart smbd` |
| **List Samba users** | SSH (Pi) | `sudo pdbedit -L` |
| **Reset Samba password** | SSH (Pi) | `sudo smbpasswd jeff` |
| **Test config** | SSH (Pi) | `testparm` |

---

## 🔒 HTTPS / Nginx

| URL | Description |
| :--- | :--- |
| `https://192.168.0.22` | Web dashboard (accept self-signed cert warning) |
| `https://192.168.0.22/api/health` | API health check |
| `http://192.168.0.22` | Redirects → HTTPS (301) |

| Task | Terminal | Command |
| :--- | :--- | :--- |
| **Check Nginx container** | SSH (Pi) | `docker ps \| grep nginx` |
| **Restart Nginx** | SSH (Pi) | `docker compose -f ~/PIHUB/docker-compose.yml restart nginx` |
| **View Nginx logs** | SSH (Pi) | `docker compose -f ~/PIHUB/docker-compose.yml logs nginx` |
| **Regenerate TLS cert** | SSH (Pi) | `sudo bash ~/PIHUB/scripts/setup-tls.sh` |

---

## 💡 Troubleshooting
- **"Proxy Error" on Website?**
  Run `pm2 status` on the Pi. If it's not "online," run `pm2 restart pihub-server`.
- **Weather Data Stopped?**
  Check `pm2 logs` to see if the ingest API is receiving data.
- **Port 5173 in use?**
  Vite will move to `5174`. Check the terminal for the new link.
- **NAS not mounted after reboot?**
  Run `bash ~/PIHUB/scripts/unlock-nas.sh` after SSH-ing in. Enter the LUKS passphrase when prompted.
- **Samba shares unavailable after reboot?**
  NAS needs to be unlocked first. Run `unlock-nas.sh` — it restarts Samba automatically.

---

## 💾 Environment Settings
The client uses a `.env` file in the `/client` folder:
`VITE_API_TARGET="http://192.168.0.22:3001"`
