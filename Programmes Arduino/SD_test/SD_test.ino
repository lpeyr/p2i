/*
 * ============================================================
 *  IMU CSV Logger → MKR SD Proto Shield (TSX00004)
 *
 *  Format fichier imu.txt :
 *    yaw;pitch;roll
 *    233.60;12.34;-5.67
 *    101.66;8.21;-3.12
 *    ...
 *
 *  CS pin  : 4
 *  Biblio  : SD (built-in) — aucune autre lib requise
 * ============================================================
 */

#include <SPI.h>
#include <SD.h>

#define SD_CS_PIN       4
#define OUTPUT_FILE     "imu.txt"
#define NB_SAMPLES      50
#define SAMPLE_DELAY_MS 100

// ── RNG maison (LCG) ──────────────────────────────────────────────────────
static uint32_t _rng = 1337;
float lcg() {
  _rng = _rng * 1664525UL + 1013904223UL;
  return ((float)(int32_t)(_rng >> 1)) / 1073741823.0f;
}
float gauss(float scale) {
  return (lcg() + lcg() + lcg()) / 3.0f * scale;
}

// ── Etat courant des angles ───────────────────────────────────────────────
float _roll = 0.0f, _pitch = 0.0f, _yaw = 0.0f;

void readIMU(float &roll, float &pitch, float &yaw) {
  // ---- SIMULATION (remplacer par ta lib IMU réelle) ----
  _roll  += gauss(2.5f);
  _pitch += gauss(2.0f);
  _yaw   += gauss(1.5f);
  if (_roll  >  180.0f) _roll  =  180.0f;
  if (_roll  < -180.0f) _roll  = -180.0f;
  if (_pitch >   90.0f) _pitch =   90.0f;
  if (_pitch <  -90.0f) _pitch =  -90.0f;
  while (_yaw >= 360.0f) _yaw -= 360.0f;
  while (_yaw <    0.0f) _yaw += 360.0f;
  roll = _roll; pitch = _pitch; yaw = _yaw;
  // ---- FIN SIMULATION ----

  /* ---- VRAI IMU (ex: MPU-6050) ----
  roll  = mpu.getAngleX();
  pitch = mpu.getAngleY();
  yaw   = mpu.getAngleZ();
  ---------------------------------- */
}

// ── Float → string fiable sur SAMD ───────────────────────────────────────
String ftos(float v) {
  char buf[12];
  int entier = (int)v;
  int dec    = (int)(fabsf(v - (float)entier) * 100.0f + 0.5f);
  if (dec >= 100) { entier += (v >= 0) ? 1 : -1; dec -= 100; }
  if (v < 0 && entier == 0)
    snprintf(buf, sizeof(buf), "-0.%02d", dec);
  else
    snprintf(buf, sizeof(buf), "%d.%02d", entier, dec);
  return String(buf);
}

// ── Setup ─────────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  while (!Serial);

  Serial.println("=== IMU CSV Logger ===\n");

  // — Init SD —
  Serial.print("[1/3] Init SD (CS="); Serial.print(SD_CS_PIN); Serial.print(")... ");
  if (!SD.begin(SD_CS_PIN)) {
    Serial.println("ECHEC ! Carte absente ou non FAT32.");
    while (true);
  }
  Serial.println("OK");

  // — Supprime l'ancien fichier —
  if (SD.exists(OUTPUT_FILE)) {
    SD.remove(OUTPUT_FILE);
    Serial.println("   (ancien fichier supprime)");
  }

  // — Crée le fichier et écrit l'en-tête —
  Serial.print("[2/3] Creation fichier + en-tete... ");
  File f = SD.open(OUTPUT_FILE, FILE_WRITE);
  if (!f) {
    Serial.println("ECHEC ouverture fichier !");
    while (true);
  }
  f.println("yaw;pitch;roll");   // ← ligne d'en-tête
  f.flush();
  Serial.println("OK");
  Serial.println("   En-tete ecrit : yaw;pitch;roll");

  // — Acquisition + écriture ligne par ligne —
  Serial.print("\n[3/3] Acquisition + ecriture (");
  Serial.print(NB_SAMPLES);
  Serial.println(" mesures)...\n");
  Serial.println("  yaw       ; pitch     ; roll");
  Serial.println("  ----------;-----------;----------");

  for (int i = 0; i < NB_SAMPLES; i++) {
    float roll, pitch, yaw;
    readIMU(roll, pitch, yaw);

    // Ecriture sur SD
    f.print(ftos(yaw));   f.print(";");
    f.print(ftos(pitch)); f.print(";");
    f.println(ftos(roll));

    // Affichage moniteur série
    Serial.print("  ");
    Serial.print(ftos(yaw));   Serial.print("\t; ");
    Serial.print(ftos(pitch)); Serial.print("\t; ");
    Serial.println(ftos(roll));

    delay(SAMPLE_DELAY_MS);
  }

  f.flush();
  f.close();

  // — Vérification —
  File fv = SD.open(OUTPUT_FILE, FILE_READ);
  if (fv) {
    Serial.print("\nTaille fichier : ");
    Serial.print(fv.size());
    Serial.println(" octets");
    fv.close();
  }

  Serial.println("\n=== Termine ! Fichier imu.txt pret sur la SD ===");
}

void loop() {}
