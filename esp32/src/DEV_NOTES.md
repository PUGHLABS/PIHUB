# 🛠️ PiHub Development Cheat Sheet

## 🔗 Connection Quick-Start
- **Server (Pi):** `ssh jeff@192.168.0.22`
- **Client (PC):** `http://localhost:5173` (or 5174)

---

## 📟 Terminal Reference Guide


| Task | Terminal | Command |
| :--- | :--- | :--- |
| **Start Website** | PowerShell (PC) | `cd client` then `npm run dev` |
| **See Live Logs** | SSH (Pi) | `pm2 logs pihub-server` |
| **Check Status** | SSH (Pi) | `pm2 status` |
| **Restart Server**| SSH (Pi) | `pm2 restart pihub-server` |
| **Update Code**   | SSH (Pi) | `cd ~/PIHUB/server` then `git pull` |

---

## 💡 Troubleshooting
- **"Proxy Error" on Website?** 
  Run `pm2 status` on the Pi. If it's not "online," run `pm2 restart pihub-server`.
- **Weather Data Stopped?** 
  Check `pm2 logs` to see if the ingest API is receiving data.
- **Port 5173 in use?** 
  Vite will move to `5174`. Check the terminal for the new link.

---

## 💾 Environment Settings
The client uses a `.env` file in the `/client` folder:
`VITE_API_TARGET="http://192.168.0.22:3001"`
