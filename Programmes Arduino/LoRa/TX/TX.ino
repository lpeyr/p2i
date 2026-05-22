#include <SPI.h>
#include <LoRa.h>
#include 


#define NB_IMU        20
#define NB_FLEX_OCT   5 
#define DELTA_SEND_MS 20000
#define FREQUENCY     862e6
#define SF            8
#define BW            125e3
#define CR            5
#define POWER         10
#define 


typedef struct __attribute__((packed)) {
  uint8_t  identifiant             // 1 octet
  uint32_t timestamp;              // 4 octets
  uint8_t  bits_f1[NB_FLEX_OCT];  // 5 octets
  uint8_t  bits_f2[NB_FLEX_OCT];  // 5 octets
  uint8_t  bits_f3[NB_FLEX_OCT];  // 5 octets
  uint16_t gps[2];                 // 4 octets — [0]=lat, [1]=lng
  int16_t  imu_acc[NB_IMU];        // 40 octets
} Trame_complet;
// Total: 63 octets


Trame_complet trame;
int compteur = 0;
unsigned long t_dernier_envoi = 0;


void gps_val(){
  // voir fichier
}

void flexi_val(){
    // Récupération via A0 A1 et A2
}

void remplir_trame(){
    
}


void envoyerTrame() {
  memset(&trame, 0, sizeof(trame));
  trame.timestamp = 1779264502; // A changer avec la vraie valeur depuis TinyGPS
  trame.gps[0]    = 4576;  // latitude  ≈ 45.76° N
  trame.gps[1]    = 470;   // longitude ≈  4.70° E

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

  if (!LoRa.begin(FREQUENCY)) {
    Serial.println("ERREUR LoRa !");
    while (true);
  }

  LoRa.setTxPower(POWER);
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
