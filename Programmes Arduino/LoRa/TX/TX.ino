#include <Arduino.h>
#include <SPI.h>
#include <LoRa.h>
#include <FastIMU.h>
#include <SensorFusion.h>
#include <Wire.h>
#include <math.h>
#include <TinyGPS++.h>
#include <SD.h>

#define IMU_ADDRESS         0x68
#define NB_IMU              20
#define NB_FLEX_OCT         5
#define DELTA_SEND_MS       20000
#define FREQUENCY           862e6
#define LORA_SF             8
#define BW                  125e3
#define CR                  5
#define POWER               10
#define FLEXI1              A0
#define FLEXI2              A3
#define FLEXI3              A6
#define SEUIL               850
#define NB_MAX_ANGLE        1500
#define SIDE                "right"
#define TRAME_DEB_MESURE_ANGLE 5
#define SD_CS_PIN           4
#define SD_FILE             "imu1.txt"
#define ANGLE_DELAY_MS      50   // 20 Hz

typedef struct __attribute__((packed)) {
  uint8_t  identifiant;
  uint32_t timestamp;
  uint8_t  bits_f1[NB_FLEX_OCT];
  uint8_t  bits_f2[NB_FLEX_OCT];
  uint8_t  bits_f3[NB_FLEX_OCT];
  int16_t  imu_acc[NB_IMU];
} Trame_complet;
// Total : 60 octets

// ─── Objets ───────────────────────────────────────────────────────────────────
Trame_complet trame;
MPU9250       IMU;
AccelData     accelData;
GyroData      gyroData;
MagData       magData;
calData       calib = {0};
SF            fusion;
TinyGPSPlus   gps;

// ─── SD ───────────────────────────────────────────────────────────────────────
bool sd_ok   = false;
bool sd_full = false;
File sdFile;

// ─── Vars globales ────────────────────────────────────────────────────────────
int           compteur              = 0;
unsigned long t_dernier_envoi       = 0;
int           nb_mesure_actuel      = 0;
int           nbr_imu_acc_actuel    = 0;
uint32_t      timestamp_first_angle = 0;
bool          firstAngleTimestampSet = false;
uint32_t      timestamp_angle_fail  = 0;

// ─── Utilitaires bits ─────────────────────────────────────────────────────────
void setBit(uint8_t* tableau, int pos, bool valeur) {
  int octet = pos / 8;
  int bit   = pos % 8;
  if (valeur) tableau[octet] |=  (1 << bit);
  else        tableau[octet] &= ~(1 << bit);
}

// ─── Float → string 2 décimales (fiable SAMD) ────────────────────────────────
String ftos(float v) {
  char buf[12];
  bool  negatif = (v < 0);
  float abs_v   = negatif ? -v : v;
  int   entier  = (int)abs_v;
  int   dec     = (int)((abs_v - (float)entier) * 100.0f + 0.5f);
  if (dec >= 100) { entier++; dec -= 100; }
  if (negatif) snprintf(buf, sizeof(buf), "-%d.%02d", entier, dec);
  else         snprintf(buf, sizeof(buf), "%d.%02d",  entier, dec);
  return String(buf);
}

// ─── GPS ──────────────────────────────────────────────────────────────────────
// FIX : gestion années bissextiles
uint32_t gpsToTimestamp(TinyGPSDate &d, TinyGPSTime &t) {
  uint16_t y   = d.year();
  uint8_t  m   = d.month();
  uint8_t  day = d.day();
  uint32_t days = 0;
  for (uint16_t yr = 1970; yr < y; yr++) {
    bool biss = (yr % 4 == 0 && yr % 100 != 0) || (yr % 400 == 0);
    days += biss ? 366 : 365;
  }
  bool biss = (y % 4 == 0 && y % 100 != 0) || (y % 400 == 0);
  uint8_t mdays[] = {31, (uint8_t)(biss ? 29 : 28), 31, 30, 31, 30, 31, 31, 30, 31, 30, 31};
  for (int i = 0; i < m - 1; i++) days += mdays[i];
  days += day - 1;
  return days * 86400UL + t.hour() * 3600UL + t.minute() * 60UL + t.second();
}

void lireGPSDisponible() {
  while (Serial1.available()) gps.encode(Serial1.read());
}

// FIX : ne bloque que si pas encore de fix GPS
void gpsVal() {
  if (!gps.location.isValid()) {
    unsigned long debut = millis();
    while (millis() - debut < 5000) {
      while (Serial1.available()) {
        if (gps.encode(Serial1.read()) && gps.location.isValid()) break;
      }
      if (gps.location.isValid()) break;
    }
  }
  if (gps.location.isValid()) {
    trame.timestamp = gpsToTimestamp(gps.date, gps.time);
  }
}

// ─── Flex ─────────────────────────────────────────────────────────────────────
void flexi_val() {
  bool val1 = analogRead(FLEXI1) > SEUIL;
  bool val2 = analogRead(FLEXI2) > SEUIL;
  bool val3 = analogRead(FLEXI3) > SEUIL;
  setBit(trame.bits_f1, nb_mesure_actuel, val1);
  setBit(trame.bits_f2, nb_mesure_actuel, val2);
  setBit(trame.bits_f3, nb_mesure_actuel, val3);
}

// ─── IMU : mise à jour commune ────────────────────────────────────────────────
// FIX : un seul update IMU+fusion par cycle pour éviter la double mise à jour
void imuUpdate() {
  IMU.update();
  IMU.getAccel(&accelData);
  IMU.getGyro(&gyroData);
  IMU.getMag(&magData);

  float deltat = fusion.deltatUpdate();
  fusion.MadgwickUpdate(
    gyroData.gyroX  * PI / 180.0f,
    gyroData.gyroY  * PI / 180.0f,
    gyroData.gyroZ  * PI / 180.0f,
    accelData.accelX, accelData.accelY, accelData.accelZ,
    magData.magX,     magData.magY,     magData.magZ,
    deltat
  );
}

void imuValAccel() {
  float roll  = fusion.getRoll()  * PI / 180.0f;
  float pitch = fusion.getPitch() * PI / 180.0f;

  float gravX =  sin(pitch) * 9.81f;
  float gravY = -cos(pitch) * sin(roll) * 9.81f;
  float gravZ = -cos(pitch) * cos(roll) * 9.81f;

  float linX  = accelData.accelX - gravX;
  float linY  = accelData.accelY - gravY;
  float linZ  = accelData.accelZ - gravZ;
  float norme = sqrt(linX*linX + linY*linY + linZ*linZ);

  if (nbr_imu_acc_actuel < NB_IMU) {
    trame.imu_acc[nbr_imu_acc_actuel] = (int16_t)(norme * 100);
    nbr_imu_acc_actuel++;
  }
}

// ─── IMU — angles → SD ────────────────────────────────────────────────────────
void imuValAngle() {
  if (!firstAngleTimestampSet) {
    if (gps.date.isValid() && gps.time.isValid()) {
      uint32_t offset = (timestamp_angle_fail > 0) ? (millis() - timestamp_angle_fail) / 1000 : 0;
      timestamp_first_angle = gpsToTimestamp(gps.date, gps.time) - offset;
      firstAngleTimestampSet = true;
    } else if (timestamp_angle_fail == 0) {
      timestamp_angle_fail = millis();
    }
  }

  float roll  = fusion.getRoll()  * PI / 180.0f;
  float pitch = fusion.getPitch() * PI / 180.0f;
  float yaw   = fusion.getYaw()   * PI / 180.0f;

  if (sd_ok && !sd_full && sdFile) {
    sdFile.print(ftos(yaw));   sdFile.print(";");
    sdFile.print(ftos(pitch)); sdFile.print(";");
    sdFile.println(ftos(roll));
    sdFile.flush();
  }
}

// ─── Init SD ──────────────────────────────────────────────────────────────────
void initSD() {
  Serial.print("Init SD... ");
  if (!SD.begin(SD_CS_PIN)) {
    Serial.println("ECHEC — logs SD desactives.");
    sd_ok = false;
    return;
  }
  if (SD.exists(SD_FILE)) SD.remove(SD_FILE);
  sdFile = SD.open(SD_FILE, FILE_WRITE);
  if (!sdFile) {
    Serial.println("ECHEC ouverture fichier — logs SD desactives.");
    sd_ok = false;
    return;
  }
  sdFile.println("yaw;pitch;roll");
  sdFile.flush();
  sd_ok = true;
  Serial.println("OK → " SD_FILE);
}

// ─── Remplissage trame ────────────────────────────────────────────────────────
void remplir_trame() {
  memset(&trame, 0, sizeof(trame));
  trame.identifiant  = 1;
  nbr_imu_acc_actuel = 0;
  nb_mesure_actuel   = 0;

  gpsVal();

  unsigned long t_debut      = millis();
  unsigned long t_last_flex  = t_debut;
  unsigned long t_last_accel = t_debut;
  unsigned long t_last_angle = t_debut;

  while (millis() - t_debut < DELTA_SEND_MS) {
    unsigned long maintenant = millis();

    // FIX : un seul update IMU+fusion par tour de boucle
    lireGPSDisponible();
    imuUpdate();

    if (maintenant - t_last_flex >= 500 && nb_mesure_actuel < NB_FLEX_OCT * 8) {
      flexi_val();
      nb_mesure_actuel++;
      t_last_flex = maintenant;
    }

    if (maintenant - t_last_accel >= 1000 && nbr_imu_acc_actuel < NB_IMU) {
      imuValAccel();
      t_last_accel = maintenant;
    }

    if (compteur >= TRAME_DEB_MESURE_ANGLE && !sd_full) {
      if (maintenant - t_last_angle >= ANGLE_DELAY_MS) {
        imuValAngle();
        t_last_angle = maintenant;
      }
    }
  }
}

// ─── Envoi LoRa ───────────────────────────────────────────────────────────────
void envoyerTrame() {
  remplir_trame();

  unsigned long t0 = micros();
  LoRa.beginPacket();
  LoRa.write((uint8_t*)&trame, sizeof(trame));
  bool ok = LoRa.endPacket();
  float duree_ms = (micros() - t0) / 1000.0f;

  Serial.println("─────────────────────────────────────────");
  Serial.print("Paquet #");        Serial.println(compteur);
  Serial.print("Taille trame : "); Serial.print(sizeof(Trame_complet)); Serial.println(" octets");
  Serial.print("Temps TX     : "); Serial.print(duree_ms, 2); Serial.println(" ms");
  Serial.print("Statut       : "); Serial.println(ok ? "OK ✓" : "ECHEC ✗");
  Serial.print("SD           : ");
  if (!sd_ok)       Serial.println("non disponible");
  else if (sd_full) Serial.println("PLEINE");
  else { Serial.print("OK — "); Serial.print(sdFile.size()); Serial.println(" octets ecrits"); }

  Serial.print("{\"side\":\"");   Serial.print(SIDE);
  Serial.print("\",\"timestamp\":"); Serial.print(timestamp_first_angle);
  Serial.print(",\"angles\":\"voir "); Serial.print(SD_FILE);
  Serial.println("\"}");
  Serial.println("─────────────────────────────────────────");

  compteur++;
}

// ─── Setup ────────────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(9600);
  Serial1.begin(9600);
  delay(3000);

  Serial.println("=== TX GPS + SD Logger ===");
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

  initSD();

  envoyerTrame();
  t_dernier_envoi = millis();
}

// ─── Loop ─────────────────────────────────────────────────────────────────────
void loop() {
  unsigned long maintenant = millis();
  if (maintenant - t_dernier_envoi >= DELTA_SEND_MS) {
    envoyerTrame();
    t_dernier_envoi = maintenant;
  }
}