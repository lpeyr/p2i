#include <Arduino.h>
#include <SPI.h>
#include <LoRa.h>
#include <FastIMU.h>
#include <SensorFusion.h>
#include <Wire.h>
#include <math.h>
#include <TinyGPS++.h>


#define NB_IMU        20
#define NB_FLEX_OCT   5 
#define DELTA_SEND_MS 20000
#define FREQUENCY     862e6
#define SF            8
#define BW            125e3
#define CR            5
#define POWER         10

typedef struct __attribute__((packed)) {
  uint8_t  identifiant;             // 1 octet
  uint32_t timestamp;               // 4 octets
  uint8_t  bits_f1[NB_FLEX_OCT];    // 5 octets
  uint8_t  bits_f2[NB_FLEX_OCT];    // 5 octets
  uint8_t  bits_f3[NB_FLEX_OCT];    // 5 octets
  uint16_t gps[2];                  // 4 octets — [0]=lat, [1]=lng
  int16_t  imu_acc[NB_IMU];         // 40 octets
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
float[3] tabAngleIMU


bool lireGPS(unsigned long timeout_ms) {
  unsigned long debut = millis();
  while (millis() - debut < timeout_ms) {
    while (Serial1.available()) {
      char c = Serial1.read();
      if (gps.encode(c)) {
        if (gps.location.isValid()) {
          return true;
        }
      }
    }
  }
  return false;
}


void gpsVal() {
  bool gps_ok = lireGPS(5000);
  if (gps_ok) {

    trame.gps[0] = (uint16_t)(gps.location.lat()  * 100);
    trame.gps[1] = (uint16_t)(gps.location.lng() * 100);
  };
}

void flexi_val(){
  bool val1 = analogRead(flexi1) < SEUIL;
  bool val2 = analogRead(flexi2) < SEUIL;
  bool val3 = analogRead(flexi3) < SEUIL;
  setBit(trame.bits_f1, nb_mesure_actuel, val1);
  setBit(trame.bits_f2, nb_mesure_actuel, val2);
  setBit(trame.bits_f3, nb_mesure_actuel, val3);
}

void imuValAccel(){
  IMU.update();
  IMU.getAccel(&accelData);
  IMU.getGyro(&gyroData);
  IMU.getMag(&magData);

  deltat = fusion.deltaUpdate();
  // Algo pour tenir compte des angles dans le calcul de vitesse
  fusion.MadgwickUpdate(
    gyroData.gyroX * PI / 180.0f,
    gyroData.gyroY * PI / 180.0f,
    gyroData.gyroZ * PI / 180.0f,
    accelData.accelX, accelData.accelY, accelData.accelZ,
    magData.magX, magData.magY, magData.magZ,
    deltat
  );

  // Les angles
  float roll =  fusion.getRoll() * PI / 180.0f;
  float pitch = fusion.getPitch() * PI / 180.0f;
  float yaw =  fusion.getyaw() * PI / 180.0f;

  float gravX =  sin(pitch) * 9.81f;
  float gravY = -cos(pitch) * sin(roll) * 9.81f;
  float gravZ = -cos(pitch) * cos(roll) * 9.81f;

  // Soustraction gravité
  float linX = accelData.accelX - gravX;
  float linY = accelData.accelY - gravY;
  float linZ = accelData.accelZ - gravZ;

  float norme = sqrt(linX*linX + linY*linY + linZ*linZ);

  trame.imu_acc[nb_imu_actuel] = (uint16_t)(norme * 100);
  nb_imu_actuel++;
}

void imuValAngle(){
  IMU.update();
  IMU.getAccel(&accelData);
  IMU.getGyro(&gyroData);
  IMU.getMag(&magData);

  deltat = fusion.deltaUpdate();
  // Algo pour tenir compte des angles dans le calcul de vitesse
  fusion.MadgwickUpdate(
    gyroData.gyroX * PI / 180.0f,
    gyroData.gyroY * PI / 180.0f,
    gyroData.gyroZ * PI / 180.0f,
    accelData.accelX, accelData.accelY, accelData.accelZ,
    magData.magX, magData.magY, magData.magZ,
    deltat
  );

  // Les angles
  float roll =  fusion.getRoll() * PI / 180.0f;
  float pitch = fusion.getPitch() * PI / 180.0f;
  float yaw =  fusion.getYaw() * PI / 180.0f;

  tabAngleIMU[0] = roll;
  tabAngleIMU[1] = pitch;
  tabAngleIMU[2] = yaw;
  
}


void remplir_trame() {
  memset(&trame, 0, sizeof(trame));
  trame.identifiant = 1;
  nb_imu_actuel = 0;
  nb_mesure_actuel = 0;

  gpsVal();   // timestamp + coordonnées

  for (int i = 0; i < nb_mesures; i++) {
    imuVal();    // norme accélération → imu_acc[i]
    flexiVal();  // bits flex
    nb_mesure_actuel++;
  }
}


void envoyerTrame() {

  // Simulation accélération (norme ×100, résolution 0.01 m/s²)
  for (int i = 0; i < NB_IMU; i++) {
    trame.imu_acc[i] = (int16_t)((9.81f + 0.05f * (i % 5)) * 100);
  }

  unsigned long t0 = micros();
  LoRa.beginPacket();
  LoRa.write((uint8_t*)&trame, sizeof(trame));
  bool ok = LoRa.endPacket();
  float duree_ms = (micros() - t0) / 1000.0;

  Serial.print("Paquet #"); Serial.print(compteur);
  Serial.print(" | "); Serial.print(sizeof(Trame_complet)); Serial.print(" octets");
  Serial.print(" | Temps TX : "); Serial.print(duree_ms, 2); Serial.print(" ms");
  Serial.print(" | "); Serial.println(ok ? "OK ✓" : "ECHEC ✗");

  compteur++;
}


void setup() {
  Serial.begin(9600);
  Serial1.begin(9600)
  delay(3000);
  Serial.println("=== TX Simple ===");
  Serial.print("Taille trame : "); Serial.print(sizeof(Trame_complet)); Serial.println(" octets");

  if (!LoRa.begin(FREQUENCY)) {
    Serial.println("ERREUR LoRa !");
    while (true);
  }

  LoRa.setTxPower(POWER);
  LoRa.setSpreadingFactor(SF);
  LoRa.setSignalBandwidth(BW);
  LoRa.setCodingRate4(CR);
  LoRa.setPreambleLength(8);

  Serial.println("LoRa OK !");
  envoyerTrame();
  t_dernier_envoi = millis();
}


void loop() {
  if (millis() - t_dernier_envoi >= DELTA_SEND_MS) {
    envoyerTrame();
    t_dernier_envoi = millis();
  }
}
