#include <WiFi.h>
#include <HTTPClient.h>

// --- USER CONFIGURATION ---
const char* ssid = "slowbgt";          // Replace with your WiFi Name
const char* password = "YOUR_WIFI_PASSWORD";  // Replace with your WiFi Password
const char* serverUrl = "http://10.89.122.14:5003/api/signal"; // Updated Endpoint
const int machineId = 1; // Machine 200A1

// --- PIN DEFINITIONS ---
#define PIN_GOOD_SENSOR 18
#define PIN_NG_SENSOR   19

// --- VARIABLES ---
volatile bool goodTriggered = false;
volatile bool ngTriggered = false;

// Debouce handling
unsigned long lastGoodDebounce = 0;
unsigned long lastNgDebounce = 0;
const unsigned long debounceDelay = 2000; // ms

// --- INTERRUPT HANDLERS ---
void IRAM_ATTR handleGoodSensor() {
  if (millis() - lastGoodDebounce > debounceDelay) {
    goodTriggered = true;
    lastGoodDebounce = millis();
  }
}

void IRAM_ATTR handleNgSensor() {
  if (millis() - lastNgDebounce > debounceDelay) {
    ngTriggered = true;
    lastNgDebounce = millis();
  }
}

void setup() {
  Serial.begin(115200);

  // Pin Setup
  pinMode(PIN_GOOD_SENSOR, INPUT_PULLUP);
  pinMode(PIN_NG_SENSOR, INPUT_PULLUP);
  
  // Attach Interrupts
  attachInterrupt(digitalPinToInterrupt(PIN_GOOD_SENSOR), handleGoodSensor, FALLING);
  attachInterrupt(digitalPinToInterrupt(PIN_NG_SENSOR), handleNgSensor, FALLING);

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
  // Check flags
  if (goodTriggered) {
    sendSignal("good");
    goodTriggered = false;
  }
  
  if (ngTriggered) {
    sendSignal("ng");
    ngTriggered = false;
  }
  
  delay(100); // Small loop delay
}

void sendSignal(String type) {
  if(WiFi.status() == WL_CONNECTED){
    HTTPClient http;
    http.begin(serverUrl);
    http.addHeader("Content-Type", "application/json");

    // JSON Payload
    String jsonPayload = "{\"type\": \"" + type + "\", \"machine_id\": " + String(machineId) + "}";
    
    Serial.print("Sending signal: ");
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
