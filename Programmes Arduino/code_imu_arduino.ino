// Simulation stockage IMU 8 bytes sur MKR

const int MAX_SAMPLES = 600; // ajuste selon RAM dispo
int16_t dataBuffer[MAX_SAMPLES][4]; // 4 valeurs int16 = 8 bytes/sample
int indexWrite = 0;

unsigned long lastSampleTime = 0;
const int sampleRateMs = 20; // 50 Hz

void setup() {
  Serial.begin(115200);
  while (!Serial);

  Serial.println("Start IMU simulation...");
}

void loop() {

  // simulate IMU sampling rate
  if (millis() - lastSampleTime >= sampleRateMs) {
    lastSampleTime = millis();

    if (indexWrite < MAX_SAMPLES) {

      // -------------------------
      // SIMULATION DONNÉES IMU
      // -------------------------
      int16_t pitch = random(-3000, 3000);
      int16_t roll  = random(-3000, 3000);
      int16_t yaw   = random(-3000, 3000);
      int16_t t     = indexWrite;

      // -------------------------
      // STOCKAGE (8 bytes/sample)
      // -------------------------
      dataBuffer[indexWrite][0] = pitch;
      dataBuffer[indexWrite][1] = roll;
      dataBuffer[indexWrite][2] = yaw;
      dataBuffer[indexWrite][3] = t;

      indexWrite++;

    } else {
      Serial.println("Buffer full !");
      printData();
      while (1);
    }
  }
}

// ------------------------------------
// Affichage des données stockées
// ------------------------------------
void printData() {
  Serial.println("\n--- DATA DUMP ---");

  for (int i = 0; i < indexWrite; i++) {
    Serial.print(i);
    Serial.print(" | ");
    Serial.print(dataBuffer[i][0]);
    Serial.print(" ");
    Serial.print(dataBuffer[i][1]);
    Serial.print(" ");
    Serial.print(dataBuffer[i][2]);
    Serial.print(" ");
    Serial.println(dataBuffer[i][3]);
  }
}