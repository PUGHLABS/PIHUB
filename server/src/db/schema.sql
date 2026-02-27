CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('admin', 'user', 'guest')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  token_hash TEXT NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Weather time-series storage (lightweight alternative to InfluxDB for RPi 3B+)
CREATE TABLE IF NOT EXISTS weather_readings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  station_id TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  temperature_c REAL,
  humidity_pct REAL,
  pressure_hpa REAL,
  wind_speed_kmh REAL,
  wind_direction_deg INTEGER,
  rain_daily_clicks INTEGER,
  battery_v REAL,
  received_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_weather_station_time
  ON weather_readings(station_id, received_at DESC);

-- Rain state persistence (survives server restarts)
CREATE TABLE IF NOT EXISTS rain_state (
  station_id TEXT PRIMARY KEY,
  daily_clicks INTEGER NOT NULL DEFAULT 0,
  last_reset TEXT NOT NULL,
  last_esp_clicks INTEGER
);
