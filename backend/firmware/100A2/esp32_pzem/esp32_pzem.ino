#include <WiFi.h>
#include <HTTPClient.h>
#include <PZEM004Tv30.h>
#include <time.h>

const char* ntpServer = "pool.ntp.org";
const long  gmtOffset_sec = 7 * 3600; // WIB (UTC+7)
const int   daylightOffset_sec = 0;

// --- USER CONFIGURATION ---
const char* ssid = "YOUR_WIFI_SSID";          // Replace with your WiFi Name
const char* password = "YOUR_WIFI_PASSWORD";  // Replace with your WiFi Password
const char* serverUrl = "http://192.168.1.200:5003/api/machine-status"; // Updated Endpoint
const int machineId = 6; // Machine 100A2

// --- PIN DEFINITIONS & SERIAL ---
// ESP32 Serial2 defaults: RX=16, TX=17
#define PZEM_RX_PIN 16
#define PZEM_TX_PIN 17
#define PZEM_SERIAL Serial2

PZEM004Tv30 pzem(PZEM_SERIAL, PZEM_RX_PIN, PZEM_TX_PIN);

// --- VARIABLES ---
unsigned long lastSendTime = 0;
const unsigned long sendInterval = 500; // Send every 500ms (2x per second)

void setup() {
  Serial.begin(115200);
  delay(100);
  Serial.println("\n=======================================================");
  Serial.println(String("Firmware compiled on: ") + __DATE__ + " " + __TIME__ + " WIB");
  Serial.println("=======================================================");

  // WiFi Connection
  Serial.println();
  Serial.print("Connecting to WiFi");
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi Connected");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());

  // Init NTP Time
  configTime(gmtOffset_sec, daylightOffset_sec, ntpServer);
  Serial.println("NTP Time Configured for WIB (UTC+7)");
}

void loop() {
  if (millis() - lastSendTime > sendInterval) {
    float voltage = pzem.voltage();
    float current = pzem.current();
    float power = pzem.power();
    float energy = pzem.energy();
    float frequency = pzem.frequency();
    float pf = pzem.pf();

    if (isnan(voltage)) {
        Serial.println("Error reading voltage");
    } else if (isnan(current)) {
        Serial.println("Error reading current");
    } else {
        Serial.print("Voltage: "); Serial.print(voltage); Serial.println("V");
        Serial.print("Current: "); Serial.print(current); Serial.println("A");
        Serial.print("Power: "); Serial.print(power); Serial.println("W");
        
        sendDataToServer(current);
    }
    
    lastSendTime = millis();
  }
}

void sendDataToServer(float current) {
  if(WiFi.status() == WL_CONNECTED){
    HTTPClient http;
    http.begin(serverUrl);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("x-api-key", "super_secret_key_ssi_2024"); // Added for security

    // JSON Payload
    // Format: {"current": 1.23}
    String jsonPayload = "{\"current\": " + String(current, 3) + ", \"machine_id\": " + String(machineId) + "}";
    
    Serial.print("Sending payload: ");
    Serial.println(jsonPayload);

    int httpResponseCode = http.POST(jsonPayload);

    if(httpResponseCode > 0){
      String response = http.getString();
      Serial.print("HTTP Response code: ");
      Serial.print(httpResponseCode);
      struct tm timeinfo;
      if (getLocalTime(&timeinfo, 100)) {
        char timeStringBuff[50];
        strftime(timeStringBuff, sizeof(timeStringBuff), "%b %d %Y %H:%M:%S WIB", &timeinfo);
        Serial.print(" [");
        Serial.print(timeStringBuff);
        Serial.println("]");
      } else {
        Serial.println();
      }
    } else {
      Serial.print("Error on sending POST: ");
      Serial.println(httpResponseCode);
    }
    http.end();
  } else {
    Serial.println("Error: WiFi Disconnected");
  }
}
