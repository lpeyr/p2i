#include <SPI.h>
#include <LoRa.h>


int preambleLength = 8;
int frequency      = 862e6;
int SF             = 8;
int BW             = 125E3;
int CR             = 5;

#define NB_BITS   120
#define NB_OCTETS (NB_BITS / 8)

typedef struct __attribute__((packed)) {
  uint8_t bits_f1[NB_OCTETS];
  uint8_t bits_f2[NB_OCTETS];
  uint8_t bits_f3[NB_OCTETS];
} Trame_flexi;

bool getBit(uint8_t* tableau, int pos) {
  return (tableau[pos / 8] >> (pos % 8)) & 1;
}

// Compte le nombre de bits à 1 (= nb de fois où le capteur est appuyé)
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

void setup() {
  Serial.begin(9600);
  while (!Serial);
  Serial.println("Je suis le récepteur - 3x120 bits");

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

  if (taille_paquet_recu == sizeof(Trame_flexi)) {

    Trame_flexi trame;
    LoRa.readBytes((byte*)&trame, sizeof(trame));

    Serial.println("\n=== Paquet reçu ===");
    Serial.print("Taille : "); Serial.print(taille_paquet_recu);
    Serial.print(" octets | RSSI : ");
    Serial.print(LoRa.packetRssi()); Serial.println(" dBm");

    afficherBits(trame.bits_f1, "F1");
    afficherBits(trame.bits_f2, "F2");
    afficherBits(trame.bits_f3, "F3");

  } else if (taille_paquet_recu > 0) {
    Serial.print("Taille inattendue : ");
    Serial.print(taille_paquet_recu); Serial.println(" octets — ignoré");
  }
}