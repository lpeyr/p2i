#include <Arduino.h>
#include <MKRWAN.h>
#include <TinyGPSPlus.h>
#include <FastIMU.h>
#include <SensorFusion.h>
#include <Wire.h>
#include <math.h>

#define SECRET_APP_EUI  "221C221C221C221C"
#define SECRET_APP_KEY  "A1B2C3A1B2C3D4E5F6D4E5F677889900"

#define flexi1          A0
#define flexi2          A1
#define flexi3          A2
#define NB_MESURES      120
#define SEUIL           850

#define NB_GPS          6
#define DELTA_T_MS      500

#define GPS_TIMEOUT_MS  5000
#define DELTA_TIME_SEND 60000

#define IMU_ADDRESS     0x68
#define NB_IMU          40  

// --- Trame LoRa ---
typedef struct __attribute__((packed)) {
  uint32_t timestamp;           // 4  octets
  int32_t  gps_lat[NB_GPS];    // 24 octets
  int32_t  gps_lng[NB_GPS];    // 24 octets
  uint8_t  bits_f1[15];        // 15 octets
  uint8_t  bits_f2[15];        // 15 octets
  uint8_t  bits_f3[15];        // 15 octets
  uint16_t imu_acc[NB_IMU];    // 80 octets
} Tramet; // 177 octets

// --- Objets ---
LoRaModem modem;
TinyGPSPlus gps;
Tramet trame;
MPU9250 IMU;
AccelData accelData;
GyroData gyroData;
MagData magData;
calData calib = { 0 };
SF fusion;

// --- Compteurs ---
int nb_mesure_actuel = 0;
int nb_gps_actuel    = 0;
int nb_imu_actuel    = 0;
bool premier_envoie  = true;
unsigned long debut_nouvelle_mesure = 0;
float deltat;

// --- Fonctions utilitaires ---

void setBit(uint8_t* tableau, int pos, bool valeur) {
  int octet = pos / 8;
  int bit   = pos % 8;
  if (valeur) tableau[octet] |=  (1 << bit);
  else        tableau[octet] &= ~(1 << bit);
}

void clignote(int nb_fois, int duree_ms) {
  for (int i = 0; i < nb_fois; i++) {
    digitalWrite(LED_BUILTIN, HIGH);
    delay(duree_ms);
    digitalWrite(LED_BUILTIN, LOW);
    delay(duree_ms);
  }
}

uint32_t gpsToTimestamp(TinyGPSDate &d, TinyGPSTime &t) {
  uint16_t y   = d.year();
  uint8_t  m   = d.month();
  uint8_t  day = d.day();
  uint32_t days = (y - 1970) * 365UL + (y - 1969) / 4;
  uint8_t mdays[] = {31,28,31,30,31,30,31,31,30,31,30,31};
  for (int i = 0; i < m - 1; i++) days += mdays[i];
  days += day - 1;
  return days * 86400UL + t.hour() * 3600UL + t.minute() * 60UL + t.second();
}

bool lireGPS(unsigned long timeout_ms) {
  unsigned long debut = millis();
  while (millis() - debut < timeout_ms) {
    while (Serial1.available()) {
      if (gps.encode(Serial1.read())) {
        if (gps.location.isValid() && gps.date.isValid() && gps.time.isValid())
          return true;
      }
    }
  }
  return false;
}

void lireIMU() {
  IMU.update();
  IMU.getAccel(&accelData);
  IMU.getGyro(&gyroData);
  IMU.getMag(&magData);

  deltat = fusion.deltatUpdate();
  fusion.MadgwickUpdate(
    gyroData.gyroX * PI / 180.0f,
    gyroData.gyroY * PI / 180.0f,
    gyroData.gyroZ * PI / 180.0f,
    accelData.accelX, accelData.accelY, accelData.accelZ,
    magData.magX, magData.magY, magData.magZ,
    deltat
  );

  // Angles en radians
  float roll  = fusion.getRoll()  * PI / 180.0f;
  float pitch = fusion.getPitch() * PI / 180.0f;

  // Projection de la gravité via les angles
  float gravX =  sin(pitch)             * 9.81f;
  float gravY = -cos(pitch) * sin(roll) * 9.81f;
  float gravZ = -cos(pitch) * cos(roll) * 9.81f;

  // Soustraction gravité
  float linX = accelData.accelX - gravX;
  float linY = accelData.accelY - gravY;
  float linZ = accelData.accelZ - gravZ;

  float norme = sqrt(linX*linX + linY*linY + linZ*linZ);

  trame.imu_acc[nb_imu_actuel] = (uint16_t)(norme * 100);
  nb_imu_actuel++;
}

// --- Setup ---

void setup() {
  pinMode(flexi1, INPUT);
  pinMode(flexi2, INPUT);
  pinMode(flexi3, INPUT);
  pinMode(LED_BUILTIN, OUTPUT);
  digitalWrite(LED_BUILTIN, LOW);

  Serial.begin(9600);
  Serial1.begin(9600);

  // Init LoRaWAN
  bool lora_on = modem.begin(EU868);
  if (lora_on) Serial.println("Démarrage LoRaWAN ... OK");
  else         Serial.println("Démarrage LoRaWAN ... Echec");

  Serial.print("Device EUI: ");
  Serial.println(modem.deviceEUI());
  Serial.flush();

  bool connected = modem.joinOTAA(SECRET_APP_EUI, SECRET_APP_KEY);
  if (connected) {
    Serial.println(F("Connexion LoRaWAN ... OK"));
    clignote(1, 1000);
  } else {
    Serial.println(F("Connexion LoRaWAN ... Echec"));
    clignote(5, 100);
  }
  Serial.println(modem.getDevAddr());

  // Init IMU
  Wire.begin();
  Wire.setClock(400000);
  int err = IMU.init(calib, IMU_ADDRESS);
  if (err != 0) {
    Serial.print("Erreur init IMU: ");
    Serial.println(err);
    while (true);
  }
  IMU.setAccelRange(16);
  IMU.setGyroRange(2000);

  // Calibration IMU
  Serial.println("Mouvement en 8 svp...");
  delay(3000);
  IMU.calibrateMag(&calib);
  Serial.println("Mag OK !");
  delay(2000);
  Serial.println("Gardez l'IMU a plat...");
  delay(5000);
  IMU.calibrateAccelGyro(&calib);
  Serial.println("Calibration IMU OK !");
  delay(2000);
  IMU.init(calib, IMU_ADDRESS);
  IMU.setAccelRange(16);
  IMU.setGyroRange(2000);

  memset(&trame, 0, sizeof(trame));
}

// --- Loop ---

void loop() {
  // Lecture GPS toutes les 20 mesures (toutes les 10s)
  if (nb_mesure_actuel % 20 == 0 && nb_gps_actuel < NB_GPS) {
    Serial.print("GPS #"); Serial.print(nb_gps_actuel + 1); Serial.println(" ...");
    bool gps_ok = lireGPS(GPS_TIMEOUT_MS);

    if (gps_ok) {
      trame.gps_lat[nb_gps_actuel] = (int32_t)(gps.location.lat() * 1000000);
      trame.gps_lng[nb_gps_actuel] = (int32_t)(gps.location.lng() * 1000000);
      if (nb_gps_actuel == 0)
        trame.timestamp = gpsToTimestamp(gps.date, gps.time);
      Serial.print("  lat: "); Serial.print(gps.location.lat(), 6);
      Serial.print("  lng: "); Serial.println(gps.location.lng(), 6);
    } else {
      trame.gps_lat[nb_gps_actuel] = 0;
      trame.gps_lng[nb_gps_actuel] = 0;
      Serial.println("  GPS INVALIDE");
    }
    nb_gps_actuel++;
  }

  // Lecture IMU toutes les 3 mesures (toutes les 1.5s)
  if (nb_mesure_actuel % 3 == 0 && nb_imu_actuel < NB_IMU) {
    lireIMU();
    Serial.print("IMU #"); Serial.print(nb_imu_actuel);
    Serial.print(" → "); Serial.println(trame.imu_acc[nb_imu_actuel - 1] / 100.0f, 2);
  }

  // Lecture flexiforces
  bool val1 = analogRead(flexi1) < SEUIL;
  bool val2 = analogRead(flexi2) < SEUIL;
  bool val3 = analogRead(flexi3) < SEUIL;

  setBit(trame.bits_f1, nb_mesure_actuel, val1);
  setBit(trame.bits_f2, nb_mesure_actuel, val2);
  setBit(trame.bits_f3, nb_mesure_actuel, val3);

  Serial.print("Mesure "); Serial.print(nb_mesure_actuel + 1);
  Serial.print("/"); Serial.print(NB_MESURES);
  Serial.print(" → f1:"); Serial.print(val1);
  Serial.print(" f2:"); Serial.print(val2);
  Serial.print(" f3:"); Serial.println(val3);

  nb_mesure_actuel++;

  // Envoi après 120 mesures
  if (nb_mesure_actuel >= NB_MESURES) {
    if (premier_envoie || millis() - debut_nouvelle_mesure < DELTA_TIME_SEND) {
      delay(DELTA_TIME_SEND - (millis() - debut_nouvelle_mesure));
    }

    modem.setADR(false);
    modem.dataRate(4);
    modem.beginPacket();
    modem.write((uint8_t*)&trame, sizeof(trame));
    int err = modem.endPacket();

    if (err > 0) {
      Serial.println("=== Envoi OK ! ===");
      clignote(1, 500);
      premier_envoie = false;
    } else {
      Serial.print("Erreur d'envoi: ");
      Serial.println(err);
      clignote(3, 100);
    }

    memset(&trame, 0, sizeof(trame));
    nb_mesure_actuel = 0;
    nb_gps_actuel    = 0;
    nb_imu_actuel    = 0;
    debut_nouvelle_mesure = millis();
  }

  delay(DELTA_T_MS);
}