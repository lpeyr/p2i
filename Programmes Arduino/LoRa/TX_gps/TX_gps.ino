#include <Arduino.h>
#include <SPI.h>
#include <LoRa.h>
#include <FastIMU.h>
#include <SensorFusion.h>
#include <Wire.h>
#include <math.h>
#include <TinyGPS++.h>

#define IMU_ADDRESS 0x68
#define NB_IMU        20
#define NB_FLEX_OCT   5
#define DELTA_SEND_MS 20000
#define FREQUENCY     862e6
#define LORA_SF            8
#define BW            125e3
#define CR            5
#define POWER         10
#define FLEXI1        A0
#define FLEXI2        A1
#define FLEXI3        A2
#define SEUIL         850
#define NB_MAX_ANGLE  1500
#define SIDE          "right"


typedef struct __attribute__((packed)) {
  uint8_t  identifiant;             // 1 octet
  uint32_t timestamp;               // 4 octets
  uint8_t  bits_f1[NB_FLEX_OCT];   // 5 octets
  uint8_t  bits_f2[NB_FLEX_OCT];   // 5 octets
  uint8_t  bits_f3[NB_FLEX_OCT];   // 5 octets
  uint16_t gps[2];                  // 4 octets — [0]=lat, [1]=lng
  int16_t  imu_acc[NB_IMU];         // 40 octets
} Trame_complet;
// Total: 64 octets


// --- Objets ---
Trame_complet trame;
MPU9250 IMU;
AccelData accelData;
GyroData gyroData;
MagData magData;
calData calib = {0};
SF fusion;
TinyGPSPlus gps;


// --- Vars globales ---
int           compteur           = 0;
unsigned long t_dernier_envoi    = 0;
int           nb_mesure_actuel   = 0;   // index flex  (0 .. NB_FLEX_OCT*8-1)
int           nbr_imu_acc_actuel = 0;   // index accel (0 .. NB_IMU-1)
int           nbr_imu_agl_actuel = 0;   // index angle (0 .. NB_MAX_ANGLE-1)
float         tabRoll[NB_MAX_ANGLE];
float         tabPitch[NB_MAX_ANGLE];
float         tabYaw[NB_MAX_ANGLE];
uint32_t      timestamp_first_angle = 0;
bool          firstAngleTimestampSet = false;


// ─── Utilitaires bits ────────────────────────────────────────────────────────
void setBit(uint8_t* tableau, int pos, bool valeur) {
  int octet = pos / 8;
  int bit   = pos % 8;
  if (valeur) tableau[octet] |=  (1 << bit);
  else        tableau[octet] &= ~(1 << bit);
}


// ─── GPS ─────────────────────────────────────────────────────────────────────
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
      char c = Serial1.read();
      if (gps.encode(c) && gps.location.isValid()) return true;
    }
  }
  return false;
}

void gpsVal() {
  bool gps_ok = lireGPS(5000);
  if (gps_ok) {
    trame.gps[0]    = (uint16_t)(gps.location.lat() * 100);
    trame.gps[1]    = (uint16_t)(gps.location.lng() * 100);
    trame.timestamp = gpsToTimestamp(gps.date, gps.time);
  }
}


// ─── Flex ────────────────────────────────────────────────────────────────────
void flexi_val() {
  bool val1 = analogRead(FLEXI1) < SEUIL;
  bool val2 = analogRead(FLEXI2) < SEUIL;
  bool val3 = analogRead(FLEXI3) < SEUIL;
  setBit(trame.bits_f1, nb_mesure_actuel, val1);
  setBit(trame.bits_f2, nb_mesure_actuel, val2);
  setBit(trame.bits_f3, nb_mesure_actuel, val3);
}


// ─── IMU — accélération ──────────────────────────────────────────────────────
void imuValAccel() {
  IMU.update();
  IMU.getAccel(&accelData);
  IMU.getGyro(&gyroData);
  IMU.getMag(&magData);

  float deltat = fusion.deltatUpdate();
  fusion.MadgwickUpdate(
    gyroData.gyroX * PI / 180.0f,
    gyroData.gyroY * PI / 180.0f,
    gyroData.gyroZ * PI / 180.0f,
    accelData.accelX, accelData.accelY, accelData.accelZ,
    magData.magX, magData.magY, magData.magZ,
    deltat
  );

  float roll  = fusion.getRoll()  * PI / 180.0f;
  float pitch = fusion.getPitch() * PI / 180.0f;

  float gravX =  sin(pitch) * 9.81f;
  float gravY = -cos(pitch) * sin(roll) * 9.81f;
  float gravZ = -cos(pitch) * cos(roll) * 9.81f;

  float linX = accelData.accelX - gravX;
  float linY = accelData.accelY - gravY;
  float linZ = accelData.accelZ - gravZ;

  float norme = sqrt(linX*linX + linY*linY + linZ*linZ);

  if (nbr_imu_acc_actuel < NB_IMU) {
    trame.imu_acc[nbr_imu_acc_actuel] = (int16_t)(norme * 100);
    nbr_imu_acc_actuel++;
  }
}


// ─── IMU — angles (stockage RAM uniquement) ───────────────────────────────────
void imuValAngle() {
  IMU.update();
  IMU.getAccel(&accelData);
  IMU.getGyro(&gyroData);
  IMU.getMag(&magData);

  float deltat = fusion.deltatUpdate();
  fusion.MadgwickUpdate(
    gyroData.gyroX * PI / 180.0f,
    gyroData.gyroY * PI / 180.0f,
    gyroData.gyroZ * PI / 180.0f,
    accelData.accelX, accelData.accelY, accelData.accelZ,
    magData.magX, magData.magY, magData.magZ,
    deltat
  );

  if (nbr_imu_agl_actuel < NB_MAX_ANGLE) {
    if (!firstAngleTimestampSet) {
      timestamp_first_angle = gpsToTimestamp(gps.date, gps.time);
      firstAngleTimestampSet = true;
    }
    tabRoll [nbr_imu_agl_actuel] = fusion.getRoll()  * PI / 180.0f;
    tabPitch[nbr_imu_agl_actuel] = fusion.getPitch() * PI / 180.0f;
    tabYaw  [nbr_imu_agl_actuel] = fusion.getYaw()   * PI / 180.0f;
    nbr_imu_agl_actuel++;
  }
}


// ─── Remplissage trame ───────────────────────────────────────────────────────
//
// Chronologie sur 20s :
//   t=0       → GPS (1 seule mesure, bloquante max 5s)
//   t=0..20s  → Flex  toutes les 500ms  → 40 mesures = NB_FLEX_OCT*8 bits
//   t=0..20s  → Accel toutes les 1000ms → 20 mesures = NB_IMU
//   compteur >= 15 (≈5min) :
//   t=0..20s  → Angle toutes les 100ms  → 200 val/trame, cumul jusqu'à 1250
//
void remplir_trame() {
  memset(&trame, 0, sizeof(trame));
  trame.identifiant  = 1;
  nbr_imu_acc_actuel = 0;
  nb_mesure_actuel   = 0;

  // 1) GPS — une seule mesure au début
  gpsVal();

  unsigned long t_debut      = millis();
  unsigned long t_last_flex  = t_debut;
  unsigned long t_last_accel = t_debut;
  unsigned long t_last_angle = t_debut;

  // 2) Boucle de collecte sur DELTA_SEND_MS (20s)
  while (millis() - t_debut < DELTA_SEND_MS) {
    unsigned long maintenant = millis();

    // Flex toutes les 500ms
    if (maintenant - t_last_flex >= 500 && nb_mesure_actuel < NB_FLEX_OCT * 8) {
      flexi_val();
      nb_mesure_actuel++;
      t_last_flex = maintenant;
    }

    // Accel toutes les 1000ms
    if (maintenant - t_last_accel >= 1000 && nbr_imu_acc_actuel < NB_IMU) {
      imuValAccel();
      t_last_accel = maintenant;
    }

    // Angles toutes les 100ms — après 5min (compteur>=15), jusqu'à NB_MAX_ANGLE
    if (compteur >= 15 && nbr_imu_agl_actuel < NB_MAX_ANGLE) {
      if (maintenant - t_last_angle >= 100) {
        imuValAngle();
        t_last_angle = maintenant;
      }
    }
  }
}


// ─── Envoi ───────────────────────────────────────────────────────────────────
void envoyerTrame() {
  remplir_trame();

  unsigned long t0 = micros();
  LoRa.beginPacket();
  LoRa.write((uint8_t*)&trame, sizeof(trame));
  bool ok = LoRa.endPacket();
  float duree_ms = (micros() - t0) / 1000.0;

  Serial.print("Paquet #"); Serial.print(compteur);
  Serial.print(" | "); Serial.print(sizeof(Trame_complet)); Serial.print(" octets");
  Serial.print(" | Temps TX : "); Serial.print(duree_ms, 2); Serial.print(" ms");
  Serial.print(" | Angles RAM : "); Serial.print(nbr_imu_agl_actuel); Serial.print("/"); Serial.print(NB_MAX_ANGLE);
  Serial.print(" | "); Serial.println(ok ? "OK ✓" : "ECHEC ✗");

  compteur++;
}


// ─── Setup ───────────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(9600);
  Serial1.begin(9600);  // GPS
  delay(3000);

  Serial.println("=== TX ===");
  Serial.print("Taille trame : "); Serial.print(sizeof(Trame_complet)); Serial.println(" octets");

  Wire.begin();
  int err = IMU.init(calib, IMU_ADDRESS);
  if (err) {
    Serial.print("ERREUR IMU : "); Serial.println(err);
    while (true);
  }
  Serial.println("IMU OK !");

  if (!LoRa.begin(FREQUENCY)) {
    Serial.println("ERREUR LoRa !");
    while (true);
  }
  LoRa.setTxPower(POWER);
  LoRa.setSpreadingFactor(LORA_SF);
  LoRa.setSignalBandwidth(BW);
  LoRa.setCodingRate4(CR);
  LoRa.setPreambleLength(8);
  Serial.println("LoRa OK !");

  envoyerTrame();
  t_dernier_envoi = millis();
}


// ─── Loop ────────────────────────────────────────────────────────────────────
void loop() {
  unsigned long maintenant = millis();

  if (maintenant - t_dernier_envoi >= DELTA_SEND_MS) {
    envoyerTrame();
    t_dernier_envoi = maintenant;
  }

    // Print angles si Serial branché
  if (Serial) {
    Serial.print("{\"side\":\"");
    Serial.print(side);
    Serial.print("\",\"timestamp\":");
    Serial.print(timestamp_first_angle);
    Serial.print(",\"roll\":[");
    for (int i = 0; i < nbr_imu_agl_actuel; i++) {
      Serial.print(tabRoll[i], 4);
      Serial.print(i < nbr_imu_agl_actuel - 1 ? "," : "");
    }
    Serial.print("],\"pitch\":[");
    for (int i = 0; i < nbr_imu_agl_actuel; i++) {
      Serial.print(tabPitch[i], 4);
      Serial.print(i < nbr_imu_agl_actuel - 1 ? "," : "");
    }
    Serial.print("],\"yaw\":[");
    for (int i = 0; i < nbr_imu_agl_actuel; i++) {
      Serial.print(tabYaw[i], 4);
      Serial.print(i < nbr_imu_agl_actuel - 1 ? "," : "");
    }
    Serial.println("]}");
  }
}