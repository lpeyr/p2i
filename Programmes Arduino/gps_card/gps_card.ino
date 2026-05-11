#include <Arduino.h>
#include <MKRWAN.h>

#define SECRET_APP_EUI  "221C221C221C221C"
#define SECRET_APP_KEY  "A1B2C3A1B2C3D4E5F6D4E5F677889900"
#define flexi1          A0
#define flexi2          A1
#define flexi3          A2
#define nb_mesures      120
#define DUREE_TOTALE_MS 60000
#define SEUIL           950
#define TAILLE_PAYLOAD  8

typedef struct __attribute__((packed)) {
  uint8_t bits[TAILLE_PAYLOAD];
} Tramet; // test

LoRaModem modem;
Tramet trame;
int nb_mesure_actuel = 0;

void setBit(uint8_t* tableau, int pos, bool valeur) {
  int octet = pos / 8;
  int bit   = pos % 8;
  if (valeur)
    tableau[octet] |=  (1 << bit);
  else
    tableau[octet] &= ~(1 << bit);
}

// Fait clignoter la LED D6 (LED_BUILTIN) nb_fois fois
void clignote(int nb_fois, int duree_ms) {
  for (int i = 0; i < nb_fois; i++) {
    digitalWrite(LED_BUILTIN, HIGH);  // allumée
    delay(duree_ms);
    digitalWrite(LED_BUILTIN, LOW);   // éteinte
    delay(duree_ms);
  }
}

void setup() {
  pinMode(flexi1, INPUT);
  pinMode(flexi2, INPUT);
  pinMode(flexi3, INPUT);

  // D6 = LED_BUILTIN selon datasheet MKR WAN 1310
  pinMode(LED_BUILTIN, OUTPUT);
  digitalWrite(LED_BUILTIN, LOW);  // éteinte au démarrage

  Serial.begin(9600);

  bool lora_on = modem.begin(EU868);
  if (lora_on) Serial.println("Démarrage du module LoRaWAN ... OK");
  else Serial.println("Démarrage du module LoRaWAN ... Echec");

  Serial.print("Mon device EUI est: ");
  Serial.println(modem.deviceEUI());
  Serial.flush();

  bool connected_to_lorawan = modem.joinOTAA(SECRET_APP_EUI, SECRET_APP_KEY);
  if (connected_to_lorawan) {
    Serial.println(F("Connexion au réseau LoRaWAN ... Ok"));
    clignote(1, 1000);  // 1 clignotement long = connexion OK
  } else {
    Serial.println(F("Connexion au réseau LoRaWAN ... Echec"));
    clignote(5, 100);   // 5 clignotements rapides = connexion échouée
  }

  Serial.println(F("Mon DevAddr est :"));
  Serial.println(modem.getDevAddr());

  memset(trame.bits, 0, sizeof(trame.bits));
}

void loop() {
  bool val1 = analogRead(flexi1) < SEUIL;
  bool val2 = analogRead(flexi2) < SEUIL;
  bool val3 = analogRead(flexi3) < SEUIL;

  setBit(trame.bits, nb_mesure_actuel,      val1);
  setBit(trame.bits, nb_mesure_actuel + 20, val2);
  setBit(trame.bits, nb_mesure_actuel + 40, val3);

  Serial.print("Mesure "); Serial.print(nb_mesure_actuel + 1);
  Serial.print("/"); Serial.print(nb_mesures);
  Serial.print(" → f1:"); Serial.print(val1);
  Serial.print(" f2:"); Serial.print(val2);
  Serial.print(" f3:"); Serial.println(val3);

  nb_mesure_actuel++;

  if (nb_mesure_actuel >= nb_mesures) {
    modem.setADR(false);
    modem.dataRate(3); 
    modem.beginPacket();
    modem.write(trame.bits, sizeof(trame.bits));
    int err = modem.endPacket();

    if (err > 0) {
      Serial.println("=== Envoi OK ! ===");
      clignote(1, 500);   // 1 clignotement lent = envoi réussi ✅
      for (int i = 0; i < nb_mesures; i++) {
        Serial.print("Mesure "); Serial.print(i + 1);
        Serial.print(" → f1:"); Serial.print((trame.bits[i / 8] >> (i % 8)) & 1);
        Serial.print(" f2:"); Serial.print((trame.bits[(i + 20) / 8] >> ((i + 20) % 8)) & 1);
        Serial.print(" f3:"); Serial.println((trame.bits[(i + 40) / 8] >> ((i + 40) % 8)) & 1);
      }
    } else {
      Serial.println("Erreur d'envoi");
      clignote(3, 100);   // 3 clignotements rapides = envoi échoué ❌
      Serial.println(err);
    }

    memset(trame.bits, 0, sizeof(trame.bits));
    nb_mesure_actuel = 0;
  }

  delay(DUREE_TOTALE_MS / nb_mesures);
}