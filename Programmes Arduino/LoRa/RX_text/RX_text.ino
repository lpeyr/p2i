#include <SPI.h>
#include <LoRa.h>


int preambleLength = 8;
int frequency      = 862e6
int SF             = 8;
int BW             = 125E3;
int CR             = 5;

// Structure identique au TX
#define NB_BITS   120
#define NB_OCTETS (NB_BITS / 8)  // 15

typedef struct __attribute__((packed)) {
  uint8_t bits[NB_OCTETS];
} Trame_test;

// --- Utilitaire ---
bool getBit(uint8_t* tableau, int pos) {
  return (tableau[pos / 8] >> (pos % 8)) & 1;
}

void setup() {
  Serial.begin(9600);
  while (!Serial);
  Serial.println("Je suis le récepteur");

  if (!LoRa.begin(frequency)) {
    Serial.println("Problème au démarrage du module LoRa !");
    while (true);
  }

  LoRa.setPreambleLength(preambleLength);
  LoRa.setSpreadingFactor(SF);
  LoRa.setSignalBandwidth(BW);
  LoRa.setCodingRate4(CR);

  Serial.println("LoRa OK, en écoute...");
}

void loop() {
  int taille_paquet_recu = LoRa.parsePacket();

  if (taille_paquet_recu == sizeof(Trame_test)) {

    Trame_test trame;
    LoRa.readBytes((byte*)&trame, sizeof(trame));

    Serial.print("Paquet reçu (");
    Serial.print(taille_paquet_recu);
    Serial.print(" octets) | RSSI : ");
    Serial.print(LoRa.packetRssi());
    Serial.println(" dBm");

    // Affichage des 120 bits groupés par octets
    Serial.print("Bits : ");
    for (int i = 0; i < NB_BITS; i++) {
      Serial.print(getBit(trame.bits, i));
      if ((i + 1) % 8 == 0) Serial.print(" ");
    }
    Serial.println();

    // Affichage des 15 octets en hexadécimal
    Serial.print("Hex  : ");
    for (int i = 0; i < NB_OCTETS; i++) {
      if (trame.bits[i] < 0x10) Serial.print("0");
      Serial.print(trame.bits[i], HEX);
      Serial.print(" ");
    }
    Serial.println();

  } else if (taille_paquet_recu > 0) {
    Serial.print("Paquet reçu mais taille inattendue : ");
    Serial.print(taille_paquet_recu);
    Serial.println(" octets — ignoré");
  }
}