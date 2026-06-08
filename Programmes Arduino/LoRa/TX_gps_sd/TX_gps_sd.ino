#include <Keyboard.h>
#include <KeyboardLayout.h>
#include <Keyboard_da_DK.h>
#include <Keyboard_de_DE.h>
#include <Keyboard_es_ES.h>
#include <Keyboard_fr_FR.h>
#include <Keyboard_hu_HU.h>
#include <Keyboard_it_IT.h>
#include <Keyboard_pt_PT.h>
#include <Keyboard_sv_SE.h>

#include <Arduino.h>
#include <SPI.h>
#include <LoRa.h>
#include <FastIMU.h>
#include <SensorFusion.h>
#include <Wire.h>
#include <math.h>
#include <TinyGPSPlus.h>
#include <SD.h>

// ─── Activer pour calibrer (commenter pour la course) ─────────────────────────
#define PERFORM_CALIBRATION

#define IMU_ADDRESS            0x68
#define NB_IMU                 20
#define NB_FLEX_OCT            5
#define DELTA_SEND_MS          20000
#define FREQUENCY              862e6
#define LORA_SF                8
#define BW                     125e3
#define CR                     5
#define POWER                  10
#define FLEXI1                 A3
#define FLEXI2                 A0
#define FLEXI3                 A6
#define SEUIL1                 500
#define SEUIL2                 400
#define SEUIL3                 500
#define SIDE                   "left"
#define TRAME_DEB_MESURE_ANGLE 0
#define SD_CS_PIN              4
#define SD_FILE                "imu.txt"
#define ANGLE_DELAY_MS         50
#define IMU_UPDATE_MS          10
#define IMU_WARMUP_MS          3000   // 3s de préchauffage Madgwick

typedef struct __attribute__((packed)) {
  uint8_t  identifiant;
  uint32_t timestamp;
  uint8_t  bits_f1[NB_FLEX_OCT];
  uint8_t  bits_f2[NB_FLEX_OCT];
  uint8_t  bits_f3[NB_FLEX_OCT];
  float gps[2];
  int16_t  imu_acc[NB_IMU];
} Trame_complet;

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
File sdFile;

// ─── Vars globales ────────────────────────────────────────────────────────────
int           compteur               = 0;
unsigned long t_dernier_envoi        = 0;
int           nb_mesure_actuel       = 0;
int           nbr_imu_acc_actuel     = 0;
uint32_t      timestamp_first_angle  = 0;
bool          firstAngleTimestampSet = false;
uint32_t      timestamp_angle_fail   = 0;

// ─── Utilitaires bits ─────────────────────────────────────────────────────────
void setBit(uint8_t* tableau, int pos, bool valeur) {
  int octet = pos / 8;
  int bit   = pos % 8;
  if (valeur) tableau[octet] |=  (1 << bit);
  else        tableau[octet] &= ~(1 << bit);
}

// ─── GPS ──────────────────────────────────────────────────────────────────────
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

void gpsVal() {
  if (gps.location.isValid()) {
    trame.gps[0] = gps.location.lat();
    trame.gps[1] = gps.location.lng();
  } else {
    Serial.println("GPS: INVALID");
  }

  Serial.print(F("Location: "));
  if (gps.location.isValid()) {
    Serial.print(gps.location.lat(), 6);
    Serial.print(F(","));
    Serial.print(gps.location.lng(), 6);
  } else {
    Serial.print(F("INVALID"));
  }

  Serial.print(F("  Date/Time: "));
  if (gps.date.isValid()) {
    Serial.print(gps.date.month()); Serial.print(F("/"));
    Serial.print(gps.date.day());   Serial.print(F("/"));
    Serial.print(gps.date.year());
  } else {
    Serial.print(F("INVALID"));
  }

  Serial.print(F(" "));
  if (gps.time.isValid()) {
    if (gps.time.hour()   < 10) Serial.print(F("0"));
    Serial.print(gps.time.hour());   Serial.print(F(":"));
    if (gps.time.minute() < 10) Serial.print(F("0"));
    Serial.print(gps.time.minute()); Serial.print(F(":"));
    if (gps.time.second() < 10) Serial.print(F("0"));
    Serial.print(gps.time.second());
  } else {
    Serial.print(F("INVALID"));
  }
  Serial.println();
}

// ─── Flex ─────────────────────────────────────────────────────────────────────
void flexi_val() {
  bool val1 = analogRead(FLEXI1) > SEUIL1;
  bool val2 = analogRead(FLEXI2) > SEUIL2;
  bool val3 = analogRead(FLEXI3) > SEUIL3;
  setBit(trame.bits_f1, nb_mesure_actuel, val1);
  setBit(trame.bits_f2, nb_mesure_actuel, val2);
  setBit(trame.bits_f3, nb_mesure_actuel, val3);
}

// ─── IMU update ───────────────────────────────────────────────────────────────
void imuUpdate() {
  IMU.update();
  IMU.getAccel(&accelData);
  IMU.getGyro(&gyroData);
  IMU.getMag(&magData);

  float deltat = fusion.deltatUpdate();
  if (deltat < 0.001f || deltat > 1.0f) return;

  fusion.MadgwickUpdate(
    gyroData.gyroX * PI / 180.0f,
    gyroData.gyroY * PI / 180.0f,
    gyroData.gyroZ * PI / 180.0f,
    accelData.accelX, accelData.accelY, accelData.accelZ,
    deltat
  );
}

// ─── Préchauffage Madgwick (appelé une seule fois au boot) ───────────────────
void imuWarmup() {
  Serial.print("Prechauffage Madgwick ");
  unsigned long t0   = millis();
  unsigned long last = t0;
  while (millis() - t0 < IMU_WARMUP_MS) {
    if (millis() - last >= IMU_UPDATE_MS) {
      imuUpdate();
      last = millis();
    }
  }
  Serial.println("OK !");
}

// ─── IMU — accélération──────────────────────────────────────────────
void imuValAccel() {
  float linX  = accelData.accelX;
  float linY  = accelData.accelY;
  float linZ  = accelData.accelZ;
  float norme = sqrt(linX*linX + linY*linY + linZ*linZ);

  if (nbr_imu_acc_actuel < NB_IMU) {
    trame.imu_acc[nbr_imu_acc_actuel] = (int16_t)(norme * 100);
    nbr_imu_acc_actuel++;
  }
}

// ─── IMU — angles → SD (en degrés) ───────────────────────────────────────────
void imuValAngle() {

  float roll  = fusion.getRoll();
  float pitch = fusion.getPitch();
  float yaw   = fusion.getYaw();

   if (sd_ok) {
    sdFile.print(millis());         sdFile.print(";");
    sdFile.print(yaw,   2);         sdFile.print(";");  // plus de String()
    sdFile.print(pitch, 2);         sdFile.print(";");
    sdFile.println(roll, 2);
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

  // Réinitialisation : supprime l'ancien fichier s'il existe
  if (SD.exists(SD_FILE)) SD.remove(SD_FILE);

  // Ouvre et écrit l'en-tête
  sdFile = SD.open(SD_FILE, FILE_WRITE);
  if (!sdFile) {
    Serial.println("ECHEC ouverture fichier.");
    sd_ok = false;
    return;
  }

  sdFile.println("timestamp;yaw;pitch;roll");
  sdFile.flush(); // Sauvegarde l'en-tête immédiatement
  sd_ok = true;
  Serial.println("OK → " SD_FILE);
  Serial.print("Fichier valide apres init : ");
  Serial.println(sdFile ? "OUI" : "NON"); 
}

// ─── Remplissage trame ────────────────────────────────────────────────────────
void remplir_trame() {
  memset(&trame, 0, sizeof(trame));
  trame.identifiant  = 1;
  nbr_imu_acc_actuel = 0;
  nb_mesure_actuel   = 0;

  

  unsigned long t_debut      = millis();
  unsigned long t_last_flex  = t_debut;
  unsigned long t_last_accel = t_debut - 1000;
  unsigned long t_last_angle = t_debut;
  unsigned long t_last_imu   = t_debut;
  unsigned long t_last_flush = t_debut;

  while (millis() - t_debut < DELTA_SEND_MS) {
    unsigned long maintenant = millis();

    lireGPSDisponible();
    
    gpsVal();

    if (maintenant - t_last_imu >= IMU_UPDATE_MS) {
      imuUpdate();
      t_last_imu = maintenant;
    }

    if (maintenant - t_last_flex >= 500 && nb_mesure_actuel < NB_FLEX_OCT * 8) {
      flexi_val();
      nb_mesure_actuel++;
      t_last_flex = maintenant;
    }

    if (compteur >= TRAME_DEB_MESURE_ANGLE &&
        maintenant - t_last_accel >= 1000 &&
        nbr_imu_acc_actuel < NB_IMU) {
      imuValAccel();
      t_last_accel = maintenant;
    }

    if (compteur >= TRAME_DEB_MESURE_ANGLE) {
      if (maintenant - t_last_angle >= ANGLE_DELAY_MS) {
        imuValAngle();
        t_last_angle = maintenant;
      }
    }
    if (sd_ok && sdFile && maintenant - t_last_flush >= 5000) {
      sdFile.flush();
      t_last_flush = maintenant;
    }
  }
}

// ─── Envoi LoRa ───────────────────────────────────────────────────────────────
void envoyerTrame() {
  remplir_trame();

  // ─── Affichage trame ──────────────────────────────────────────────────────────
  Serial.println("=== TRAME ===");
  Serial.print("ID        : "); Serial.println(trame.identifiant);
  Serial.print("Timestamp : "); Serial.println(trame.timestamp);
  Serial.print("GPS lat   : "); Serial.println(trame.gps[0] , 6);
  Serial.print("GPS lon   : "); Serial.println(trame.gps[1] , 6);

  Serial.print("Flex1 : ");
  for (int i = 0; i < NB_FLEX_OCT * 8; i++) Serial.print((trame.bits_f1[i/8] >> (i%8)) & 1);
  Serial.println();

  Serial.print("Flex2 : ");
  for (int i = 0; i < NB_FLEX_OCT * 8; i++) Serial.print((trame.bits_f2[i/8] >> (i%8)) & 1);
  Serial.println();

  Serial.print("Flex3 : ");
  for (int i = 0; i < NB_FLEX_OCT * 8; i++) Serial.print((trame.bits_f3[i/8] >> (i%8)) & 1);
  Serial.println();

  Serial.print("Accels : ");
  for (int i = 0; i < NB_IMU; i++) {
    Serial.print(trame.imu_acc[i] / 100.0f, 2);
    Serial.print(" ");
  }
  Serial.println();
  Serial.println("=============");

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
  else { Serial.print("OK — "); Serial.print(sdFile.size()); Serial.println(" octets ecrits"); }

  Serial.println("─────────────────────────────────────────");
  compteur++;
}

void clignote(int nb_fois, int duree_ms) {
  for (int i = 0; i < nb_fois; i++) {
    digitalWrite(LED_BUILTIN, HIGH);
    delay(duree_ms);
    digitalWrite(LED_BUILTIN, LOW);
    delay(duree_ms);
  }
}

// ─── Setup ────────────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(9600);
  Serial1.begin(9600);
  delay(3000);
  clignote(3, 1000);

  if (Serial) {
    Serial.println("=== TX GPS + SD Logger ===");
    Serial.print("Taille trame : "); Serial.print(sizeof(Trame_complet)); Serial.println(" octets");
    Serial.print("Freq angles  : 20 Hz ("); Serial.print(ANGLE_DELAY_MS); Serial.println(" ms)");
  }

  Wire.begin();
  Wire.setClock(400000);

  Serial.println("=== TX GPS + SD Logger ===");

  int err = IMU.init(calib, IMU_ADDRESS);
  if (err) {
    Serial.print("ERREUR IMU : "); Serial.println(err);
    while (true);
  }
  Serial.println("IMU OK !");

  #ifdef PERFORM_CALIBRATION
    Serial.println(">>> Calibration accel/gyro — posez à PLAT...");
    delay(3000);
    IMU.calibrateAccelGyro(&calib);
    Serial.println(">>> Calibration accel/gyro OK !");
    Serial.println(">>> Calibration magnéto — tournez dans tous les sens...");
    delay(2000);
    IMU.calibrateMag(&calib);
    Serial.println(">>> Calibration magnéto OK !");
    IMU.init(calib, IMU_ADDRESS);
    Serial.println(">>> IMU reconfigurée avec calibration !");
  #endif

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