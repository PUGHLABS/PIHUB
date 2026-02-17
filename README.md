# PiVault

**Secure NAS + Web Dashboard + IoT Hub — powered by Raspberry Pi 3B+**

A self-hosted home server that consolidates encrypted file storage, ESP32 weather station data, security camera management, and a searchable media library into a single platform with a custom web dashboard.

---

## What It Does

```
┌─────────────────────────────────────────────────────┐
│                  PiVault Dashboard                   │
├────────────┬────────────┬─────────────┬─────────────┤
│  Secure    │  Weather   │  Security   │  Media      │
│  NAS       │  Station   │  Cameras    │  Library    │
│            │            │             │             │
│ • Upload   │ • Live     │ • Live view │ • Search    │
│ • Browse   │   gauges   │ • Record    │ • Stream    │
│ • Share    │ • Trends   │ • Playback  │ • Browse    │
│ • Encrypt  │ • Export   │ • Alerts    │ • Download  │
└────────────┴────────────┴─────────────┴─────────────┘
         Raspberry Pi 3B+ │ Docker │ Nginx + TLS
```

## Core Features

| Feature | Description |
|---------|-------------|
| **Encrypted NAS** | LUKS-encrypted USB HDD with Samba shares and web file browser |
| **Web Dashboard** | Mobile-first React + Tailwind UI — system health, quick actions, dark mode |
| **ESP32 Weather** | Ingest sensor data via REST/MQTT, store in InfluxDB, visualize trends with interactive charts |
| **Camera System** | RTSP ingest, continuous recording, motion detection, timeline playback, event search |
| **Media Library** | Auto-indexed movies, music, and docs — full-text search with in-browser streaming |
| **Remote Access** | WireGuard VPN or Cloudflare Tunnel with TLS 1.3 |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| OS | Raspberry Pi OS Lite 64-bit (Bookworm) |
| Containers | Docker + Docker Compose |
| Proxy | Nginx (TLS termination) |
| Backend | Node.js + Express |
| Frontend | React + Tailwind CSS |
| Databases | InfluxDB (time-series) · SQLite (metadata/auth) |
| Camera | FFmpeg + Motion/Frigate |
| File Sharing | Samba (SMB) |
| VPN | WireGuard |

## Hardware

- Raspberry Pi 3B+ (1.4GHz quad-core, 1GB RAM)
- USB external HDD (2TB+, LUKS encrypted)
- ESP32 weather station (BME280, anemometer, rain gauge)
- RTSP IP cameras (1–4, H.264, 1080p)
- UPS for graceful shutdown

## Project Roadmap

| Phase | Milestone | Duration |
|-------|----------|----------|
| 1 | **Foundation** — OS, encryption, Samba, Docker, auth, VPN | 2–3 weeks |
| 2 | **Dashboard + Weather** — React UI, ESP32 API, InfluxDB, trend charts | 3–4 weeks |
| 3 | **Cameras** — RTSP recording, motion detection, playback UI | 3–4 weeks |
| 4 | **Media Library** — scanner, search API, in-browser player | 2–3 weeks |

## Documentation

- [`FSD.md`](FSD.md) — Full Functional Specification Document (requirements, architecture, API specs, data flows, risk analysis)

## License

TBD