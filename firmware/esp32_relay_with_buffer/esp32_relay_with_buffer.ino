#include <WiFi.h>
#include <HTTPClient.h>

// --- USER CONFIGURATION ---
const char* ssid = "YOUR_WIFI_SSID";          // WiFi Name
const char* password = "YOUR_WIFI_PASSWORD";          // WiFi Password
const char* serverUrl = "http://YOUR_SERVER_IP:5003/api/signal"; // Signal Endpoint
const int machineId = 7; // Machine 200A1

// --- PIN DEFINITIONS ---
const int PIN_GOOD = 14; 
const int PIN_NG   = 13; 

// --- DEBOUNCE SETTINGS ---
const int DEBOUNCE_DELAY = 1500; // 1.5 second blocking delay after trigger

// --- STATE VARIABLES ---
int queueGood = 0;
int queueNg   = 0;
bool lastGoodState = LOW;
bool lastNgState   = LOW;

// Retry Logic
unsigned long lastAttemptTime = 0;
const unsigned long RETRY_INTERVAL = 2000; // Wait 2s if send fails before retrying

void setup() {
  Serial.begin(115200);

  // Pin Configuration: Internal Pulldown
  // Active HIGH logic (Connect to 3.3V to trigger)
  pinMode(PIN_GOOD, INPUT_PULLDOWN);
  pinMode(PIN_NG,   INPUT_PULLDOWN);

  // Static IP Configuration
  IPAddress local_IP(192, 168, 1, 115);
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
  
  // Non-blocking wait for initial connection
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 10) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  Serial.println("\nSystem Started");
  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("Static IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("WiFi NOT Connected (Offline Mode Active)");
  }
}

void loop() {
  // -------------------------------------------------
  // 1. INPUT DETECTION SECTION (Highest Priority)
  // -------------------------------------------------
  
  // Check Good Signal (Active HIGH)
  if (digitalRead(PIN_GOOD) == HIGH && lastGoodState == LOW) {
    Serial.println("GOOD Triggered -> Added to Buffer");
    queueGood++; // Save to memory immediately
    delay(DEBOUNCE_DELAY); // Blocking debounce as requested
  }
  lastGoodState = digitalRead(PIN_GOOD);

  // Check NG Signal (Active HIGH)
  if (digitalRead(PIN_NG) == HIGH && lastNgState == LOW) {
    Serial.println("NG Triggered -> Added to Buffer");
    queueNg++; // Save to memory immediately
    delay(DEBOUNCE_DELAY); // Blocking debounce as requested
  }
  lastNgState = digitalRead(PIN_NG);

  // -------------------------------------------------
  // 2. BACKGROUND SENDING SECTION
  // -------------------------------------------------
  
  // Only try to send if we have data queued AND we are not waiting for a retry timer
  if ((queueGood > 0 || queueNg > 0) && (millis() - lastAttemptTime > RETRY_INTERVAL)) {
    
    if (WiFi.status() == WL_CONNECTED) {
      bool success = false;
      
      // prioritize Good Queue
      if (queueGood > 0) {
        success = sendSignal("good");
        if (success) queueGood--; 
      } 
      // Else try NG Queue
      else if (queueNg > 0) {
        success = sendSignal("ng");
        if (success) queueNg--;
      }

      if (!success) {
        Serial.println("Send Failed -> Waiting before retry...");
        lastAttemptTime = millis(); // Set timer to wait 2s before trying again
      }
      
    } else {
      // WiFi disconnected
      Serial.println("WiFi Disconnected -> Trying to Reconnect...");
      WiFi.reconnect(); // Attempt to reconnect
      lastAttemptTime = millis(); // Don't spam reconnect attempts
    }
  }

  delay(10); // Processor yield
}

// Helper Function: returns TRUE if HTTP 200 OK, otherwise FALSE
bool sendSignal(String type) {
  HTTPClient http;
  http.begin(serverUrl);
  http.addHeader("Content-Type", "application/json");

  // Payload: {"type": "good", "machine_id": 7}
  String jsonPayload = "{\"type\": \"" + type + "\", \"machine_id\": " + String(machineId) + "}";
  
  // Calculate remaining queue for debug logging
  int remaining = (type == "good") ? queueGood - 1 : queueNg - 1;
  Serial.print("Sending [" + type + "] (Queue Left: " + String(remaining) + ")... ");

  int httpResponseCode = http.POST(jsonPayload);
  bool success = false;

  if (httpResponseCode == 200) {
    Serial.println("OK");
    success = true;
  } else {
    Serial.print("FAILED (Err: ");
    Serial.print(httpResponseCode);
    Serial.println(")");
    success = false;
  }
  http.end();
  return success;
}
