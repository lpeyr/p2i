void setup() {
  // USB serial to PC (for u‑center)
  Serial.begin(9600);

  // Hardware serial to Grove GPS (D13 = RX, D14 = TX)
  Serial1.begin(9600);   // change if your GPS uses 4800, 57600, etc.
}

void loop() {
  // Forward all GPS data from Serial1 to USB Serial
  while (Serial1.available()) {
    Serial.write(Serial1.read());
  }

  // Optional: keep Arduino responsive
  delay(1);
}
