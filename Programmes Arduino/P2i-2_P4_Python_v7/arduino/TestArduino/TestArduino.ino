// LED_BUILTIN => 6 sur MKR, 13 sur UNO

// the setup function runs once when you press reset or power the board
void setup() {
  // initialize digital pin LED_BUILTIN as an output.
  pinMode(LED_BUILTIN, OUTPUT);

  // initialize serial communication at 9600 bits per second:
  //Serial.begin(9600);
  Serial.begin(115200);
}

const int FastBlinkDelay = 100; // ms

// the loop function runs over and over again forever
void loop() {

  Serial.println("ALLUMER");

  digitalWrite(LED_BUILTIN, HIGH);   // turn the LED on (HIGH is the voltage level)
  delay(2000);              // wait for a second

  Serial.println("ETEINDRE");

  digitalWrite(LED_BUILTIN, LOW);    // turn the LED off by making the voltage LOW
  delay(1000);              // wait for a second

  if (Serial.available() > 0) {


    int number = Serial.parseInt();
    if (Serial.read() == '\n') {

      Serial.print("CLIGNOTER ");
      Serial.print(number);
      Serial.println(" fois...");

      for (int i = 0; i < number; i++) {

        digitalWrite(LED_BUILTIN, HIGH);
        delay(FastBlinkDelay);

        digitalWrite(LED_BUILTIN, LOW);
        delay(FastBlinkDelay);
      }

    }

  }

}
