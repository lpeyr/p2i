#include <SPI.h>
#include <LoRa.h>



#define NB_IMU        20
#define NB_FLEX_OCT   5
#define NB_BITS       (NB_FLEX_OCT * 8)  // 40 bits par capteur flex
#define FREQUENCY     862e6
#define SF            8
#define BW            125e3
#define CR            5

typedef struct __attribute__((packed)) {
  uint32_t timestamp;              // 4 octets
  uint8_t  bits_f1[NB_FLEX_OCT];  // 5 octets
  uint8_t  bits_f2[NB_FLEX_OCT];  // 5 octets
  uint8_t  bits_f3[NB_FLEX_OCT];  // 5 octets
  uint16_t gps[2];                 // 4 octets — [0]=lat, [1]=lng
  int16_t  imu_acc[NB_IMU];        // 40 octets
} Trame_complet;
// Total : 63 octets


// ─── Utilitaires flex ─────────────────────────────────────────────────────────
bool getBit(uint8_t* tableau, int pos) {
  return (tableau[pos / 8] >> (pos % 8)) & 1;
}

void afficherListeBits(uint8_t* tableau) {
  Serial.print("[");
  for (int i = 0; i < NB_BITS; i++) {
    Serial.print(getBit(tableau, i) ? 1 : 0);
    if (i < NB_BITS - 1) Serial.print(",");
  }
  Serial.print("]");
}


void afficherTrame(Trame_complet& trame) {
  Serial.print("{timestamp: ");
  Serial.print(trame.timestamp);

  Serial.print(", flexi1: ");
  afficherListeBits(trame.bits_f1);

  Serial.print(", flexi2: ");
  afficherListeBits(trame.bits_f2);

  Serial.print(", flexi3: ");
  afficherListeBits(trame.bits_f3);

  Serial.print(", gps: [{lat: ");
  Serial.print(trame.gps[0] / 100.0f, 2);
  Serial.print(", lon: ");
  Serial.print(trame.gps[1] / 100.0f, 2);
  Serial.print("}]");

  Serial.print(", accel: [");
  for (int i = 0; i < NB_IMU; i++) {
    Serial.print(trame.imu_acc[i] / 100.0f, 2);
    if (i < NB_IMU - 1) Serial.print(", ");
  }
  Serial.println("]}");
}


void setup() {
  Serial.begin(9600);
  while (!Serial);
  Serial.println("=== RX — Récepteur Trame_complet (MKR) ===");
  Serial.print("Taille attendue : ");
  Serial.print(sizeof(Trame_complet));
  Serial.println(" octets");

  if (!LoRa.begin(FREQUENCY)) {
    Serial.println("ERREUR LoRa !");
    while (true);
  }

  LoRa.setPreambleLength(8);
  LoRa.setSpreadingFactor(SF);
  LoRa.setSignalBandwidth(BW);
  LoRa.setCodingRate4(CR);

  Serial.println("LoRa OK, en écoute...");
}


void loop() {
  int taille_paquet_recu = LoRa.parsePacket();

  if (taille_paquet_recu == sizeof(Trame_complet)) {

    Trame_complet trame;
    LoRa.readBytes((byte*)&trame, sizeof(trame));

    Serial.print("RSSI: "); Serial.print(LoRa.packetRssi());
    Serial.print(" dBm | SNR: "); Serial.print(LoRa.packetSnr());
    Serial.println(" dB");

    afficherTrame(trame);

  } else if (taille_paquet_recu > 0) {
    Serial.print("Taille inattendue : ");
    Serial.print(taille_paquet_recu); Serial.println(" octets — ignoré");
  }
}
