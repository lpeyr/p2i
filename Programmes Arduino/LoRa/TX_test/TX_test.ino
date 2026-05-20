#include <SPI.h>
#include <LoRa.h>

int num_gp    = 0;
int frequency = 862e6 + num_gp * 1e6;
int SF        = 8;
int BW        = 125E3;
int CR        = 5;
int power     = 10;

#define NB_IMU        20
#define NB_FLEX_OCT   5
#define NB_GPS        2
#define DELTA_SEND_MS 20000

typedef struct __attribute__((packed)) {
  uint32_t timestamp;              // 4 octets
  uint8_t  bits_f1[NB_FLEX_OCT];  // 5 octets
  uint8_t  bits_f2[NB_FLEX_OCT];  // 5 octets
  uint8_t  bits_f3[NB_FLEX_OCT];  // 5 octets
  uint16_t gps_lat[NB_GPS];       // 4 octets
  uint16_t gps_lng[NB_GPS];       // 4 octets
  int16_t  imu_acc[NB_IMU];       // 40 octets (norme ×100)
} Trame_complet;
// Total : 4 + 15 + 8 + 40 = 67 octets ✅

Trame_complet trame;
int compteur = 0;
unsigned long t_dernier_envoi = 0;

void envoyerTrame() {
  memset(&trame, 0, sizeof(trame));
  trame.timestamp  = millis() / 1000;
  trame.gps_lat[0] = 4576;
  trame.gps_lng[0] = 470;

  // Simulation accélération (norme ×100, résolution 0.01 m/s²)
  for (int i = 0; i < NB_IMU; i++) {
    trame.imu_acc[i] = (int16_t)((9.81f + 0.05f * (i % 5)) * 100);
  }

  unsigned long t0 = micros();
  LoRa.beginPacket();
  LoRa.write((uint8_t*)&trame, sizeof(trame));
  bool ok = LoRa.endPacket();
  float duree_ms = (micros() - t0) / 1000.0;

  Serial.print("Paquet #"); Serial.print(compteur);
  Serial.print(" | "); Serial.print(sizeof(Trame_complet)); Serial.print(" octets");
  Serial.print(" | Temps TX : "); Serial.print(duree_ms, 2); Serial.print(" ms");
  Serial.print(" | "); Serial.println(ok ? "OK ✓" : "ECHEC ✗");

  compteur++;
}

void setup() {
  Serial.begin(9600);
  delay(3000);
  Serial.println("=== TX Simple ===");
  Serial.print("Taille trame : "); Serial.print(sizeof(Trame_complet)); Serial.println(" octets");

  if (!LoRa.begin(frequency)) {
    Serial.println("ERREUR LoRa !");
    while (true);
  }

  LoRa.setTxPower(power);
  LoRa.setSpreadingFactor(SF);
  LoRa.setSignalBandwidth(BW);
  LoRa.setCodingRate4(CR);
  LoRa.setPreambleLength(8);

  Serial.println("LoRa OK !");
  envoyerTrame();
  t_dernier_envoi = millis();
}

void loop() {
  if (millis() - t_dernier_envoi >= DELTA_SEND_MS) {
    envoyerTrame();
    t_dernier_envoi = millis();
  }
}