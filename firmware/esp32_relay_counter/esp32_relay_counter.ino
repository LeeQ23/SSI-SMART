#include <WiFi.h>
#include <HTTPClient.h>

// --- USER CONFIGURATION ---
const char* ssid = "YOUR_WIFI_SSID";          // WiFi Name
const char* password = "YOUR_WIFI_PASSWORD";          // WiFi Password
const char* serverUrl = "http://YOUR_VNC_IP:5003/api/signal"; // Signal Endpoint
const int machineId = 7; // Machine 200A1

// --- PIN DEFINITIONS ---
const int PIN_GOOD = 14; // Good Signal Relay Contact
const int PIN_NG   = 13; // NG Signal Relay Contact

// --- DEBOUNCE SETTINGS ---
const int DEBOUNCE_DELAY = 1500; // 1 second to ignore bounce

// --- STATE VARIABLES ---
bool lastGoodState = LOW;
bool lastNgState   = LOW;

void setup() {
  Serial.begin(115200);

  // Pin Configuration: Internal Pulldown
  // Relay connect to 3.3V, so pin reads LOW when open, HIGH when closed
  pinMode(PIN_GOOD, INPUT_PULLDOWN);
  pinMode(PIN_NG,   INPUT_PULLDOWN);

  // ... (WiFi setup remains same)
  // Static IP Configuration
  IPAddress local_IP(192, 168, 1, 160);
  IPAddress gateway(192, 168, 1, 1);
  IPAddress subnet(255, 255, 255, 0);
  IPAddress primaryDNS(192, 168, 1, 1); 

  if (!WiFi.config(local_IP, gateway, subnet, primaryDNS)) {
    Serial.println("STA Failed to configure");
  }

  // WiFi Connection
  Serial.println();
  Serial.print("Connecting to WiFi");
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi Connected");
  Serial.print("Static IP: ");
  Serial.println(WiFi.localIP());
}

void loop() {
  // 1. Check Good Signal (Active HIGH)
  if (digitalRead(PIN_GOOD) == HIGH && lastGoodState == LOW) {
    Serial.println("GOOD Triggered");
    sendSignal("good");
    delay(DEBOUNCE_DELAY); // Wait to prevent duplicates
  }
  lastGoodState = digitalRead(PIN_GOOD);

  // 2. Check NG Signal (Active HIGH)
  if (digitalRead(PIN_NG) == HIGH && lastNgState == LOW) {
    Serial.println("NG Triggered");
    sendSignal("ng");
    delay(DEBOUNCE_DELAY); // Wait to prevent duplicates
  }
  lastNgState = digitalRead(PIN_NG);

  delay(10); // Small delay for stability
}

// Function to send data to server
void sendSignal(String type) {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(serverUrl);
    http.addHeader("Content-Type", "application/json");

    // Payload: {"type": "good"} or {"type": "ng"}
    String jsonPayload = "{\"type\": \"" + type + "\", \"machine_id\": " + String(machineId) + "}";
    
    Serial.print("Sending signal: ");
    Serial.println(jsonPayload);

    int httpResponseCode = http.POST(jsonPayload);

    if (httpResponseCode > 0) {
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
