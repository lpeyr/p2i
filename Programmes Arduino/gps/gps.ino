/* Include TinyGPS+ library. Be sure it is already installed in library manager ! */
#include <TinyGPSPlus.h>

/* The TinyGPSPlus object*/
TinyGPSPlus gps;

void setup() {
  /* open serial port with computer */
  Serial.begin(9600);
  /* open serial port with GPS board */
  Serial1.begin(9600);
}

void loop() {
  /* if data was received from GPS board */
  if (Serial1.available()) {
    /* do until all bytes received have been processed */
    while (Serial1.available()) {
      /* read byte */
      char c = Serial1.read();
      /* log byte */
      Serial.write(c);
      /* check if a complete valide frame was received */
      if (gps.encode(c)) displayGPSInfo();
    }
  }
}

void displayGPSInfo() {
  Serial.println("");
  Serial.print(F("Location: "));
  if (gps.location.isValid()) {
    Serial.print(gps.location.lat(), 6);
    Serial.print(F(","));
    Serial.print(gps.location.lng(), 6);
  } else {
    Serial.print(F("INVALID"));d
  }

  Serial.print(F("  Date/Time: "));
  if (gps.date.isValid()) {
    Serial.print(gps.date.month());
    Serial.print(F("/"));
    Serial.print(gps.date.day());
    Serial.print(F("/"));
    Serial.print(gps.date.year());
  } else {
    Serial.print(F("INVALID"));
  }

  Serial.print(F(" "));
  if (gps.time.isValid()) {
    if (gps.time.hour() < 10) Serial.print(F("0"));
    Serial.print(gps.time.hour());
    Serial.print(F(":"));
    if (gps.time.minute() < 10) Serial.print(F("0"));
    Serial.print(gps.time.minute());
    Serial.print(F(":"));
    if (gps.time.second() < 10) Serial.print(F("0"));
    Serial.print(gps.time.second());
    Serial.print(F("."));
    if (gps.time.centisecond() < 10) Serial.print(F("0"));
    Serial.print(gps.time.centisecond());
  } else {
    Serial.print(F("INVALID"));
  }

  Serial.println();
}
