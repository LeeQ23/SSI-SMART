#include <PZEM004Tv30.h>

/* 
 *  PZEM-004T Simple Test Code
 *  
 *  IMPORTANT: 
 *  1. DO NOT use GPIO 1 or 3 for the sensor. Those pins are used for sending 
 *     text to this Serial Monitor. If you use them, you will see nothing or garbage.
 *     
 *  2. CONNECTION GUIDE (Std ESP32):
 *     ESP32 GPIO 16 (RX2)  ----> PZEM TX  (Wire must cross!)
 *     ESP32 GPIO 17 (TX2)  ----> PZEM RX  (Wire must cross!)
 *     ESP32 5V (VIN)       ----> PZEM 5V  (3.3V will NOT work)
 *     ESP32 GND            ----> PZEM GND
 *     
 *  3. AC POWER:
 *     The PZEM will not read any data (and will say "Error") if it is not 
 *     connected to AC Main Power (110V/220V). It needs AC to wake up the measurement chip.
 */

#define PZEM_RX_PIN 16
#define PZEM_TX_PIN 17
#define PZEM_SERIAL Serial2

PZEM004Tv30 pzem(PZEM_SERIAL, PZEM_RX_PIN, PZEM_TX_PIN);

void setup() {
  // Use Serial for printing to PC
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("\n--- PZEM 4.0 Test Start ---");
  Serial.println("Assuming connections:");
  Serial.println("ESP32 Pin 16 (RX) -> PZEM TX");
  Serial.println("ESP32 Pin 17 (TX) -> PZEM RX");
  Serial.println("waiting for data...");
}

void loop() {
  float voltage = pzem.voltage();
  
  if(isnan(voltage)) {
    Serial.println("Error reading voltage. check:");
    Serial.println("1. Is AC Power connected to the PZEM?");
    Serial.println("2. Are wires crossed? (16->TX, 17->RX)");
    Serial.println("3. Is PZEM getting 5V?");
  } else {
    Serial.print("Voltage: "); Serial.print(voltage); Serial.println("V");
    Serial.print("Current: "); Serial.print(pzem.current()); Serial.println("A");
    Serial.print("Power:   "); Serial.print(pzem.power());   Serial.println("W");
    Serial.print("Energy:  "); Serial.print(pzem.energy());  Serial.println("kWh");
    Serial.print("Freq:    "); Serial.print(pzem.frequency()); Serial.println("Hz");
    Serial.print("PF:      "); Serial.println(pzem.pf());
    Serial.println("--------------------------------");
  }

  Serial.println();
  delay(2000);
}
