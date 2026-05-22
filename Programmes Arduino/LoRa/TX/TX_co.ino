#include <Arduino.h>
#include <SPI.h>
#include <LoRa.h>
#include <FastIMU.h>
#include <SensorFusion.h>
#include <Wire.h>
#include <math.h>

#define flexi1          A0
#define flexi2          A1
#define flexi3          A2
#define NB_IMU        20
#define NB_FLEX_OCT   5 
#define DELTA_SEND_MS 20000
#define FREQUENCY     862e6
#define SF            8



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

// --- Objets ---

Trame_complet trame;
MPU9250 IMU;
AccelData accelData;
GyroData gyroData;
MagData magData;
calData calib = {0};
SF fusion;

// --- Vars ---
int compteur = 0;
unsigned long t_dernier_envoi = 0;
int nbr_imu_actuel = 0;

// --- Fonctions utilitaires ---

void setBit(uint8_t* tableau, int pos, bool valeur) {
  int octet = pos / 8;
  int bit   = pos % 8;
  if (valeur) tableau[octet] |=  (1 << bit);
  else        tableau[octet] &= ~(1 << bit);
}
// Lecture GPS
bool lireGPS(unsigned long timeout_ms) {
  unsigned long debut = millis();
  while (millis() - debut < timeout_ms) {
    while (Serial1.available()) {
      char c = Serial1.read();
      if (gps.encode(c)) {
        if (gps.location.isValid()) {

          latitude  = gps.location.lat();
          longitude = gps.location.lng();

          return true;
        }
      }
    }
  }
  return false;
}
// Update trame.gps[]
void gpsVal() {
  bool gps_ok = lireGPS(5000);
  if (gps_ok) {

    trame.gps[0] = (uint16_t)(latitude  * 100);
    trame.gps[1] = (uint16_t)(longitude * 100);
  }
}
void flexi_val(){
  bool val1 = analogRead(flexi1) < SEUIL;
  bool val2 = analogRead(flexi2) < SEUIL;
  bool val3 = analogRead(flexi3) < SEUIL;
  setBit(trame.bits_f1, nb_mesure_actuel, val1);
  setBit(trame.bits_f2, nb_mesure_actuel, val2);
  setBit(trame.bits_f3, nb_mesure_actuel, val3);
}
  // Lecture flexiforces

