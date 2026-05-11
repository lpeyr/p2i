#include <Arduino.h>
#include <MKRWAN.h>
#include <TinyGPSPlus.h>

#define SECRET_APP_EUI  "221C221C221C221C"
#define SECRET_APP_KEY  "A1B2C3A1B2C3D4E5F6D4E5F677889900"
#define flexi1          A0
#define flexi2          A1
#define flexi3          A2
#define NB_MESURES      120
#define NB_GPS          6
#define DELTA_T_MS      500
#define SEUIL           950
#define GPS_TIMEOUT_MS  5000

typedef struct __attribute__((packed)) {
  uint32_t timestamp;             // 4  — Unix timestamp 1ère mesure
  uint16_t delta_t_ms;            // 2  — 500 ms
  int32_t  gps_lat[NB_GPS];       // 24 — 6 latitudes × 4 octets
  int32_t  gps_lng[NB_GPS];       // 24 — 6 longitudes × 4 octets
  uint8_t  bits_f1[15];           // 15 — 120 bits flexiforce 1
  uint8_t  bits_f2[15];           // 15 — 120 bits flexiforce 2
  uint8_t  bits_f3[15];           // 15 — 120 bits flexiforce 3
} Tramet; // 99 octets

LoRaModem modem;
TinyGPSPlus gps;
Tramet trame;
int nb_mesure_actuel = 0;
int nb_gps_actuel = 0;

// --- Helpers ---

void setBit(uint8_t* tableau, int pos, bool valeur) {
  int octet = pos / 8;
  int bit   = pos % 8;
  if (valeur) tableau[octet] |=  (1 << bit);
  else        tableau[octet] &= ~(1 << bit);
}

void clignote(int nb_fois, int duree_ms) {
  for (int i = 0; i < nb_fois; i++) {
    digitalWrite(LED_BUILTIN, HIGH);
    delay(duree_ms);
    digitalWrite(LED_BUILTIN, LOW);
    delay(duree_ms);
  }
}

uint32_t gpsToTimestamp(TinyGPSDate &d, TinyGPSTime &t) {
  uint16_t y = d.year();
  uint8_t  m = d.month();
  uint8_t  day = d.day();
  uint32_t days = (y - 1970) * 365UL + (y - 1969) / 4;
  uint8_t mdays[] = {31,28,31,30,31,30,31,31,30,31,30,31};
  for (int i = 0; i < m - 1; i++) days += mdays[i];
  days += day - 1;
  return days * 86400UL + t.hour() * 3600UL + t.minute() * 60UL + t.second();
}

bool lireGPS(unsigned long timeout_ms) {
  unsigned long debut = millis();
  while (millis() - debut < timeout_ms) {
    while (Serial1.available()) {
      if (gps.encode(Serial1.read())) {
        if (gps.location.isValid() && gps.date.isValid() && gps.time.isValid())
          return true;
      }
    }
  }
  return false;
}

// --- Setup ---

void setup() {
  pinMode(flexi1, INPUT);
  pinMode(flexi2, INPUT);
  pinMode(flexi3, INPUT);
  pinMode(LED_BUILTIN, OUTPUT);
  digitalWrite(LED_BUILTIN, LOW);

  Serial.begin(9600);
  Serial1.begin(9600); // GPS

  bool lora_on = modem.begin(EU868);
  if (lora_on) Serial.println("Démarrage LoRaWAN ... OK");
  else         Serial.println("Démarrage LoRaWAN ... Echec");

  Serial.print("Device EUI: ");
  Serial.println(modem.deviceEUI());
  Serial.flush();

  bool connected = modem.joinOTAA(SECRET_APP_EUI, SECRET_APP_KEY);
  if (connected) {
    Serial.println(F("Connexion LoRaWAN ... OK"));
    clignote(1, 1000);
  } else {
    Serial.println(F("Connexion LoRaWAN ... Echec"));
    clignote(5, 100);
  }

  Serial.println(modem.getDevAddr());

  memset(&trame, 0, sizeof(trame));
  trame.delta_t_ms = DELTA_T_MS;
}

// --- Loop ---

void loop() {
  // Toutes les 20 mesures (soit toutes les 10s) → lecture GPS
  if (nb_mesure_actuel % 20 == 0 && nb_gps_actuel < NB_GPS) {
    Serial.print("GPS #"); Serial.print(nb_gps_actuel + 1); Serial.println(" ...");
    bool gps_ok = lireGPS(GPS_TIMEOUT_MS);

    if (gps_ok) {
      trame.gps_lat[nb_gps_actuel] = (int32_t)(gps.location.lat() * 1000000);
      trame.gps_lng[nb_gps_actuel] = (int32_t)(gps.location.lng() * 1000000);
      if (nb_gps_actuel == 0)
        trame.timestamp = gpsToTimestamp(gps.date, gps.time);
      Serial.print("  lat: "); Serial.print(gps.location.lat(), 6);
      Serial.print("  lng: "); Serial.println(gps.location.lng(), 6);
    } else {
      trame.gps_lat[nb_gps_actuel] = 0;
      trame.gps_lng[nb_gps_actuel] = 0;
      Serial.println("  GPS INVALIDE");
    }
    nb_gps_actuel++;
  }

  // Lecture flexiforces
  bool val1 = analogRead(flexi1) < SEUIL;
  bool val2 = analogRead(flexi2) < SEUIL;
  bool val3 = analogRead(flexi3) < SEUIL;

  setBit(trame.bits_f1, nb_mesure_actuel, val1);
  setBit(trame.bits_f2, nb_mesure_actuel, val2);
  setBit(trame.bits_f3, nb_mesure_actuel, val3);

  Serial.print("Mesure "); Serial.print(nb_mesure_actuel + 1);
  Serial.print("/"); Serial.print(NB_MESURES);
  Serial.print(" → f1:"); Serial.print(val1);
  Serial.print(" f2:"); Serial.print(val2);
  Serial.print(" f3:"); Serial.println(val3);

  nb_mesure_actuel++;

  // Envoi après 120 mesures
  if (nb_mesure_actuel >= NB_MESURES) {
    modem.setADR(false);
    modem.dataRate(3);
    modem.beginPacket();
    modem.write((uint8_t*)&trame, sizeof(trame));
    int err = modem.endPacket();

    if (err > 0) {
      Serial.println("=== Envoi OK ! ===");
      clignote(1, 500);
    } else {
      Serial.print("Erreur d'envoi: ");
      Serial.println(err);
      clignote(3, 100);
    }

    memset(&trame, 0, sizeof(trame));
    trame.delta_t_ms = DELTA_T_MS;
    nb_mesure_actuel = 0;
    nb_gps_actuel = 0;
  }

  delay(DELTA_T_MS);
}
