// FlexiForce raw value test

#define PIN_FLEXI1 A0
#define PIN_FLEXI2 A1
#define PIN_FLEXI3 A2

void setup() {
  Serial.begin(9600);
}

void loop() {
  int flexi1 = analogRead(PIN_FLEXI1);
  int flexi2 = analogRead(PIN_FLEXI2);
  int flexi3 = analogRead(PIN_FLEXI3);

  Serial.print(" ");
  Serial.print(flexi1);

  Serial.print(" | ");
  Serial.print(flexi2);

  Serial.print(" | ");
  Serial.println(flexi3);

  delay(200);
}