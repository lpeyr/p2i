/*
 * semelle_connectee_poc.ino
 * ──────────────────────────────────────────────────────────────────────
 * Preuve de concept (PoC) : démonstration de la faisabilité du AvgStep
 * SANS LoRa et SANS GPS, uniquement avec IMU + FlexiForce.
 *
 * Matériel :
 *   - Arduino MKR WAN 1310  (LoRa non utilisée ici)
 *   - 3 capteurs FlexiForce (A0, A1, A2 — seuil binaire)
 *   - Grove IMU 9-DOF v2.0  (MPU9250, I2C 0x68)
 *
 * Comportement :
 *   1. Acquisition pendant COLLECT_MS millisecondes (20 s par défaut).
 *   2. Chaque échantillon stocké est ÉGALEMENT affiché en direct sur
 *      Serial pour faciliter le debug.
 *   3. À la fin, calcul + affichage de l'AvgStep : NB_AVGSTEP_POINTS
 *      points moyens (yaw, pitch, roll, accel, f1, f2, f3) sur tous les
 *      pas détectés dans la fenêtre.
 *
 * Tout se passe une seule fois dans setup(). loop() est volontairement
 * vide — reset la carte pour rejouer le PoC.
 * ──────────────────────────────────────────────────────────────────────
 */

#include <Arduino.h>
#include "FastIMU.h"
#include <Wire.h>
#include <SensorFusion.h>
#include <math.h>

// ═══════════════════════════════════════════════════════════════════════
//  CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════
#define PIN_FLEXI1        A0
#define PIN_FLEXI2        A1
#define PIN_FLEXI3        A2
#define FLEXI_SEUIL       900

#define COLLECT_MS        20000UL    // fenêtre de collecte = 20 s
#define IMU_FUSION_MS     40         // fusion Madgwick à 25 Hz (40 ms)
#define STORE_RATIO       4          // 1 échantillon stocké sur 4 → ~6,25 Hz
#define NB_AVGSTEP_POINTS 10         // nb de points dans l'AvgStep final

#define MAX_SAMPLES       200        // 6,25 Hz × 20 s = 125, marge OK
#define MAX_STOMPS        50

#define IMU_ADDRESS       0x68

// Commenter pour sauter la calibration (utile pour itérer rapidement)
//#define PERFORM_CALIBRATION

// ═══════════════════════════════════════════════════════════════════════
//  STRUCTURES
// ═══════════════════════════════════════════════════════════════════════
typedef struct {
  float yaw;
  float pitch;
  float roll;
  float accelNorm;
  bool  f1;
  bool  f2;
  bool  f3;
} Sample;

// ═══════════════════════════════════════════════════════════════════════
//  GLOBALES
// ═══════════════════════════════════════════════════════════════════════
MPU9250   imuChip;
SF        fusion;
calData   calib = { 0 };
AccelData accelData;
GyroData  gyroData;
MagData   magData;

Sample    samples[MAX_SAMPLES];
int       sampleCount = 0;

int       stompIdx[MAX_STOMPS];
int       stompCount     = 0;
bool      prevAllPressed = false;

// ═══════════════════════════════════════════════════════════════════════
//  CALIBRATION (identique à capteur-imu.ino)
// ═══════════════════════════════════════════════════════════════════════
void performCalibration() {
  if (imuChip.hasMagnetometer()) {
    Serial.println("Calibration magnéto : bouger l'IMU en huit...");
    delay(3000);
    imuChip.calibrateMag(&calib);
    Serial.println("Calibration magnéto : OK");
    delay(1000);
  }

  Serial.println("Calibration accéléro/gyro : maintenir l'IMU à plat...");
  delay(3000);
  imuChip.calibrateAccelGyro(&calib);
  Serial.println("Calibration accéléro/gyro : OK");

  imuChip.init(calib, IMU_ADDRESS);
  delay(500);
}

// ═══════════════════════════════════════════════════════════════════════
//  COLLECTE — fusion 25 Hz + stockage/affichage ~6,25 Hz
// ═══════════════════════════════════════════════════════════════════════
void collectData() {
  Serial.println();
  Serial.println("────────── Début de la collecte ──────────");
  Serial.print  ("Durée : "); Serial.print(COLLECT_MS / 1000UL);
  Serial.println(" s");
  Serial.println();
  Serial.println("idx |  yaw   pitch   roll   |accel| | f1 f2 f3");
  Serial.println("----+-------------------------------+---------");

  unsigned long tStart      = millis();
  unsigned long tLastFusion = tStart;
  int fusionTick = 0;

  while (millis() - tStart < COLLECT_MS) {
    unsigned long now = millis();

    if (now - tLastFusion >= IMU_FUSION_MS) {
      tLastFusion = now;

      imuChip.update();
      imuChip.getAccel(&accelData);
      imuChip.getGyro (&gyroData);
      imuChip.getMag  (&magData);

      float dt = fusion.deltatUpdate();
      fusion.MadgwickUpdate(
        gyroData.gyroX * (PI / 180.0f),
        gyroData.gyroY * (PI / 180.0f),
        gyroData.gyroZ * (PI / 180.0f),
        accelData.accelX, accelData.accelY, accelData.accelZ,
        magData.magX,     magData.magY,     magData.magZ,
        dt
      );

      fusionTick++;
      if (fusionTick >= STORE_RATIO) {
        fusionTick = 0;

        if (sampleCount < MAX_SAMPLES) {
          Sample &s = samples[sampleCount];

          s.yaw       = fusion.getYaw();
          s.pitch     = fusion.getPitch();
          s.roll      = fusion.getRoll();
          s.accelNorm = sqrtf(
              accelData.accelX * accelData.accelX +
              accelData.accelY * accelData.accelY +
              accelData.accelZ * accelData.accelZ);

          int rawF1 = analogRead(PIN_FLEXI1);
          int rawF2 = analogRead(PIN_FLEXI2);
          int rawF3 = analogRead(PIN_FLEXI3);

          s.f1 = rawF1 > FLEXI_SEUIL;
          s.f2 = rawF2 > FLEXI_SEUIL;
          s.f3 = rawF3 > FLEXI_SEUIL;

          /*Serial.print("raw: ");
          Serial.print(rawF1); Serial.print(" ");
          Serial.print(rawF2); Serial.print(" ");
          Serial.println(rawF3);
          */

          // ── Affichage live ──
          Serial.print(sampleCount);    Serial.print("\t| ");
          Serial.print(s.yaw,       1); Serial.print("\t");
          Serial.print(s.pitch,     1); Serial.print("\t");
          Serial.print(s.roll,      1); Serial.print("\t");
          Serial.print(s.accelNorm, 2); Serial.print("\t| ");
          Serial.print(s.f1);           Serial.print("  ");
          Serial.print(s.f2);           Serial.print("  ");
          Serial.println(s.f3);

          // ── Détection stomp : transition not-all → all-pressed ──
          bool allPressed = s.f1 && s.f2 && s.f3;
          if (allPressed && !prevAllPressed && stompCount < MAX_STOMPS) {
            stompIdx[stompCount++] = sampleCount;
            Serial.print("    → STOMP #"); Serial.print(stompCount);
            Serial.print(" à idx ");      Serial.println(sampleCount);
          }
          prevAllPressed = allPressed;

          sampleCount++;
        }
      }
    }
  }

  Serial.println("────────── Fin de la collecte ──────────");
  Serial.print  ("Échantillons stockés : "); Serial.println(sampleCount);
  Serial.print  ("Stomps détectés      : "); Serial.println(stompCount);
}

// ═══════════════════════════════════════════════════════════════════════
//  AVG-STEP — moyenne sur tous les pas (entre 2 stomps consécutifs)
// ═══════════════════════════════════════════════════════════════════════
void computeAndPrintAvgStep() {
  Serial.println();
  Serial.println("────────── Calcul de l'AvgStep ──────────");

  if (stompCount < 2) {
    Serial.println("Pas assez de stomps détectés (<2). Aucun pas complet.");
    Serial.println("→ AvgStep non calculable.");
    return;
  }

  int numSteps = stompCount - 1;

  float sumYawSin[NB_AVGSTEP_POINTS] = {0};
  float sumYawCos[NB_AVGSTEP_POINTS] = {0};
  float sumPitch [NB_AVGSTEP_POINTS] = {0};
  float sumRoll  [NB_AVGSTEP_POINTS] = {0};
  float sumAccel [NB_AVGSTEP_POINTS] = {0};
  float sumF1    [NB_AVGSTEP_POINTS] = {0};
  float sumF2    [NB_AVGSTEP_POINTS] = {0};
  float sumF3    [NB_AVGSTEP_POINTS] = {0};
  int   validSteps = 0;

  for (int s = 0; s < numSteps; s++) {
    int startI  = stompIdx[s];
    int endI    = stompIdx[s + 1];
    int stepLen = endI - startI;
    if (stepLen < 2) continue;

    for (int p = 0; p < NB_AVGSTEP_POINTS; p++) {
      // Interpolation linéaire entre les échantillons du pas
      float frac = (float)p / (float)(NB_AVGSTEP_POINTS - 1);
      float fi   = startI + frac * (stepLen - 1);
      int   lo   = (int)fi;
      int   hi   = min(lo + 1, sampleCount - 1);
      float t    = fi - (float)lo;

      sumPitch[p] += samples[lo].pitch     * (1.0f - t) + samples[hi].pitch     * t;
      sumRoll [p] += samples[lo].roll      * (1.0f - t) + samples[hi].roll      * t;
      sumAccel[p] += samples[lo].accelNorm * (1.0f - t) + samples[hi].accelNorm * t;

      // FlexiForce : moyenne linéaire des bools (→ fraction dans [0,1])
      sumF1[p] += (float)samples[lo].f1 * (1.0f - t) + (float)samples[hi].f1 * t;
      sumF2[p] += (float)samples[lo].f2 * (1.0f - t) + (float)samples[hi].f2 * t;
      sumF3[p] += (float)samples[lo].f3 * (1.0f - t) + (float)samples[hi].f3 * t;

      // Yaw : moyenne circulaire via sin/cos
      // https://en.wikipedia.org/wiki/Mean_of_circular_quantities
      float loYawRad = samples[lo].yaw * (PI / 180.0f);
      float hiYawRad = samples[hi].yaw * (PI / 180.0f);
      sumYawSin[p] += sinf(loYawRad) * (1.0f - t) + sinf(hiYawRad) * t;
      sumYawCos[p] += cosf(loYawRad) * (1.0f - t) + cosf(hiYawRad) * t;
    }
    validSteps++;
  }

  if (validSteps == 0) {
    Serial.println("Aucun pas valide (tous trop courts). → AvgStep vide.");
    return;
  }

  Serial.print(validSteps);          Serial.print(" pas moyennés sur ");
  Serial.print(NB_AVGSTEP_POINTS);   Serial.println(" points");
  Serial.println();
  Serial.println("pt |  yaw   pitch   roll   |accel| |  f1    f2    f3");
  Serial.println("---+-------------------------------+-----------------");

  for (int p = 0; p < NB_AVGSTEP_POINTS; p++) {
    float avgYawDeg = atan2f(sumYawSin[p], sumYawCos[p]) * (180.0f / PI);
    if (avgYawDeg < 0.0f) avgYawDeg += 360.0f;

    float avgPitch = sumPitch[p] / validSteps;
    float avgRoll  = sumRoll [p] / validSteps;
    float avgAccel = sumAccel[p] / validSteps;
    float avgF1    = sumF1   [p] / validSteps;
    float avgF2    = sumF2   [p] / validSteps;
    float avgF3    = sumF3   [p] / validSteps;

    Serial.print(p);             Serial.print("\t|");
    Serial.print(avgYawDeg, 1);  Serial.print("\t");
    Serial.print(avgPitch,  1);  Serial.print("\t");
    Serial.print(avgRoll,   1);  Serial.print("\t");
    Serial.print(avgAccel,  2);  Serial.print("\t| ");
    Serial.print(avgF1, 2);      Serial.print("  ");
    Serial.print(avgF2, 2);      Serial.print("  ");
    Serial.println(avgF3, 2);
  }

  Serial.println();
  Serial.println("Note : f1/f2/f3 ∈ [0.0, 1.0] = fraction des pas où le");
  Serial.println("capteur est pressé à cette phase du pas.");
}

// ═══════════════════════════════════════════════════════════════════════
//  SETUP — tout le PoC est ici
// ═══════════════════════════════════════════════════════════════════════
void setup() {
  pinMode(PIN_FLEXI1, INPUT);
  pinMode(PIN_FLEXI2, INPUT);
  pinMode(PIN_FLEXI3, INPUT);

  Serial.begin(115200);
  // Attente du moniteur Serial USB, max 5 s (sinon on continue)
  unsigned long tWait = millis();
  while (!Serial && millis() - tWait < 5000);

  Serial.println();
  Serial.println("════════════════════════════════════════════════════════");
  Serial.println("  Semelle connectée — PoC AvgStep (Serial uniquement)");
  Serial.println("════════════════════════════════════════════════════════");

  // ── IMU ──
  Wire.begin();
  Wire.setClock(400000);

  int imuErr = imuChip.init(calib, IMU_ADDRESS);
  if (imuErr != 0) {
    Serial.print("Erreur init IMU : "); Serial.println(imuErr);
    Serial.println("Arrêt du PoC.");
    while (true);
  }
  Serial.println("Init IMU : OK");

  #ifdef PERFORM_CALIBRATION
    performCalibration();
  #else
    Serial.println("Calibration : SAUTÉE (PERFORM_CALIBRATION non défini)");
  #endif

  // ── Collecte des données ──
  collectData();

  // ── Calcul et affichage de l'AvgStep ──
  computeAndPrintAvgStep();

  Serial.println();
  Serial.println("════════════════════════════════════════════════════════");
  Serial.println("  PoC terminée. Reset la carte pour rejouer.");
  Serial.println("════════════════════════════════════════════════════════");
}

// ═══════════════════════════════════════════════════════════════════════
//  LOOP — vide, le PoC s'exécute une seule fois
// ═══════════════════════════════════════════════════════════════════════
void loop() {
  // Volontairement vide.
}
