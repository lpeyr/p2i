// RX.ino — Récepteur LoRa pour Trame_complet
// Basé sur lpeyr/p2i : Programmes Arduino/LoRa/RX_text/RX_text.ino

#include <SPI.h>
#include <LoRa.h>

// ─── Paramètres radio (doivent correspondre au TX) ────────────────────────────
int frequency = 862e6;
int SF        = 8;
int BW        = 125E3;
int CR        = 5;

// ─── Définition de la trame (identique au TX) ─────────────────────────────────
#define NB_IMU        20
#define NB_FLEX_OCT   5
#define NB_GPS        2

typedef struct __attribute__((packed)) {
  uint32_t timestamp;              // 4 octets
  uint8_t  bits_f1[NB_FLEX_OCT];  // 5 octets
  uint8_t  bits_f2[NB_FLEX_OCT];  // 5 octets
  uint8_t  bits_f3[NB_FLEX_OCT];  // 5 octets
  uint16_t gps_lat[NB_GPS];       // 4 octets
  uint16_t gps_lng[NB_GPS];       // 4 octets
  int16_t  imu_acc[NB_IMU];       // 40 octets
} Trame_complet;
// Total : 67 octets

// ─── Utilitaires flex (repris de RX_text.ino) ─────────────────────────────────
#define NB_BITS (NB_FLEX_OCT * 8)  // 40 bits par capteur flex

bool getBit(uint8_t* tableau, int pos) {
  return (tableau[pos / 8] >> (pos % 8)) & 1;
}

int compterAppuis(uint8_t* tableau) {
  int count = 0;
  for (int i = 0; i < NB_BITS; i++)
    if (getBit(tableau, i)) count++;
  return count;
}

void afficherBits(uint8_t* tableau, const char* nom) {
  Serial.print(nom); Serial.print(" : ");
  for (int i = 0; i < NB_BITS; i++) {
    Serial.print(getBit(tableau, i));
    if ((i + 1) % 8 == 0) Serial.print(" ");
  }
  Serial.print("  → appuis : ");
  Serial.print(compterAppuis(tableau));
  Serial.print("/"); Serial.println(NB_BITS);
}

// ─── Setup ────────────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(9600);
  while (!Serial);
  Serial.println("=== RX — Récepteur Trame_complet ===");
  Serial.print("Taille attendue : ");
  Serial.print(sizeof(Trame_complet));
  Serial.println(" octets");

  if (!LoRa.begin(frequency)) {
    Serial.println("ERREUR LoRa !");
    while (true);
  }

  LoRa.setPreambleLength(8);
  LoRa.setSpreadingFactor(SF);
  LoRa.setSignalBandwidth(BW);
  LoRa.setCodingRate4(CR);

  Serial.println("LoRa OK, en écoute...");
}

// ─── Loop ─────────────────────────────────────────────────────────────────────
void loop() {
  int taille_paquet_recu = LoRa.parsePacket();

  if (taille_paquet_recu == sizeof(Trame_complet)) {

    Trame_complet trame;
    LoRa.readBytes((byte*)&trame, sizeof(trame));

    Serial.println("\n=== Paquet reçu ===");
    Serial.print("Taille : "); Serial.print(taille_paquet_recu);
    Serial.print(" octets | RSSI : ");
    Serial.print(LoRa.packetRssi()); Serial.print(" dBm");
    Serial.print(" | SNR : ");
    Serial.print(LoRa.packetSnr()); Serial.println(" dB");

    // Timestamp
    Serial.print("Timestamp  : "); Serial.print(trame.timestamp); Serial.println(" s");

    // Capteurs flex
    afficherBits(trame.bits_f1, "Flex F1");
    afficherBits(trame.bits_f2, "Flex F2");
    afficherBits(trame.bits_f3, "Flex F3");

    // GPS
    for (int i = 0; i < NB_GPS; i++) {
      Serial.print("GPS["); Serial.print(i); Serial.print("]  lat=");
      Serial.print(trame.gps_lat[i]);
      Serial.print("  lng="); Serial.println(trame.gps_lng[i]);
    }

    // IMU accéléromètre (norme ×100 → m/s²)
    Serial.print("IMU acc (m/s²) : ");
    for (int i = 0; i < NB_IMU; i++) {
      Serial.print(trame.imu_acc[i] / 100.0f, 2);
      if (i < NB_IMU - 1) Serial.print(", ");
    }
    Serial.println();

  } else if (taille_paquet_recu > 0) {
    Serial.print("Taille inattendue : ");
    Serial.print(taille_paquet_recu); Serial.println(" octets — ignoré");
  }
}