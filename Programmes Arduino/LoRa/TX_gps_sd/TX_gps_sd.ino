#include <Wire.h>
#include <MPU9250.h>
#include <SensorFusion.h>
#include <LoRa.h>
#include <TinyGPSPlus.h>
#include <SPI.h>
#include <SD.h>

#define IMU_ADDRESS    0x68
#define NB_IMU         20
#define NB_FLEX_OCT    5
#define DELTA_SEND_MS  20000
#define FREQUENCY      862e6
#define LORA_SF        8
#define BW             125e3
#define CR             5
#define POWER          10
#define FLEXI1         A0
#define FLEXI2         A1
#define FLEXI3         A2
#define SEUIL          850
#define SIDE           "right"

// ── SD ────────────────────────────────────────────────────────────────────────
#define SD_CS_PIN      4
#define SD_FILE        "imu.txt"
#define ANGLE_DELAY_MS 50       // 20 Hz = 1 mesure toutes les 50ms

// ── Trame LoRa ────────────────────────────────────────────────────────────────
typedef struct __attribute__((packed)) {
  uint8_t  identifiant;
  uint32_t timestamp;
  uint8_t  bits_f1[NB_FLEX_OCT];
  uint8_t  bits_f2[NB_FLEX_OCT];
  uint8_t  bits_f3[NB_FLEX_OCT];
  uint16_t gps[2];
  int16_t  imu_acc[NB_IMU];
} Trame_complet;

// ── Objets ────────────────────────────────────────────────────────────────────
Trame_complet trame;
MPU9250       IMU;
AccelData     accelData;
GyroData      gyroData;
MagData       magData;
calData       calib = {0};
SF            fusion;
TinyGPSPlus   gps;

// ── État global ───────────────────────────────────────────────────────────────
int           compteur              = 0;
unsigned long t_dernier_envoi       = 0;
int           nb_mesure_actuel      = 0;
int           nbr_imu_acc_actuel    = 0;
uint32_t      timestamp_first_angle = 0;
bool          firstAngleTimestampSet = false;
uint32_t      timestamp_angle_fail  = 0;

// ── SD : état ─────────────────────────────────────────────────────────────────
bool     sd_ok          = false;   // SD initialisée avec succès
bool     sd_full        = false;   // plus de place
File     sdFile;                   // fichier ouvert en permanence

// ── Utilitaires ───────────────────────────────────────────────────────────────
void setBit(uint8_t* tableau, int pos, bool valeur) {
  int octet = pos / 8;
  int bit   = pos % 8;
  if (valeur) tableau[octet] |=  (1 << bit);
  else        tableau[octet] &= ~(1 << bit);
}

// Float → string 2 décimales, fiable sur SAMD
String ftos(float v) {
  char buf[12];
  int entier = (int)v;
  int dec    = (int)(fabsf(v - (float)entier) * 100.0f + 0.5f);
  if (dec >= 100) { entier += (v >= 0) ? 1 : -1; dec -= 100; }
  if (v < 0 && entier == 0) snprintf(buf, sizeof(buf), "-0.%02d", dec);
  else                      snprintf(buf, sizeof(buf), "%d.%02d",  entier, dec);
  return String(buf);
}

// ── GPS ───────────────────────────────────────────────────────────────────────
uint32_t gpsToTimestamp(TinyGPSDate &d, TinyGPSTime &t) {
  uint16_t y   = d.year();
  uint8_t  m   = d.month();
  uint8_t  day = d.day();
  uint32_t days = (y - 1970) * 365UL + (y - 1969) / 4;
  uint8_t  mdays[] = {31,28,31,30,31,30,31,31,30,31,30,31};
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

// ── Flex ──────────────────────────────────────────────────────────────────────
void flexi_val() {
  bool val1 = analogRead(FLEXI1) < SEUIL;
  bool val2 = analogRead(FLEXI2) < SEUIL;
  bool val3 = analogRead(FLEXI3) < SEUIL;
  setBit(trame.bits_f1, nb_mesure_actuel, val1);
  setBit(trame.bits_f2, nb_mesure_actuel, val2);
  setBit(trame.bits_f3, nb_mesure_actuel, val3);
}

// ── IMU — accélération ────────────────────────────────────────────────────────
void imuValAccel() {
  IMU.update();
  IMU.getAccel(&accelData);
  IMU.getGyro(&gyroData);
  IMU.getMag(&magData);

  float deltat = fusion.deltatUpdate();
  fusion.MadgwickUpdate(
    gyroData.gyroX * PI / 180.0f, gyroData.gyroY * PI / 180.0f, gyroData.gyroZ * PI / 180.0f,
    accelData.accelX, accelData.accelY, accelData.accelZ,
    magData.magX, magData.magY, magData.magZ,
    deltat
  );

  float roll  = fusion.getRoll()  * PI / 180.0f;
  float pitch = fusion.getPitch() * PI / 180.0f;

  float gravX = sin(pitch) * 9.81f;
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

// ── IMU — angles → SD ligne par ligne (20 Hz) ────────────────────────────────
void imuValAngle() {
  IMU.update();
  IMU.getAccel(&accelData);
  IMU.getGyro(&gyroData);
  IMU.getMag(&magData);

  float deltat = fusion.deltatUpdate();
  fusion.MadgwickUpdate(
    gyroData.gyroX * PI / 180.0f, gyroData.gyroY * PI / 180.0f, gyroData.gyroZ * PI / 180.0f,
    accelData.accelX, accelData.accelY, accelData.accelZ,
    magData.magX, magData.magY, magData.magZ,
    deltat
  );

  // Timestamp du premier angle
  if (!firstAngleTimestampSet) {
    if (gps.date.isValid() && gps.time.isValid()) {
      timestamp_first_angle = gpsToTimestamp(gps.date, gps.time) - timestamp_angle_fail / 1000;
      firstAngleTimestampSet = true;
    } else if (timestamp_angle_fail == 0) {
      timestamp_angle_fail = millis();
    }
  }

  float roll  = fusion.getRoll()  * PI / 180.0f;
  float pitch = fusion.getPitch() * PI / 180.0f;
  float yaw   = fusion.getYaw()   * PI / 180.0f;

  // ── Écriture SD ligne par ligne ──────────────────────────────────────────
  if (sd_ok && !sd_full && sdFile) {
    sdFile.print(ftos(yaw));   sdFile.print(";");
    sdFile.print(ftos(pitch)); sdFile.print(";");
    sdFile.println(ftos(roll));
    sdFile.flush();

    // Vérification espace (toutes les 100 lignes environ)
    // Sd2Card/SdVolume trop lent en continu → on se base sur la taille du fichier
    // Pour une limite stricte, décommenter le bloc ci-dessous :
    // if (sdFile.size() > MAX_FILE_SIZE) { sd_full = true; sdFile.close(); }
  } else if (!sd_ok) {
    // Pas de SD → rien (pas de stockage RAM)
  }
}

// ── Init SD ───────────────────────────────────────────────────────────────────
void initSD() {
  if (Serial) Serial.print("Init SD... ");

  if (!SD.begin(SD_CS_PIN)) {
    if (Serial) Serial.println("ECHEC (carte absente ou non FAT32) — logs SD desactives.");
    sd_ok = false;
    return;
  }

  if (SD.exists(SD_FILE)) SD.remove(SD_FILE);

  sdFile = SD.open(SD_FILE, FILE_WRITE);
  if (!sdFile) {
    if (Serial) Serial.println("ECHEC ouverture fichier — logs SD desactives.");
    sd_ok = false;
    return;
  }

  // En-tête CSV
  sdFile.println("yaw;pitch;roll");
  sdFile.flush();

  sd_ok = true;
  if (Serial) Serial.println("OK → " SD_FILE);
}

// ── Remplissage trame ─────────────────────────────────────────────────────────
void remplir_trame() {
  memset(&trame, 0, sizeof(trame));
  trame.identifiant   = 1;
  nbr_imu_acc_actuel  = 0;
  nb_mesure_actuel    = 0;

  gpsVal();

  unsigned long t_debut      = millis();
  unsigned long t_last_flex  = t_debut;
  unsigned long t_last_accel = t_debut;
  unsigned long t_last_angle = t_debut;

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

    // Angles toutes les 50ms (20 Hz) dès le compteur >= 5 (temps de calibration)
    if (compteur >= 5 && !sd_full) {
      if (maintenant - t_last_angle >= ANGLE_DELAY_MS) {
        imuValAngle();
        t_last_angle = maintenant;
      }
    }
  }
}

// ── Envoi LoRa ────────────────────────────────────────────────────────────────
void envoyerTrame() {
  remplir_trame();

  unsigned long t0 = micros();
  LoRa.beginPacket();
  LoRa.write((uint8_t*)&trame, sizeof(trame));
  bool ok = LoRa.endPacket();
  float duree_ms = (micros() - t0) / 1000.0f;

  // Affichage Serial uniquement si connecté
  if (Serial) {
    Serial.println("─────────────────────────────────────────");
    Serial.print  ("Paquet #");        Serial.println(compteur);
    Serial.print  ("Taille trame : "); Serial.print(sizeof(Trame_complet)); Serial.println(" octets");
    Serial.print  ("Temps TX     : "); Serial.print(duree_ms, 2); Serial.println(" ms");
    Serial.print  ("Statut       : "); Serial.println(ok ? "OK ✓" : "ECHEC ✗");
    Serial.print  ("SD           : ");
    if (!sd_ok)    Serial.println("non disponible");
    else if (sd_full) Serial.println("PLEINE");
    else {
      Serial.print("OK — ");
      Serial.print(sdFile.size());
      Serial.println(" octets ecrits");
    }

    // Trame JSON complète (angles) affichée à chaque envoi
    Serial.print("{\"side\":\""); Serial.print(SIDE);
    Serial.print("\",\"timestamp\":"); Serial.print(timestamp_first_angle);
    Serial.print(",\"roll\":[");
    // On n'a plus les tableaux RAM → on indique juste que c'est sur SD
    Serial.print("\"voir " SD_FILE "\"");
    Serial.print("],\"pitch\":[\"voir " SD_FILE "\"]");
    Serial.println(",\"yaw\":[\"voir " SD_FILE "\"]}");
    Serial.println("─────────────────────────────────────────");
  }

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

// ── Setup ─────────────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(9600);
  Serial1.begin(9600); // GPS
  delay(3000);
  clignote(3, 1000);

  if (Serial) {
    Serial.println("=== TX GPS + SD Logger ===");
    Serial.print("Taille trame : "); Serial.print(sizeof(Trame_complet)); Serial.println(" octets");
    Serial.print("Freq angles  : 20 Hz ("); Serial.print(ANGLE_DELAY_MS); Serial.println(" ms)");
  }

  Wire.begin();
  int err = IMU.init(calib, IMU_ADDRESS);
  if (err) {
    if (Serial) { Serial.print("ERREUR IMU : "); Serial.println(err); }
    while (true);
  }
  if (Serial) Serial.println("IMU OK !");

  if (!LoRa.begin(FREQUENCY)) {
    if (Serial) Serial.println("ERREUR LoRa !");
    while (true);
  }
  LoRa.setTxPower(POWER);
  LoRa.setSpreadingFactor(LORA_SF);
  LoRa.setSignalBandwidth(BW);
  LoRa.setCodingRate4(CR);
  LoRa.setPreambleLength(8);
  if (Serial) Serial.println("LoRa OK !");

  // Init SD
  initSD();

  envoyerTrame();
  t_dernier_envoi = millis();
}

// ── Loop ──────────────────────────────────────────────────────────────────────
void loop() {
  unsigned long maintenant = millis();

  if (maintenant - t_dernier_envoi >= DELTA_SEND_MS) {
    envoyerTrame();
    t_dernier_envoi = maintenant;
  }
}
