// RX.ino — Récepteur LoRa pour Trame_complet
// Carte : Arduino MKR (SAMD21)
// Basé sur lpeyr/p2i : Programmes Arduino/LoRa/RX_text/RX_text.ino

#include <SPI.h>
#include <LoRa.h>


// ─── Paramètres radio (doivent correspondre au TX) ────────────────────────────
int num_gp    = 0;
int frequency = 862e6 + num_gp * 1e6;
int SF        = 8;
int BW        = 125E3;
int CR        = 5;


// ─── Définition de la trame (identique au TX) ─────────────────────────────────
#define NB_IMU        20
#define NB_FLEX_OCT   5
#define NB_BITS       (NB_FLEX_OCT * 8)  // 40 bits par capteur flex

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

void bitsToStr(uint8_t* tableau, char* out) {
  for (int i = 0; i < NB_BITS; i++)
    out[i] = getBit(tableau, i) ? '1' : '0';
  out[NB_BITS] = '\0';
}


// ─── Affichage JSON-like de la trame ─────────────────────────────────────────
void afficherTrame(Trame_complet& trame) {

  // Bits flex → chaînes
  char f1[NB_BITS + 1], f2[NB_BITS + 1], f3[NB_BITS + 1];
  bitsToStr(trame.bits_f1, f1);
  bitsToStr(trame.bits_f2, f2);
  bitsToStr(trame.bits_f3, f3);

  // IMU → chaîne  (7 chars × 20 valeurs + séparateurs)
  char imu[160] = "";
  char tmp[10];
  for (int i = 0; i < NB_IMU; i++) {
    snprintf(tmp, sizeof(tmp), "%.2f", trame.imu_acc[i] / 100.0f);
    strcat(imu, tmp);
    if (i < NB_IMU - 1) strcat(imu, ", ");
  }

  // Message principal — SAMD21 supporte %f dans snprintf
  char msg[600];
  snprintf(msg, sizeof(msg),
    "{timestamp: %lu, flexi1: %s, flexi2: %s, flexi3: %s, gps: [{lat: %.2f, lon: %.2f}], accel: [%s]}",
    trame.timestamp,
    f1, f2, f3,
    trame.gps[0] / 100.0f,
    trame.gps[1] / 100.0f,
    imu
  );

  Serial.println(msg);
}


// ─── Setup ────────────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(9600);
  while (!Serial);
  Serial.println("=== RX — Récepteur Trame_complet (MKR) ===");
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

    Serial.print("RSSI: "); Serial.print(LoRa.packetRssi()); Serial.print(" dBm | SNR: ");
    Serial.print(LoRa.packetSnr()); Serial.println(" dB");

    afficherTrame(trame);

  } else if (taille_paquet_recu > 0) {
    Serial.print("Taille inattendue : ");
    Serial.print(taille_paquet_recu); Serial.println(" octets — ignoré");
  }
}
