#include <SPI.h>
#include <LoRa.h>

#define NB_IMU        20
#define NB_FLEX_OCT   5 
#define DELTA_SEND_MS 20000
#define FREQUENCY     862e6
#define SF            8
#define BW            125e3
#define CR            5
#define POWER         10



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
float latitude  = 0.0;
float longitude = 0.0;


Trame_complet trame;


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