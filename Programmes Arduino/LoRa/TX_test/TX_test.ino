#include <SPI.h>
#include <LoRa.h>

int preambleLength = 8;
int frequency      = 862e6;
int SF             = 8;
int BW             = 125E3;
int CR             = 5;
int power          = 10;

#define NB_BITS   120
#define NB_OCTETS (NB_BITS / 8)  // 15 octets par flexiforce

typedef struct __attribute__((packed)) {
  uint8_t bits_f1[NB_OCTETS];  // 15 octets
  uint8_t bits_f2[NB_OCTETS];  // 15 octets
  uint8_t bits_f3[NB_OCTETS];  // 15 octets
} Trame_flexi;                  // total : 45 octets

Trame_flexi trame;
int compteur = 0;

void setBit(uint8_t* tableau, int pos, bool valeur) {
  int octet = pos / 8;
  int bit   = pos % 8;
  if (valeur) tableau[octet] |=  (1 << bit);
  else        tableau[octet] &= ~(1 << bit);
}

bool getBit(uint8_t* tableau, int pos) {
  return (tableau[pos / 8] >> (pos % 8)) & 1;
}

void afficherBits(uint8_t* tableau, const char* nom) {
  Serial.print(nom); Serial.print(" : ");
  for (int i = 0; i < NB_BITS; i++) {
    Serial.print(getBit(tableau, i));
    if ((i + 1) % 8 == 0) Serial.print(" ");
  }
  Serial.println();
}

void setup() {
  Serial.begin(9600);
  delay(2000);
  Serial.println("=== TX Flexi - 3x120 bits ===");

  if (!LoRa.begin(frequency)) {
    Serial.println("Erreur démarrage LoRa !");
    while (true);
  }

  LoRa.setTxPower(power);
  LoRa.setPreambleLength(preambleLength);
  LoRa.setSpreadingFactor(SF);
  LoRa.setSignalBandwidth(BW);
  LoRa.setCodingRate4(CR);

  Serial.print("Taille trame : ");
  Serial.print(sizeof(Trame_flexi));
  Serial.println(" octets");

  // --- Simulation des 3 flexiforces ---
  memset(&trame, 0, sizeof(trame));

  // F1 : toujours appuyé → tous les bits à 1
  for (int i = 0; i < NB_BITS; i++) setBit(trame.bits_f1, i, true);

  // F2 : alternance 0/1 → appui intermittent
  for (int i = 0; i < NB_BITS; i++) setBit(trame.bits_f2, i, i % 2 == 0);

  // F3 : jamais appuyé → tous les bits à 0 (déjà fait par memset)
}

void loop() {
  Serial.print("\n--- Paquet #"); Serial.print(compteur); Serial.println(" ---");
  afficherBits(trame.bits_f1, "F1");
  afficherBits(trame.bits_f2, "F2");
  afficherBits(trame.bits_f3, "F3");

  unsigned long t0 = micros();
  LoRa.beginPacket();
  LoRa.write((uint8_t*)&trame, sizeof(trame));
  bool ok = LoRa.endPacket();
  float duree = (micros() - t0) / 1000.0;

  if (ok) {
    Serial.print("Envoi OK | Temps TX : ");
    Serial.print(duree); Serial.println(" ms");
  } else {
    Serial.println("Echec envoi");
  }

  compteur++;
  delay(10000);
}