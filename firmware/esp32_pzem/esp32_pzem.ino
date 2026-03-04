#include <WiFi.h>
#include <HTTPClient.h>
#include <PZEM004Tv30.h>

// --- USER CONFIGURATION ---
const char* ssid = "YOUR_WIFI_SSID";          // Replace with your WiFi Name
const char* password = "YOUR_WIFI_PASSWORD";  // Replace with your WiFi Password
const char* serverUrl = "http://YOUR_VNC_IP:5003/api/machine-status"; // Updated Endpoint
const int machineId = 7; // Machine 200A1

// --- PIN DEFINITIONS & SERIAL ---
// ESP32 Serial2 defaults: RX=16, TX=17
#define PZEM_RX_PIN 16
#define PZEM_TX_PIN 17
#define PZEM_SERIAL Serial2

PZEM004Tv30 pzem(PZEM_SERIAL, PZEM_RX_PIN, PZEM_TX_PIN);

// --- VARIABLES ---
unsigned long lastSendTime = 0;
const unsigned long sendInterval = 1000; // Send every 5 seconds

void setup() {
  Serial.begin(115200);

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

    // JSON Payload
    // Format: {"current": 1.23}
    String jsonPayload = "{\"current\": " + String(current, 3) + ", \"machine_id\": " + String(machineId) + "}";
    
    Serial.print("Sending payload: ");
    Serial.println(jsonPayload);

    int httpResponseCode = http.POST(jsonPayload);

    if(httpResponseCode > 0){
      String response = http.getString();
      Serial.print("HTTP Response code: ");
      Serial.println(httpResponseCode);
    } else {
      Serial.print("Error on sending POST: ");
      Serial.println(httpResponseCode);
    }
    http.end();
  } else {
    Serial.println("Error: WiFi Disconnected");
  }
}
