bool pressed = false;
bool previousState = false;
int steps = 0;
int stepsMod = 0;
unsigned long lastDebounceTime = 0;
const unsigned long DEBOUNCE_DELAY = 50;

void setup() {
  Serial.begin(9600);
}

void loop() {
  int rawValue = analogRead(A1);
  bool currentRead = rawValue < 25;

  if (currentRead != pressed) {
    lastDebounceTime = millis();
    pressed = currentRead;
  }

  if ((millis() - lastDebounceTime) > DEBOUNCE_DELAY) {
    if (pressed != previousState) {
      previousState = pressed;
      Serial.println(pressed ? "La partie du pied appuie" : "RAS");
      stepsMod++;
      if (stepsMod % 2 == 0) {
        steps++;
        Serial.print("Pas : ");
        Serial.println(steps);
      }
    }
  }
}