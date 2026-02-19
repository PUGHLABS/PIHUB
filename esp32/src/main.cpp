#include <Arduino.h>
#include <WiFi.h>
#include <ArduinoOTA.h>
#include <HTTPClient.h>
#include <Wire.h>
#include <Adafruit_BME280.h>
#include <ArduinoJson.h>
#include "config.h"

Adafruit_BME280 bme;

bool bmeReady = false;
unsigned long lastPostTime = 0;

// ---- Rain gauge (interrupt-driven) ----
volatile unsigned long rainClicks = 0;       // Total clicks since boot
volatile bool rainFlash = false;             // Signal main loop to blink LED
static unsigned long lastRainISR = 0;        // Debounce timestamp
static unsigned long clicksAtLastPost = 0;   // For delta calculation

void IRAM_ATTR rainISR() {
  unsigned long now = millis();
  if (now - lastRainISR > RAIN_DEBOUNCE_MS) {
    rainClicks++;
    rainFlash = true;
    lastRainISR = now;
  }
}

// ---- LED flash (non-blocking) ----
static unsigned long ledOffAt = 0;

void handleLedFlash() {
  if (rainFlash) {
    rainFlash = false;
    digitalWrite(LED_PIN, LOW);   // Active-low: LOW = on
    ledOffAt = millis() + LED_FLASH_MS;
    Serial.printf("[RAIN] Click! (total: %lu)\n", rainClicks);
  }
  if (ledOffAt && millis() >= ledOffAt) {
    digitalWrite(LED_PIN, HIGH);  // Active-low: HIGH = off
    ledOffAt = 0;
  }
}

// Battery voltage reading (ESP32 ADC on pin 34 for Wemos 18650 board)
float readBatteryVoltage() {
  int raw = analogRead(34);
  // Wemos 18650 has a voltage divider: multiply by 2, scale 3.3V over 4095 steps
  return (raw / 4095.0) * 3.3 * 2.0;
}

void connectWiFi() {
  Serial.printf("Connecting to WiFi: %s", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("\nConnected! IP: %s\n", WiFi.localIP().toString().c_str());
  } else {
    Serial.println("\nFailed to connect to WiFi!");
  }
}

void setupOTA() {
  ArduinoOTA.setHostname(OTA_HOSTNAME);

  const char* otaPw = OTA_PASSWORD;
  if (otaPw[0] != '\0') {
    ArduinoOTA.setPassword(otaPw);
  }

  ArduinoOTA.onStart([]() {
    Serial.println("[OTA] Update starting...");
  });
  ArduinoOTA.onEnd([]() {
    Serial.println("\n[OTA] Update complete! Rebooting...");
  });
  ArduinoOTA.onProgress([](unsigned int progress, unsigned int total) {
    Serial.printf("[OTA] %u%%\r", (progress * 100) / total);
  });
  ArduinoOTA.onError([](ota_error_t error) {
    Serial.printf("[OTA] Error %u: ", error);
    if (error == OTA_AUTH_ERROR) Serial.println("Auth failed");
    else if (error == OTA_BEGIN_ERROR) Serial.println("Begin failed");
    else if (error == OTA_CONNECT_ERROR) Serial.println("Connect failed");
    else if (error == OTA_RECEIVE_ERROR) Serial.println("Receive failed");
    else if (error == OTA_END_ERROR) Serial.println("End failed");
  });

  ArduinoOTA.begin();
  Serial.printf("[OTA] Ready — hostname: %s.local\n", OTA_HOSTNAME);
}

bool initBME280() {
  Wire.begin(BME_SDA, BME_SCL);

  if (bme.begin(BME_ADDRESS, &Wire)) {
    Serial.println("BME280 found!");

    bme.setSampling(
      Adafruit_BME280::MODE_FORCED,
      Adafruit_BME280::SAMPLING_X1,
      Adafruit_BME280::SAMPLING_X1,
      Adafruit_BME280::SAMPLING_X1,
      Adafruit_BME280::FILTER_OFF
    );
    return true;
  }

  Serial.printf("BME280 not found at 0x%02X! Check wiring.\n", BME_ADDRESS);
  return false;
}

void postWeatherData() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi disconnected, reconnecting...");
    connectWiFi();
    if (WiFi.status() != WL_CONNECTED) return;
  }

  bme.takeForcedMeasurement();

  float temperature = bme.readTemperature();
  float humidity = bme.readHumidity();
  float pressure = bme.readPressure() / 100.0;
  float battery = readBatteryVoltage();

  if (isnan(temperature) || isnan(humidity) || isnan(pressure)) {
    Serial.println("Invalid BME280 reading, skipping...");
    return;
  }

  unsigned long currentClicks = rainClicks;
  unsigned long deltaClicks = currentClicks - clicksAtLastPost;
  float rainMl = currentClicks * RAIN_ML_PER_CLICK;

  JsonDocument doc;
  doc["station_id"] = STATION_ID;
  doc["timestamp"] = "";
  doc["temperature_c"] = round(temperature * 10) / 10.0;
  doc["humidity_pct"] = round(humidity * 10) / 10.0;
  doc["pressure_hpa"] = round(pressure * 100) / 100.0;
  doc["wind_speed_kmh"] = 0;
  doc["wind_direction_deg"] = 0;
  doc["rainfall_ml"] = round(rainMl * 10) / 10.0;
  doc["rain_clicks"] = (long)currentClicks;
  doc["rain_delta_clicks"] = (long)deltaClicks;
  doc["battery_v"] = round(battery * 100) / 100.0;

  clicksAtLastPost = currentClicks;

  String json;
  serializeJson(doc, json);

  Serial.printf("Sending: %s\n", json.c_str());

  HTTPClient http;
  String url = String("http://") + API_HOST + ":" + API_PORT + API_ENDPOINT;
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-API-Key", API_KEY);

  int httpCode = http.POST(json);

  if (httpCode > 0) {
    Serial.printf("HTTP %d: %s\n", httpCode, http.getString().c_str());
  } else {
    Serial.printf("HTTP error: %s\n", http.errorToString(httpCode).c_str());
  }

  http.end();
}

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("\n=== PiVault Weather Station ===");
  Serial.printf("Station ID: %s\n", STATION_ID);

  // LED (active-low: HIGH = off)
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, HIGH);

  // Rain gauge: INPUT_PULLUP, trigger on falling edge (reed closes to GND)
  pinMode(RAIN_PIN, INPUT_PULLUP);
  delay(10);
  attachInterrupt(digitalPinToInterrupt(RAIN_PIN), rainISR, FALLING);
  Serial.printf("Rain gauge on GPIO %d (%.1f ml/click)\n", RAIN_PIN, RAIN_ML_PER_CLICK);

  connectWiFi();
  setupOTA();
  bmeReady = initBME280();

  if (bmeReady) {
    postWeatherData();
    lastPostTime = millis();
  }
}

void loop() {
  ArduinoOTA.handle();
  handleLedFlash();

  unsigned long now = millis();

  if (!bmeReady) {
    Serial.println("BME280 not available. Retrying...");
    bmeReady = initBME280();
    delay(RETRY_DELAY_MS);
    return;
  }

  if (now - lastPostTime >= POST_INTERVAL_MS) {
    postWeatherData();
    lastPostTime = now;
  }

  delay(10);
}
