#include <Arduino.h>
#include <MKRWAN.h>

#define SECRET_APP_EUI "221C221C221C221C"
#define SECRET_APP_KEY "A1B2C3A1B2C3D4E5F6D4E5F677889900"
#define flexi1 A0
#define flexi2 A1
#define flexi3 A2
#define nb_mesures 20

// ✅ Struct définie EN PREMIER
typedef struct __attribute__((packed)) {
  int16_t flexiforce1[20];
  int16_t flexiforce2[20];
  int16_t flexiforce3[20];
} Tramet;

// ✅ Variables globales APRÈS la struct
LoRaModem modem;
Tramet trame;
int nb_mesure_actuel = 0;

void setup() {
  pinMode(flexi1, INPUT);
  pinMode(flexi2, INPUT);
  pinMode(flexi3, INPUT);
  Serial.begin(9600);

  bool lora_on = modem.begin(EU868);
  if (lora_on) Serial.println("Démarrage du module LoRaWAN ... OK");
  else Serial.println("Démarrage du module LoRaWAN ... Echec");

  Serial.print("Mon device EUI est: ");
  Serial.println(modem.deviceEUI());
  Serial.flush();

  bool connected_to_lorawan = modem.joinOTAA(SECRET_APP_EUI, SECRET_APP_KEY);
  if (connected_to_lorawan) Serial.println(F("Connexion au réseau LoRaWAN ... Ok"));
  else Serial.println(F("Connexion au réseau LoRaWAN ... Echec"));

  Serial.println(F("Mon DevAddr est :"));
  Serial.println(modem.getDevAddr());
}

void loop() {
  trame.flexiforce1[nb_mesure_actuel] = analogRead(flexi1);
  trame.flexiforce2[nb_mesure_actuel] = analogRead(flexi2);
  trame.flexiforce3[nb_mesure_actuel] = analogRead(flexi3);
  nb_mesure_actuel++;  // ✅ orthographe correcte

  if (nb_mesure_actuel >= nb_mesures) {
    modem.setADR(false);
    modem.beginPacket();
    modem.write((uint8_t*)&trame, sizeof(trame));
    int err = modem.endPacket();

    if (err > 0) {
      Serial.println("Message envoyé correctement");
      for (int i = 0; i < nb_mesures; i++) {  // ✅ boucle pour afficher
        Serial.print(trame.flexiforce1[i]); Serial.print(" / ");
        Serial.print(trame.flexiforce2[i]); Serial.print(" / ");
        Serial.println(trame.flexiforce3[i]);
      }
    } else {
      Serial.println("Erreur d'envoi");
    }

    nb_mesure_actuel = 0;  // ✅ remise à zéro dans les deux cas
  }

  delay(1000);
}