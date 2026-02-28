# PiVault — Functional Specification Document

## RPi 3B+ Secure NAS with Custom Web Dashboard & IoT Integration

| Field | Detail |
|-------|--------|
| **Version** | 1.0 — Initial Draft |
| **Date** | February 17, 2026 |
| **Author** | Jeff |
| **Status** | Draft |
| **Codename** | PiVault |

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Overview & Architecture](#2-system-overview--architecture)
3. [Functional Requirements](#3-functional-requirements)
   - 3.1 [User Authentication & Access Control](#31-user-authentication--access-control)
   - 3.2 [Secure NAS Storage](#32-secure-nas-storage)
   - 3.3 [Custom Web Dashboard](#33-custom-web-dashboard)
   - 3.4 [ESP32 Weather Station Integration](#34-esp32-weather-station-integration)
   - 3.5 [Security Camera System](#35-security-camera-system)
   - 3.6 [Searchable Media Library](#36-searchable-media-library)
4. [Non-Functional Requirements](#4-non-functional-requirements)
5. [API Specifications](#5-api-specifications)
6. [Data Flow Diagrams](#6-data-flow-diagrams)
7. [Implementation Roadmap](#7-implementation-roadmap)
8. [Testing Strategy](#8-testing-strategy)
9. [Risks & Mitigations](#9-risks--mitigations)
10. [Future Enhancements](#10-future-enhancements-post-mvp)
11. [Glossary](#11-glossary)
12. [Revision History](#12-revision-history)

---

## 1. Executive Summary

This Functional Specification Document (FSD) defines the requirements, architecture, and implementation plan for **PiVault** — a secure Network Attached Storage (NAS) system built on a Raspberry Pi 3B+. PiVault consolidates personal media, IoT sensor data, and security camera feeds into a single, self-hosted platform accessible through a custom web dashboard.

The system serves as a personal home server providing encrypted storage, real-time weather monitoring from an ESP32 station, security camera management with playback, and a searchable media library for movies, music, and documents.

### 1.1 Project Goals

| Goal | Description | Priority |
|------|-------------|----------|
| Secure NAS Storage | Encrypted file storage with access controls and backup capability | P0 — Critical |
| Custom Web Dashboard | Responsive, mobile-first UI for managing all system functions | P0 — Critical |
| ESP32 Weather Integration | Ingest, store, and visualize weather station data with trend analysis | P1 — High |
| Security Camera System | Live view, recording, and searchable playback of camera feeds | P1 — High |
| Media Library | Searchable catalog of movies, music, and documents with streaming | P2 — Medium |
| Remote Access | Secure external access via VPN or reverse proxy with TLS | P1 — High |

---

## 2. System Overview & Architecture

PiVault is designed as a modular, containerized system running on Raspberry Pi OS Lite (64-bit). Each major service runs in its own Docker container, enabling independent updates, resource isolation, and simplified deployment.

### 2.1 High-Level Architecture

```
┌────────────────────────────────────────────────────────────────┐
│  PRESENTATION LAYER: Nginx Reverse Proxy + TLS                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  APPLICATION LAYER: Custom Web Dashboard (React)          │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌──────────┐   │
│  │ NAS/Samba  │ │ ESP32 API  │ │ Camera Mgr │ │ Media Srv│   │
│  └────────────┘ └────────────┘ └────────────┘ └──────────┘   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  DATA LAYER: SQLite + InfluxDB + File System              │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  HARDWARE: RPi 3B+ │ USB HDD │ ESP32 │ IP Cameras        │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
```

### 2.2 Hardware Requirements

| Component | Specification | Purpose |
|-----------|--------------|---------|
| Raspberry Pi 3B+ | 1.4GHz Cortex-A53, 1GB RAM, Gigabit Ethernet (300Mbps) | Primary server |
| USB External HDD | 2TB+ USB 3.0 (via USB 2.0 port), ext4 formatted | Primary storage volume |
| microSD Card | 32GB+ Class 10 / UHS-I | OS boot drive |
| ESP32 Weather Station | ESP32-WROOM-32 with BME280, rain gauge, anemometer | Environmental data source |
| IP Cameras | RTSP-compatible, H.264 encoding, 1080p minimum | Security video feeds |
| UPS / Power Bank | 5V 2.5A minimum with battery backup | Graceful shutdown protection |
| Ethernet Cable | Cat5e or Cat6 for wired connection to router | Reliable network connectivity |
| The tools to use for hardware and software support are in file called resources.md |

### 2.3 Software Stack
 
| Layer | Technology | Version / Notes |
|-------|-----------|----------------|
| Operating System | Raspberry Pi OS Lite (64-bit, Trixie) | Headless, no desktop |
| Containerization | Docker + Docker Compose | Container orchestration |
| Web Server / Proxy | Nginx | Reverse proxy, TLS termination, static files |
| Backend API | Node.js + Express | REST API for all dashboard services |
| Frontend | React + Tailwind CSS | Mobile-first responsive dashboard |
| Time-Series DB | InfluxDB 2.x | ESP32 weather data storage |
| Relational DB | SQLite | User accounts, media metadata, system config |
| File Sharing | Samba (SMB) | LAN file access for NAS functionality |
| Camera Processing | FFmpeg + Motion / Frigate | RTSP ingest, recording, motion detection |
| Media Indexing | Custom indexer + FFprobe | Metadata extraction and search indexing |
| VPN / Tunnel | WireGuard or Cloudflare Tunnel | Secure remote access |

---

## 3. Functional Requirements

### 3.1 User Authentication & Access Control

The system shall support multi-user authentication with role-based access control to protect stored data and system configuration.

#### 3.1.1 Authentication

| Req ID | Requirement | Priority | Status |
|--------|------------|----------|--------|
| AUTH-001 | System shall support local user accounts with bcrypt-hashed passwords | P0 | Planned |
| AUTH-002 | Admin account created during initial setup wizard | P0 | Planned |
| AUTH-003 | JWT-based session tokens with configurable expiry (default 24h) | P0 | Planned |
| AUTH-004 | Optional two-factor authentication (TOTP) for admin accounts | P2 | Future |
| AUTH-005 | Brute-force protection: account lockout after 5 failed attempts (15 min cooldown) | P1 | Planned |
| AUTH-006 | Password complexity enforcement: minimum 8 chars, mixed case + number | P1 | Planned |

#### 3.1.2 Role-Based Access

| Role | NAS Files | Weather Data | Cameras | Media Library | System Admin |
|------|-----------|-------------|---------|--------------|-------------|
| Admin | Full CRUD | View + Config | View + Config | Full CRUD | Full Access |
| User | Own folder + Shared | View Only | View Only | Browse + Stream | None |
| Guest | Shared folder (read) | View Only | None | Browse Only | None |

---

### 3.2 Secure NAS Storage

Core file storage functionality with encryption, sharing, and backup capabilities.

#### 3.2.1 File Management

| Req ID | Requirement | Priority |
|--------|------------|----------|
| NAS-001 | Web-based file browser with upload, download, rename, move, and delete operations | P0 |
| NAS-002 | Drag-and-drop file upload with progress indicator (max 4GB per file via chunked upload) | P0 |
| NAS-003 | Folder creation, nested directory navigation with breadcrumb trail | P0 |
| NAS-004 | File preview for common types: images, PDF, text, markdown, video (thumbnail) | P1 |
| NAS-005 | SMB/Samba sharing for LAN access from Windows, macOS, and Linux desktops | P0 |
| NAS-006 | Per-user storage quotas configurable by admin (default: unlimited) | P2 |
| NAS-007 | Recycle bin with 30-day auto-purge for deleted files | P1 |
| NAS-008 | File versioning: keep last 3 versions of modified files | P2 |

#### 3.2.2 Security & Encryption

| Req ID | Requirement | Priority |
|--------|------------|----------|
| SEC-001 | LUKS full-disk encryption on external HDD storage volume | P0 |
| SEC-002 | TLS 1.3 for all web dashboard traffic (Let's Encrypt or self-signed) | P0 |
| SEC-003 | Samba shares accessible only with authenticated user credentials | P0 |
| SEC-004 | Automated encrypted backups to secondary USB drive (weekly, configurable) | P1 |
| SEC-005 | Firewall rules via ufw: only ports 443, 445 (SMB), 51820 (WireGuard) open | P0 |
| SEC-006 | Fail2ban integration for SSH and web login protection | P1 |

---

### 3.3 Custom Web Dashboard

A responsive, mobile-first web interface serving as the unified control center for all PiVault services.

#### 3.3.1 Dashboard Home Screen

The home screen provides an at-a-glance summary of system health and recent activity across all modules:

- **System health panel** — CPU temperature, RAM usage, disk usage (bar chart), uptime
- **Weather widget** — current conditions from ESP32 (temperature, humidity, pressure, wind)
- **Camera thumbnail grid** — live snapshot from each connected camera
- **Recent files panel** — last 10 files uploaded or modified
- **Quick-action buttons** — upload file, view cameras, browse media
- **Notification badge** — alerts for disk space warnings, camera disconnects, sensor anomalies

#### 3.3.2 Navigation & Layout

| Req ID | Requirement | Priority |
|--------|------------|----------|
| UI-001 | Responsive design: mobile-first with breakpoints at 640px, 768px, 1024px, 1280px | P0 |
| UI-002 | Sidebar navigation (collapsible on mobile) with icons: Dashboard, Files, Weather, Cameras, Media, Settings | P0 |
| UI-003 | Dark mode / light mode toggle with system preference detection | P1 |
| UI-004 | Loading skeletons for all async data fetches | P1 |
| UI-005 | Keyboard shortcuts for power users (Ctrl+U upload, Ctrl+K search) | P2 |
| UI-006 | PWA support: installable on mobile with offline-capable shell | P2 |

---

### 3.4 ESP32 Weather Station Integration

Real-time ingestion, storage, and visualization of environmental data from one or more ESP32 weather stations.

#### 3.4.1 Data Ingestion

| Req ID | Requirement | Priority |
|--------|------------|----------|
| WX-001 | REST API endpoint (`POST /api/weather/ingest`) accepting JSON payloads from ESP32 | P0 |
| WX-002 | MQTT broker (Mosquitto) as alternative ingestion path for low-power operation | P1 |
| WX-003 | API key authentication for ESP32 devices (unique key per station) | P0 |
| WX-004 | Data validation: reject out-of-range values (e.g., temp > 60°C, humidity > 100%) | P0 |
| WX-005 | Buffered writes to InfluxDB with 10-second batch interval | P1 |
| WX-006 | Support multiple stations with unique `station_id` identifiers | P1 |

#### 3.4.2 Sensor Data Schema

| Field | Type | Unit | Source Sensor |
|-------|------|------|--------------|
| `temperature` | float | °C / °F (user pref) | BME280 |
| `humidity` | float | % RH | BME280 |
| `pressure` | float | hPa / inHg | BME280 |
| `wind_speed` | float | km/h / mph | Anemometer |
| `wind_direction` | int | Degrees (0–360) | Wind vane |
| `rainfall` | float | mm / in (cumulative) | Tipping bucket |
| `uv_index` | float | UV Index (0–11+) | UV sensor (optional) |
| `battery_voltage` | float | Volts | ESP32 ADC |

#### 3.4.3 Weather Trend Visualization

The weather dashboard shall provide interactive charts for analyzing historical sensor data.

| Req ID | Requirement | Priority |
|--------|------------|----------|
| WX-010 | Real-time gauge widgets for current temperature, humidity, pressure, wind | P0 |
| WX-011 | Interactive time-series line charts (Recharts or Chart.js) with zoom and pan | P0 |
| WX-012 | Selectable time ranges: 1h, 6h, 24h, 7d, 30d, custom date range | P0 |
| WX-013 | Multi-metric overlay: plot temperature + humidity on same chart with dual Y-axes | P1 |
| WX-014 | Min/Max/Avg summary cards for selected time period | P1 |
| WX-015 | Data export: download selected range as CSV or JSON | P2 |
| WX-016 | Anomaly highlighting: flag readings that deviate >2 std deviations from rolling average | P2 |
| WX-017 | Wind rose diagram for wind direction distribution over selected period | P2 |

---

### 3.5 Security Camera System

Live monitoring, recording, and playback of IP camera feeds with motion detection capabilities.

#### 3.5.1 Camera Management

| Req ID | Requirement | Priority |
|--------|------------|----------|
| CAM-001 | Support 1–4 RTSP camera feeds simultaneously (limited by RPi 3B+ resources) | P0 |
| CAM-002 | Camera configuration UI: add/edit/remove cameras with RTSP URL, name, location | P0 |
| CAM-003 | Live view grid: 1x1, 2x2 layouts with click-to-fullscreen | P0 |
| CAM-004 | Low-latency live streaming via HLS or WebRTC to dashboard | P1 |
| CAM-005 | Camera health monitoring: online/offline status with last-seen timestamp | P1 |
| CAM-006 | Snapshot capture: manual button + scheduled snapshots (configurable interval) | P1 |

#### 3.5.2 Recording & Playback

| Req ID | Requirement | Priority |
|--------|------------|----------|
| CAM-010 | Continuous recording to HDD in 15-minute segment files (H.264 MP4) | P0 |
| CAM-011 | Motion-triggered recording with configurable sensitivity threshold | P1 |
| CAM-012 | Recording retention policy: configurable days (default 14), auto-delete oldest | P0 |
| CAM-013 | Timeline-based playback UI: scrub by date/time with thumbnail previews | P0 |
| CAM-014 | Event markers on timeline for motion-detected segments | P1 |
| CAM-015 | Clip export: select time range and download as MP4 | P1 |
| CAM-016 | Searchable event log: filter by camera, date range, motion events | P1 |

#### 3.5.3 Motion Detection & Alerts

- Configurable detection zones per camera (polygon mask in UI)
- Sensitivity slider: Low / Medium / High / Custom threshold
- Alert actions: dashboard notification, optional email or webhook
- Cool-down period between alerts (default: 60 seconds) to prevent spam
- Motion event thumbnails stored in database for quick browsing

---

### 3.6 Searchable Media Library

A searchable, browsable catalog of movies, music, and documents stored on the NAS with streaming playback.

#### 3.6.1 Media Indexing & Search

| Req ID | Requirement | Priority |
|--------|------------|----------|
| MED-001 | Auto-scan designated media folders on schedule (hourly) and on-demand | P0 |
| MED-002 | Extract metadata via FFprobe (video/audio) and file headers (documents) | P0 |
| MED-003 | Full-text search across: filename, folder path, extracted metadata tags | P0 |
| MED-004 | Filter by media type: Movies, TV Shows, Music, Documents, Photos | P0 |
| MED-005 | Sort options: name, date added, size, duration, rating | P1 |
| MED-006 | Thumbnail generation: video keyframes, album art extraction, document previews | P1 |
| MED-007 | Tag system: user-assignable tags for custom organization | P2 |

#### 3.6.2 Media Playback

| Req ID | Requirement | Priority |
|--------|------------|----------|
| MED-010 | In-browser video player (HTML5) with adaptive bitrate streaming | P0 |
| MED-011 | In-browser audio player with playlist support and queue management | P1 |
| MED-012 | Resume playback: remember last position for videos and audio | P1 |
| MED-013 | Subtitle support: .srt and .vtt files auto-detected alongside video files | P2 |
| MED-014 | Transcoding: on-the-fly conversion for unsupported formats via FFmpeg | P2 |
| MED-015 | Direct download option for any media file | P0 |

#### 3.6.3 Supported Media Formats

| Category | Supported Formats |
|----------|------------------|
| Video | MP4, MKV, AVI, MOV, WebM, FLV |
| Audio | MP3, FLAC, AAC, OGG, WAV, M4A |
| Documents | PDF, DOCX, XLSX, PPTX, TXT, MD, CSV |
| Images | JPEG, PNG, GIF, WebP, SVG, HEIC |

---

## 4. Non-Functional Requirements

### 4.1 Performance

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| Dashboard page load | < 3 seconds on LAN | Lighthouse performance audit |
| File upload throughput | > 10 MB/s on LAN (USB 2.0 bottleneck) | Timed transfer test |
| Weather data ingestion | < 500ms per POST request | API response time logging |
| Camera live view latency | < 2 seconds from real-time | Visual comparison test |
| Search response time | < 1 second for library < 10,000 items | Timed query test |
| Concurrent users | 3–5 simultaneous dashboard sessions | Load test with k6 |

### 4.2 Reliability & Availability

- Target uptime: 99% (allows ~3.65 days downtime/year for maintenance)
- Graceful shutdown on power loss via UPS signal (systemd integration)
- Docker container auto-restart policy: `unless-stopped`
- Health check endpoints for all services (`/api/health`)
- Watchdog timer: systemd monitors and restarts unresponsive containers

### 4.3 Storage & Data Retention

| Data Type | Retention Period | Storage Estimate |
|-----------|-----------------|-----------------|
| NAS user files | Indefinite (user-managed) | Dependent on HDD size |
| Weather sensor data | 1 year at full resolution, then downsampled to hourly | ~500 MB/year at 30s intervals |
| Camera recordings (continuous) | 14 days (configurable) | ~50 GB/camera/week at 1080p |
| Camera motion events | 90 days | ~5 GB/camera/month |
| Media library metadata | Indefinite | < 100 MB for 10,000 items |
| System logs | 30 days, rotated via logrotate | < 500 MB |

### 4.4 Security Requirements

- All web traffic encrypted via TLS 1.3 (HTTPS only, HTTP redirects to HTTPS)
- No default passwords; initial setup wizard forces password creation
- API endpoints authenticated via JWT; ESP32 endpoints via API key
- Regular security updates via `unattended-upgrades` (Debian/Raspbian)
- Docker images pinned to specific versions (no `:latest` tags in production)
- SSH access: key-based only, password auth disabled, non-standard port

### 4.5 UI Design Language — Neumorphism

The dashboard shall use a **neumorphic (soft UI)** design language, characterized by soft shadows, subtle depth, and extruded/inset elements on a uniform background. This applies to all cards, buttons, inputs, and navigation components.

| Resource | URL |
|----------|-----|
| Neumorphism Generator | https://neumorphism.io/#e0e0e0 |
| UI Component Reference | https://uiverse.io/elements |

| Req ID | Requirement | Priority |
|--------|------------|----------|
| UI-010 | All dashboard components shall follow neumorphic design principles: soft shadows, rounded corners, extruded/inset styling | P0 |
| UI-011 | Color palette based on muted, uniform backgrounds with shadow-driven depth (no hard borders) | P0 |
| UI-012 | Interactive elements (buttons, toggles, inputs) shall use inset/pressed states consistent with neumorphic style | P1 |

---

### 4.6 RPi 3B+ Resource Constraints

The Raspberry Pi 3B+ has significant hardware limitations that shape architectural decisions throughout this project. All features must be designed within these constraints.

| Constraint | Impact | Mitigation Strategy |
|-----------|--------|-------------------|
| 1 GB RAM | Limits concurrent services and transcoding | Lightweight containers, swap file (1GB), aggressive caching limits |
| USB 2.0 (480 Mbps) | ~35 MB/s max disk throughput | Sequential writes, chunked uploads, async operations |
| 100 Mbps effective Ethernet | LAN transfer ceiling | Compress where possible, limit concurrent streams |
| Quad-core 1.4 GHz ARM | CPU-bound for transcoding/encoding | Hardware-accelerated H.264 (GPU), pre-transcode media, limit to 1–2 camera streams |
| No hardware crypto | Encryption overhead on CPU | AES-NI absent; use lightweight ciphers where possible |
| microSD wear | Boot drive degradation over time | Move logs and databases to HDD, minimize SD writes |

---

## 5. API Specifications

All API endpoints are served under the `/api/v1` prefix via the Node.js + Express backend. Authentication is required unless noted.

### 5.1 API Endpoint Summary

| Method | Endpoint | Description | Auth |
|--------|---------|-------------|------|
| `POST` | `/api/v1/auth/login` | Authenticate user, return JWT | None |
| `POST` | `/api/v1/auth/refresh` | Refresh JWT token | JWT |
| `GET` | `/api/v1/files/*` | List directory / download file | JWT |
| `POST` | `/api/v1/files/upload` | Upload file (multipart/chunked) | JWT |
| `DELETE` | `/api/v1/files/*` | Delete file or folder | JWT |
| `POST` | `/api/v1/weather/ingest` | Receive ESP32 sensor data | API Key |
| `GET` | `/api/v1/weather/current` | Get latest weather readings | JWT |
| `GET` | `/api/v1/weather/history` | Query historical data (InfluxDB) | JWT |
| `GET` | `/api/v1/cameras` | List configured cameras | JWT |
| `GET` | `/api/v1/cameras/:id/stream` | HLS live stream URL | JWT |
| `GET` | `/api/v1/cameras/:id/recordings` | List recordings by date range | JWT |
| `GET` | `/api/v1/media/search` | Search media library | JWT |
| `GET` | `/api/v1/media/:id/stream` | Stream media file | JWT |
| `GET` | `/api/v1/system/health` | System health metrics | JWT (Admin) |

### 5.2 ESP32 Ingest Payload Example

```http
POST /api/v1/weather/ingest
Header: X-API-Key: <station_api_key>
Content-Type: application/json
```

```json
{
  "station_id": "wx-station-01",
  "timestamp": "2026-02-17T14:30:00Z",
  "temperature_c": 22.5,
  "humidity_pct": 65.2,
  "pressure_hpa": 1013.25,
  "wind_speed_kmh": 12.3,
  "wind_direction_deg": 225,
  "rainfall_mm": 0.0,
  "battery_v": 3.72
}
```

### 5.3 Weather Query Parameters

```http
GET /api/v1/weather/history?station=wx-station-01&from=2026-02-10T00:00:00Z&to=2026-02-17T23:59:59Z&fields=temperature,humidity&interval=5m
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `station` | string | Yes | Station ID to query |
| `from` | ISO 8601 | Yes | Start of time range |
| `to` | ISO 8601 | Yes | End of time range |
| `fields` | comma-separated | No | Specific fields (default: all) |
| `interval` | duration | No | Aggregation window: `1m`, `5m`, `1h`, `1d` (default: raw) |

---

## 6. Data Flow Diagrams

### 6.1 ESP32 Weather Data Flow

```
┌──────────────────┐      WiFi       ┌──────────────────┐      Validate     ┌──────────────┐
│  ESP32 + Sensors │ ──────────────▶ │  REST API        │ ────────────────▶ │  InfluxDB    │
│  (BME280, etc.)  │                 │  /api/v1/weather │                   │  Time-Series │
└──────────────────┘                 │  /ingest         │                   └──────┬───────┘
                                     └──────────────────┘                          │
       ┌───────────────────────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│  Dashboard Weather Panel                                      │
│  ┌────────────┐  ┌─────────────────┐  ┌───────────────────┐ │
│  │ Live Gauges│  │ Trend Charts    │  │ Export CSV/JSON   │ │
│  │ Temp/Humid │  │ Zoom/Pan/Range  │  │ Anomaly Alerts    │ │
│  └────────────┘  └─────────────────┘  └───────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

### 6.2 Camera Recording Pipeline

```
┌────────────────┐       RTSP        ┌─────────────────┐
│  IP Camera(s)  │ ────────────────▶ │  FFmpeg Ingest  │
└────────────────┘                   └────────┬────────┘
                                              │
                          ┌───────────────────┼───────────────────┐
                          ▼                   ▼                   ▼
                   ┌─────────────┐    ┌──────────────┐    ┌──────────────┐
                   │ HLS Live    │    │ Segment      │    │ Motion       │
                   │ Stream      │    │ Recorder     │    │ Detection    │
                   │ → Dashboard │    │ → HDD /recs  │    │ → Events DB  │
                   └─────────────┘    └──────────────┘    └──────┬───────┘
                                                                 │
                                                                 ▼
                                                          ┌──────────────┐
                                                          │ Alerts +     │
                                                          │ Thumbnails   │
                                                          └──────────────┘
```

### 6.3 Media Library Flow

```
┌──────────────────┐    Scan     ┌────────────────┐   Index    ┌─────────────┐
│  NAS Storage     │ ─────────▶ │ FFprobe /      │ ────────▶ │ SQLite      │
│  /media/*        │            │ Metadata       │           │ Media DB    │
└──────────────────┘            │ Extractor      │           └──────┬──────┘
                                └────────────────┘                  │
       ┌────────────────────────────────────────────────────────────┘
       ▼
┌──────────────────────────────────────────────────────────────┐
│  Dashboard Media Panel                                        │
│  ┌────────────┐  ┌─────────────────┐  ┌───────────────────┐ │
│  │ Search +   │  │ Browse Grid     │  │ HTML5 Player      │ │
│  │ Filters    │  │ + Thumbnails    │  │ Video / Audio     │ │
│  └────────────┘  └─────────────────┘  └───────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

---

## 7. Implementation Roadmap

Development is organized into four phases, each building on the previous. Each phase ends with a functional milestone that can be tested independently.

| Phase | Milestone | Key Deliverables | Est. Duration |
|-------|----------|-----------------|---------------|
| **Phase 1: Foundation** | Secure bootable NAS | RPi OS setup, LUKS encryption, Samba shares, Docker infrastructure, Nginx + TLS, user auth system | 2–3 weeks |
| **Phase 2: Dashboard + Weather** | Web UI with live weather | React dashboard shell, system health panel, ESP32 API endpoint, InfluxDB setup, weather gauges + trend charts | 3–4 weeks |
| **Phase 3: Cameras** | Camera recording + playback | RTSP ingest via FFmpeg, continuous recording, motion detection, timeline playback UI, event search | 3–4 weeks |
| **Phase 4: Media Library** | Searchable media catalog | File scanner + metadata extraction, search API, in-browser video/audio player, media browse UI | 2–3 weeks |

### 7.1 Phase 1 Detail: Foundation

- [x] Flash Raspberry Pi OS Lite (64-bit Trixie) to microSD
- [x] Configure headless access: SSH, WiFi, hostname (pivault)
- [x] Attach and format external USB HDD with LUKS encryption + ext4 (scripts/setup-luks.sh)
- [x] Configure auto-mount with `crypttab` and `fstab` (handled by setup-luks.sh)
- [x] Install Docker and Docker Compose; create project `docker-compose.yml`
- [ ] Deploy Samba container with authenticated user shares
- [ ] Deploy Nginx container with self-signed TLS (upgrade to Let's Encrypt later)
- [x] Build Node.js + Express API container with JWT authentication
- [x] Create initial SQLite database schema (users, sessions, config)
- [x] Deploy WireGuard for secure remote access (docker-compose.yml + scripts/setup-wireguard.sh)
- [x] Set up ufw firewall rules (scripts/setup-ufw.sh — Fail2ban pending)
- [ ] **Validate:** file upload/download via SMB and web, remote VPN access

### 7.2 Phase 2 Detail: Dashboard + Weather

- [x] Scaffold React + Tailwind frontend with Vite
- [x] Implement neumorphic design system (CSS tokens, utility classes)
- [x] Build reusable UI primitives (NeuCard, NeuButton, NeuInput, Skeleton)
- [x] Create dashboard layout shell (sidebar, topbar, responsive)
- [x] Implement dark/light theme toggle with system detection
- [x] Create placeholder pages for all 6 navigation sections
- [x] Build system health panel with live CPU, RAM, disk, uptime data
- [x] Create ESP32 weather ingest API endpoint (`POST /api/v1/weather/ingest`)
- [x] Set up SQLite time-series storage for weather data (InfluxDB optional upgrade path)
- [x] Build real-time weather gauge widgets (temperature, humidity, pressure, wind, rain)
- [x] Implement interactive trend charts with time range selection (1h/6h/24h/7d)
- [x] Add min/max/avg summary cards for weather data
- [x] Build weather data export (CSV/JSON)
- [x] Connect frontend to live API data (system health from Pi)
- [ ] **Validate:** weather data flows from ESP32 → API → SQLite → dashboard charts

---

## 8. Testing Strategy

| Test Type | Scope | Tools / Method |
|-----------|-------|---------------|
| Unit Tests | API route handlers, data validation, auth logic | Jest + Supertest |
| Integration Tests | ESP32 ingest pipeline, file upload flow, camera recording | Docker test environment, mock data |
| UI Tests | Dashboard rendering, navigation, responsive breakpoints | Playwright or Cypress |
| Performance Tests | Concurrent user load, file transfer speeds, API latency | k6 load testing, iperf3 |
| Security Tests | Auth bypass, injection, TLS config, open ports | OWASP ZAP, nmap, manual review |
| Hardware Stress | CPU/RAM under load, thermal throttling, SD card I/O | stress-ng, iotop, vcgencmd |

---

## 9. Risks & Mitigations

| Risk | Severity | Likelihood | Mitigation |
|------|----------|-----------|-----------|
| RPi 3B+ underpowered for concurrent camera streams + transcoding | High | High | Limit to 2 cameras at 720p for continuous recording; use sub-streams; defer transcoding |
| SD card corruption from excessive writes | High | Medium | Move all databases, logs, and Docker volumes to USB HDD; use tmpfs for `/tmp` |
| USB HDD failure / data loss | Critical | Low | Weekly encrypted backups to second drive; SMART monitoring with alerts |
| Power loss during write operations | High | Medium | UPS with GPIO shutdown signal; ext4 journaling; WAL mode for SQLite |
| ESP32 WiFi connectivity drops | Medium | Medium | Local data buffer on ESP32 (SPIFFS); retry logic; offline indicator on dashboard |
| Security breach via exposed port | Critical | Low | VPN-only remote access; no port forwarding; regular security audits |
| InfluxDB memory usage exceeds available RAM | High | Medium | Configure InfluxDB memory limits in Docker; aggressive downsampling policies |

---

## 10. Future Enhancements (Post-MVP)

The following features are out of scope for the initial release but are documented for future consideration:

- Upgrade path to Raspberry Pi 5 (4GB/8GB RAM, USB 3.0, PCIe NVMe)
- RAID-1 mirror with second USB drive for redundancy
- Home Assistant integration for ESP32 data and camera feeds
- AI-powered object detection on camera feeds (TensorFlow Lite)
- Plex or Jellyfin integration for richer media streaming experience
- Mobile push notifications via ntfy.sh or Pushover
- Automated SSL certificate renewal via Certbot + Let's Encrypt
- Multi-site support: sync data between two PiVault instances
- Voice control integration (Home Assistant + Alexa/Google)

---

## 11. Glossary

| Term | Definition |
|------|-----------|
| **RTSP** | Real Time Streaming Protocol — standard for streaming video from IP cameras |
| **HLS** | HTTP Live Streaming — adaptive bitrate streaming protocol for web delivery |
| **LUKS** | Linux Unified Key Setup — disk encryption standard for Linux |
| **JWT** | JSON Web Token — compact token format for stateless authentication |
| **InfluxDB** | Open-source time-series database optimized for IoT sensor data |
| **MQTT** | Message Queuing Telemetry Transport — lightweight IoT messaging protocol |
| **SMB/Samba** | Server Message Block — network file sharing protocol (Windows-compatible) |
| **FFmpeg** | Multimedia framework for recording, converting, and streaming audio/video |
| **TOTP** | Time-based One-Time Password — algorithm for two-factor authentication |
| **PWA** | Progressive Web App — web app installable on devices with offline support |
| **WireGuard** | Modern, lightweight VPN protocol for secure remote network access |

---

## 12. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-17 | Jeff | Initial FSD draft — all sections |
| | | | |

---

*END OF DOCUMENT*