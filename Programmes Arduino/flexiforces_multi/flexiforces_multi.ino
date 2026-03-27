const int NUM_SENSORS = 2;
const int SENSOR_PINS[NUM_SENSORS] = { A0, A1 };
const int THRESHOLD = 25;
const unsigned long DEBOUNCE_DELAY = 50;

bool pressed[NUM_SENSORS] = { false };
bool previousState[NUM_SENSORS] = { false };
int steps[NUM_SENSORS] = { 0 };
int stepsMod[NUM_SENSORS] = { 0 };
unsigned long lastDebounceTime[NUM_SENSORS] = { 0 };

void setup() {
  Serial.begin(9600);
}

void loop() {
  for (int i = 0; i < NUM_SENSORS; i++) {
    bool currentRead = analogRead(SENSOR_PINS[i]) < THRESHOLD;

    if (currentRead != pressed[i]) {
      lastDebounceTime[i] = millis();
      pressed[i] = currentRead;
    }

    if ((millis() - lastDebounceTime[i]) > DEBOUNCE_DELAY) {
      if (pressed[i] != previousState[i]) {
        previousState[i] = pressed[i];

        Serial.print("Capteur A");
        Serial.print(i);
        Serial.println(pressed[i] ? " : appuie" : " : relâché");

        stepsMod[i]++;
        if (stepsMod[i] % 2 == 0) {
          steps[i]++;
          Serial.print("Pas capteur A");
          Serial.print(i);
          Serial.print(" : ");
          Serial.println(steps[i]);
        }
      }
    }
  }
}