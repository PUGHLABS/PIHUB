#ifndef CONFIG_H
#define CONFIG_H

// ---- WiFi ----
#define WIFI_SSID "cleopatra 2.4"
#define WIFI_PASSWORD "Bullshit1!"

// ---- PiVault API ----
#define API_HOST "pivault.local"
#define API_PORT 3001
#define API_ENDPOINT "/api/v1/weather/ingest"
#define API_KEY "wx-station-01-key"

// ---- Station Identity ----
#define STATION_ID "wx-station-01"

// ---- BME280 I2C Pins ----
#define BME_SDA 21
#define BME_SCL 22
// Address auto-detected in initBME280() — 0x76 or 0x77

// ---- Rain Gauge (tipping bucket reed switch) ----
#define RAIN_PIN 17           // GPIO 17, reed switch to GND
#define RAIN_ML_PER_CLICK 4.0 // Millilitres per reed switch closure
#define RAIN_DEBOUNCE_MS 50   // Ignore bounces shorter than this

// ---- LED ----
#define LED_PIN 16            // Onboard blue LED (GPIO 16, active-low)
#define LED_FLASH_MS 300      // How long to blink on rain click

// ---- OTA ----
#define OTA_HOSTNAME "pivault-wx"  // mDNS name for OTA discovery
#define OTA_PASSWORD ""            // Set a password to require auth, or leave empty

// ---- Timing ----
#define POST_INTERVAL_MS 30000 // Send data every 30 seconds
#define RETRY_DELAY_MS 5000    // Wait before retry on failure

#endif
