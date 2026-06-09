#include <Arduino.h>
#include <SPI.h>
#include <LoRa.h>
#include "ICM20600.h"
#include <MadgwickAHRS.h> 
#include <Wire.h>
#include <math.h>

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
#define SEUIL1              400
#define SEUIL2              300
#define SEUIL3              800
#define NB_MAX_ANGLE        1500
#define SIDE                "right"


typedef struct __attribute__((packed)) {
  uint8_t  identifiant;
  uint8_t  bits_f1[NB_FLEX_OCT];
  uint8_t  bits_f2[NB_FLEX_OCT];
  uint8_t  bits_f3[NB_FLEX_OCT];
  int16_t  imu_acc[NB_IMU];
} Trame_complet;
// Total : 56 octets

// ─── Objets ───────────────────────────────────────────────────────────────────
Trame_complet trame;
ICM20600  IMU(true);   // AD0=true par défaut → adresse 0x69
Madgwick  fusion;
int16_t   ax, ay, az;
int16_t   gx, gy, gz;

// ─── Vars globales ────────────────────────────────────────────────────────────
int           compteur              = 0;
unsigned long t_dernier_envoi       = 0;
int           nb_mesure_actuel      = 0;
int           nbr_imu_acc_actuel    = 0;

// ─── Utilitaires bits ─────────────────────────────────────────────────────────
void setBit(uint8_t* tableau, int pos, bool valeur) {
  int octet = pos / 8;
  int bit   = pos % 8;
  if (valeur) tableau[octet] |=  (1 << bit);
  else        tableau[octet] &= ~(1 << bit);
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


void imuUpdate() {
  IMU.getAcceleration(&ax, &ay, &az);
  IMU.getGyroscope(&gx, &gy, &gz);

  // Conversion en unités physiques (selon range par défaut ±2G et ±250dps)
  float axf = ax / 16384.0f;
  float ayf = ay / 16384.0f;
  float azf = az / 16384.0f;
  float gxf = gx / 131.0f * PI / 180.0f;
  float gyf = gy / 131.0f * PI / 180.0f;
  float gzf = gz / 131.0f * PI / 180.0f;

  fusion.updateIMU(gxf, gyf, gzf, axf, ayf, azf);
}

void imuValAccel() {

  float axf = ax / 16384.0f;
  float ayf = ay / 16384.0f;
  float azf = az / 16384.0f;
  float norme = sqrt(axf*axf + ayf*ayf + azf*azf);

  if (nbr_imu_acc_actuel < NB_IMU) {
    trame.imu_acc[nbr_imu_acc_actuel] = (int16_t)(norme * 100)*10;
    nbr_imu_acc_actuel++;
  }
}

void clignote(int nb_fois, int duree_ms) {
  for (int i = 0; i < nb_fois; i++) {
    digitalWrite(LED_BUILTIN, HIGH);
    delay(duree_ms);
    digitalWrite(LED_BUILTIN, LOW);
    delay(duree_ms);
  }
}

// ─── Remplissage trame ────────────────────────────────────────────────────────
void remplir_trame() {
  memset(&trame, 0, sizeof(trame));
  trame.identifiant  = 2;
  nbr_imu_acc_actuel = 0;
  nb_mesure_actuel   = 0;

  unsigned long t_debut      = millis();
  unsigned long t_last_flex  = t_debut;
  unsigned long t_last_accel = t_debut - 1000;
  unsigned long t_last_angle = t_debut;
  unsigned long t_last_imu = t_debut;

  while (millis() - t_debut < DELTA_SEND_MS) {
    unsigned long maintenant = millis();

    if (maintenant - t_last_imu >= 10) {
        imuUpdate();
        t_last_imu = maintenant;
    }

    if (maintenant - t_last_flex >= 500 && nb_mesure_actuel < NB_FLEX_OCT * 8) {
      flexi_val();
      nb_mesure_actuel++;
      t_last_flex = maintenant;
    }

    if (maintenant - t_last_accel >= 1000 && nbr_imu_acc_actuel < NB_IMU) {
      imuValAccel();
      t_last_accel = maintenant;
    };
    // dans le while :

  }
}
// ─── Envoi LoRa ───────────────────────────────────────────────────────────────
void envoyerTrame() {
  remplir_trame();

  Serial.println("=== TRAME ===");
  Serial.print("ID        : "); Serial.println(trame.identifiant);

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

  compteur++;
}

// ─── Setup ────────────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(9600);
  Serial1.begin(9600);
  delay(3000);
  clignote(3, 1000);
  Serial.println("=== TX ===");
  Serial.print("Taille trame : "); Serial.print(sizeof(Trame_complet)); Serial.println(" octets");

  Wire.begin();
  IMU.initialize();
  uint8_t id = IMU.getDeviceID();

  if (id == 0 || id == 0xFF) {
    Serial.println("ERREUR IMU : non détectée (ID = 0x" + String(id, HEX) + ")");
    clignote(10, 100); // clignotement rapide pour signaler l'erreur
    while (true);
  }

  Serial.print("IMU OK ! Device ID = 0x");
  Serial.println(id, HEX); // doit afficher 0x11 pour le ICM20600
  fusion.begin(100);

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

// ─── Loop ─────────────────────────────────────────────────────────────────────
void loop() {
  unsigned long maintenant = millis();
  if (maintenant - t_dernier_envoi >= DELTA_SEND_MS) {
    envoyerTrame();
    t_dernier_envoi = maintenant;
  }
}
