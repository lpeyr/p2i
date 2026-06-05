#include <SPI.h>
#include <LoRa.h>

#define NB_IMU        20
#define NB_FLEX_OCT   5
#define NB_BITS       (NB_FLEX_OCT * 8)
#define FREQUENCY     862e6
#define SF            8
#define BW            125e3
#define CR            5

// ─── Structures ───────────────────────────────────────────────────────────────
typedef struct __attribute__((packed)) {
  uint8_t  identifiant;
  uint32_t timestamp;
  uint8_t  bits_f1[NB_FLEX_OCT];
  uint8_t  bits_f2[NB_FLEX_OCT];
  uint8_t  bits_f3[NB_FLEX_OCT];
  uint16_t gps[2];
  int16_t  imu_acc[NB_IMU];
} Trame_complet;                   // 64 octets

typedef struct __attribute__((packed)) {
  uint8_t  identifiant;
  uint8_t  bits_f1[NB_FLEX_OCT];
  uint8_t  bits_f2[NB_FLEX_OCT];
  uint8_t  bits_f3[NB_FLEX_OCT];
  int16_t  imu_acc[NB_IMU];
} Trame_sansGPS;                   // 60 octets

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

// ─── Affichage trame AVEC GPS ─────────────────────────────────────────────────
void afficherTrame(Trame_complet& trame) {
  Serial.print("{\"id\": ");         Serial.print(trame.identifiant);
  Serial.print(", \"timestamp\": "); Serial.print(trame.timestamp);

  Serial.print(", \"flexi1\": ");    afficherListeBits(trame.bits_f1);
  Serial.print(", \"flexi2\": ");    afficherListeBits(trame.bits_f2);
  Serial.print(", \"flexi3\": ");    afficherListeBits(trame.bits_f3);

  Serial.print(", \"gps\": {\"lat\": ");
  Serial.print(trame.gps[0] / 100.0f, 2);
  Serial.print(", \"lon\": ");
  Serial.print(trame.gps[1] / 100.0f, 2);
  Serial.print("}");

  Serial.print(", \"accel\": [");
  for (int i = 0; i < NB_IMU; i++) {
    Serial.print(trame.imu_acc[i] / 100.0f, 2);
    if (i < NB_IMU - 1) Serial.print(", ");
  }
  Serial.println("]}");
}

// ─── Affichage trame SANS GPS ─────────────────────────────────────────────────
void afficherTrameSansGPS(Trame_sansGPS& trame) {
  Serial.print("{\"id\": ");         Serial.print(trame.identifiant);

  Serial.print(", \"flexi1\": ");    afficherListeBits(trame.bits_f1);
  Serial.print(", \"flexi2\": ");    afficherListeBits(trame.bits_f2);
  Serial.print(", \"flexi3\": ");    afficherListeBits(trame.bits_f3);

  Serial.print(", \"gps\": null");

  Serial.print(", \"accel\": [");
  for (int i = 0; i < NB_IMU; i++) {
    Serial.print(trame.imu_acc[i] / 100.0f, 2);
    if (i < NB_IMU - 1) Serial.print(", ");
  }
  Serial.println("]}");
}

// ─── Setup ────────────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(9600);
  while (!Serial);

  if (!LoRa.begin(FREQUENCY)) {
    while (true);
  }

  LoRa.setPreambleLength(8);
  LoRa.setSpreadingFactor(SF);
  LoRa.setSignalBandwidth(BW);
  LoRa.setCodingRate4(CR);

}

// ─── Loop ─────────────────────────────────────────────────────────────────────
void loop() {
  int taille_paquet_recu = LoRa.parsePacket();

  if (taille_paquet_recu == sizeof(Trame_complet)) {        // 64 octets → avec GPS

    Trame_complet trame;
    LoRa.readBytes((byte*)&trame, sizeof(trame));
    afficherTrame(trame);

  } else if (taille_paquet_recu == sizeof(Trame_sansGPS)) { // 60 octets → sans GPS

    Trame_sansGPS trame;
    LoRa.readBytes((byte*)&trame, sizeof(trame));

    afficherTrameSansGPS(trame);

  } else if (taille_paquet_recu > 0) {

    while (LoRa.available()) LoRa.read();
  }
}
