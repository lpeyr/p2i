#include <SPI.h>
#include <LoRa.h>

// 120 bits = 15 octets
#define NB_BITS     120
#define NB_OCTETS   (NB_BITS / 8)  // 15

// Paramètres LoRa (adapter num_gp selon ton groupe)
#define FREQUENCY   862e6
#define SF          8
#define BW          125E3
#define CR          5
#define POWER       10

typedef struct __attribute__((packed)) {
  uint8_t bits[NB_OCTETS];  // 15 octets = 120 bits
} Trame_test;

Trame_test trame;
int compteur = 0;

// --- Utilitaires bits ---
void setBit(uint8_t* tableau, int pos, bool valeur) {
  int octet = pos / 8;
  int bit   = pos % 8;
  if (valeur) tableau[octet] |=  (1 << bit);
  else        tableau[octet] &= ~(1 << bit);
}

bool getBit(uint8_t* tableau, int pos) {
  return (tableau[pos / 8] >> (pos % 8)) & 1;
}

void setup() {
  Serial.begin(9600);
  delay(2000);
  Serial.println("=== TX Test - 120 bits ===");

  if (!LoRa.begin(FREQUENCY)) {
    Serial.println("Erreur démarrage LoRa !");
    while (true);
  }

  LoRa.setTxPower(POWER);
  LoRa.setSpreadingFactor(SF);
  LoRa.setSignalBandwidth(BW);
  LoRa.setCodingRate4(CR);
  LoRa.setPreambleLength(8);

  Serial.println("LoRa OK !");

  // Remplissage test : alternance 0/1
  memset(&trame, 0, sizeof(trame));
  for (int i = 0; i < NB_BITS; i++) {
    setBit(trame.bits, i, i % 2 == 0);
  }
}

void loop() {
  // Affichage des bits avant envoi
  Serial.print("Envoi paquet #"); Serial.print(compteur);
  Serial.print(" | bits[0..7] = ");
  for (int i = 0; i < 8; i++) Serial.print(getBit(trame.bits, i));
  Serial.println();

  // Envoi de la struct brute
  unsigned long t0 = micros();
  LoRa.beginPacket();
  LoRa.write((uint8_t*)&trame, sizeof(trame));  // 15 octets
  bool ok = LoRa.endPacket();
  float duree = (micros() - t0) / 1000.0;

  if (ok) {
    Serial.print("  OK | Temps TX : ");
    Serial.print(duree); Serial.println(" ms");
  } else {
    Serial.println("  ECHEC envoi");
  }

  compteur++;
  delay(10000);
}