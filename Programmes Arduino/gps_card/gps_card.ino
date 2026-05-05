#include <Arduino.h>
#include <MKRWAN.h>

#define SECRET_APP_EUI "221C221C221C221C"
#define SECRET_APP_KEY "A1B2C3A1B2C3D4E5F6D4E5F677889900"
#define flexi1 A0
#define flexi2 A1
#define flexi3 A2

LoRaModem modem;

typedef struct __attribute__((packed)) { 

  int flexiforce1;
  int flexiforce2;
  int flexiforce3;
} Tramet;


void setup() {

  pinMode(flexi1, INPUT);
  pinMode(flexi2, INPUT);
  pinMode(flexi3, INPUT);
  Serial.begin(9600);

  bool lora_on = modem.begin(EU868);
  if (lora_on)
    Serial.println("Démarrage du module LoRaWAN ... OK"); 
  else
    Serial.println("Démarrage du module LoRaWAN ...Echec");

  Serial.print("Mon device EUI est: ");
  Serial.println(modem.deviceEUI());
  Serial.flush();

  bool connected_to_lorawan = modem.joinOTAA(SECRET_APP_EUI, SECRET_APP_KEY);

  if (connected_to_lorawan)
    Serial.println(F("Connexion au réseau LoRaWAN ... Ok"));
  else
    Serial.println(F("Connexion au réseau LoRaWAN ...Echec"));

  Serial.println(F("Mon DevAddr est :"));
  Serial.println(modem.getDevAddr());
}

void loop() {

  Tramet trame;
  trame.flexiforce1 = analogRead(flexi1);
  trame.flexiforce2 = analogRead(flexi2);
  trame.flexiforce3 = analogRead(flexi3);
  

  modem.setADR(false); //systeme embarqué mobile

  modem.beginPacket();

  modem.write((uint8_t*)&trame, sizeof(trame));
  int err = modem.endPacket();

  if (err > 0){
    Serial.println("Message envoyé correctement");
    Serial.println(analogRead(flexi1));
    Serial.println(analogRead(flexi2));
    Serial.println(analogRead(flexi3));

  }else{
    Serial.println("Erreur d'envoi");
  }

  delay(20000);

}








