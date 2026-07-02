#include <WiFi.h>
#include <HTTPClient.h>
#include <time.h>

const char* ntpServer = "pool.ntp.org";
const long  gmtOffset_sec = 7 * 3600; // WIB (UTC+7)
const int   daylightOffset_sec = 0;

// --- USER CONFIGURATION ---
const char* ssid = "slowbgt_plus";          // WiFi Name
const char* password = "ssci2019*";  // WiFi Password
const char* serverUrl = "http://192.168.1.200:5003/api/signal"; // Signal Endpoint
const int machineId = 7; // Machine 200A1

// --- PIN DEFINITIONS ---
const int PIN_GOOD = 14; 
const int PIN_NG   = 13; 

// --- DEBOUNCE SETTINGS ---
const int DEBOUNCE_DELAY = 1500; // 1.5 second blocking delay after trigger

// --- STATE VARIABLES ---
int queueGood = 0;
int queueNg   = 0;
bool lastGoodState = HIGH;
bool lastNgState   = HIGH;

// Retry Logic
unsigned long lastAttemptTime = 0;
const unsigned long RETRY_INTERVAL = 2000; // Wait 2s if send fails before retrying

void setup() {
  Serial.begin(115200);
  delay(100);
  Serial.println("\n=======================================================");
  Serial.println(String("Firmware compiled on: ") + __DATE__ + " " + __TIME__ + " WIB");
  Serial.println("=======================================================");

  // Pin Configuration: Internal Pullup
  // Active LOW logic (Connect to GND to trigger)
  pinMode(PIN_GOOD, INPUT_PULLUP);
  pinMode(PIN_NG,   INPUT_PULLUP);

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
    // Init NTP Time
    configTime(gmtOffset_sec, daylightOffset_sec, ntpServer);
    Serial.println("NTP Time Configured for WIB (UTC+7)");
  } else {
    Serial.println("WiFi NOT Connected (Offline Mode Active)");
  }
}

void loop() {
  // -------------------------------------------------
  // 1. INPUT DETECTION SECTION (Highest Priority)
  // -------------------------------------------------
  
  // Check Good Signal (Active LOW)
  if (digitalRead(PIN_GOOD) == LOW && lastGoodState == HIGH) {
    Serial.println("GOOD Triggered -> Added to Buffer");
    queueGood++; // Save to memory immediately
    delay(DEBOUNCE_DELAY); // Blocking debounce as requested
  }
  lastGoodState = digitalRead(PIN_GOOD);

  // Check NG Signal (Active LOW)
  if (digitalRead(PIN_NG) == LOW && lastNgState == HIGH) {
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
  http.addHeader("x-api-key", "super_secret_key_ssi_2024"); // Added for security

  // Payload: {"type": "good", "machine_id": 7}
  String jsonPayload = "{\"type\": \"" + type + "\", \"machine_id\": " + String(machineId) + "}";
  
  // Calculate remaining queue for debug logging
  int remaining = (type == "good") ? queueGood - 1 : queueNg - 1;
  Serial.print("Sending [" + type + "] (Queue Left: " + String(remaining) + ")... ");

  int httpResponseCode = http.POST(jsonPayload);
  bool success = false;

  if (httpResponseCode == 200) {
    struct tm timeinfo;
    if (getLocalTime(&timeinfo, 100)) {
      char timeStringBuff[50];
      strftime(timeStringBuff, sizeof(timeStringBuff), "%b %d %Y %H:%M:%S WIB", &timeinfo);
      Serial.print("OK [");
      Serial.print(timeStringBuff);
      Serial.println("]");
    } else {
      Serial.println("OK");
    }
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
