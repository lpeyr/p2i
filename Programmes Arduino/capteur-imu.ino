#include "FastIMU.h"
#include <Wire.h>
#include <SensorFusion.h>
#include <math.h>

/* Uncomment your IMU type */
//#define IMU_6_DOF
#define IMU_9_DOF
//#define IMU_10_DOF

/* Uncomment if you want to perform calibration at start */
#define PERFORM_CALIBRATION

/* Uncomment if you want Euler angles instead of sensors data */
#define PERFORM_SENSOR_FUSION

#if defined(IMU_6_DOF)
  #define IMU_ADDRESS 0x6A
  LSM6DSL IMU; 
#elif defined(IMU_9_DOF)
  #define IMU_ADDRESS 0x68
  MPU9250 IMU; 
#elif defined(IMU_10_DOF)
  #define IMU_ADDRESS 0x68
  MPU9250 IMU; 
#else
  #error No IMU selected !
#endif

AccelData accelData;
GyroData gyroData;
MagData magData;

calData calib = { 0 };

SF fusion;
float yaw, pitch, roll, deltat;
float normeAccel;

void setup()
{
    Serial.begin(115200);
    while (!Serial);

    Wire.begin();
    Wire.setClock(400000);

    int err = IMU.init(calib, IMU_ADDRESS);
    if (err != 0) {
      Serial.print("Error initializing IMU: ");
      Serial.println(err);
      while (true);
    }

    #ifdef PERFORM_CALIBRATION
      performCalibration();
    #endif
}

void loop()
{
  IMU.update();
  IMU.getAccel(&accelData);
  IMU.getGyro(&gyroData);
  IMU.getMag(&magData);

  normeAccel = sqrt(
    accelData.accelX * accelData.accelX +
    accelData.accelY * accelData.accelY +
    accelData.accelZ * accelData.accelZ
  );

  #ifdef PERFORM_SENSOR_FUSION
    deltat = fusion.deltatUpdate();

    fusion.MadgwickUpdate(
      gyroData.gyroX * PI / 180.0f,
      gyroData.gyroY * PI / 180.0f,
      gyroData.gyroZ * PI / 180.0f,
      accelData.accelX, accelData.accelY, accelData.accelZ,
      magData.magX, magData.magY, magData.magZ,
      deltat
    );

    roll  = fusion.getRoll();
    pitch = fusion.getPitch();
    yaw   = fusion.getYaw();

    displayFusion();
  #else
    displayData();
  #endif

  delay(10);
}

void displayData(void)
{
  Serial.print("GYR,");
  Serial.print(gyroData.gyroX);
  Serial.print(",");
  Serial.print(gyroData.gyroY);
  Serial.print(",");
  Serial.print(gyroData.gyroZ);
  Serial.print(",");
  Serial.println(normeAccel);
}

void displayFusion(void)
{
  Serial.print("YPR,");
  Serial.print(yaw);
  Serial.print(",");
  Serial.print(pitch);
  Serial.print(",");
  Serial.print(roll);
  Serial.print(",");
  Serial.println(normeAccel);
}

void performCalibration(void)
{
  Serial.println("FastIMU calibration & data example");

  if (IMU.hasMagnetometer()) {
    delay(1000);
    Serial.println("Move IMU in figure 8 pattern until done.");
    delay(3000);
    IMU.calibrateMag(&calib);
    Serial.println("Magnetic calibration done!");
    delay(3000);
  }

  Serial.println("Keep IMU level.");
  delay(5000);
  IMU.calibrateAccelGyro(&calib);

  Serial.println("Calibration done!");
  Serial.println("Accel biases X/Y/Z: ");
  Serial.print(calib.accelBias[0]); Serial.print(", ");
  Serial.print(calib.accelBias[1]); Serial.print(", ");
  Serial.println(calib.accelBias[2]);

  Serial.println("Gyro biases X/Y/Z: ");
  Serial.print(calib.gyroBias[0]); Serial.print(", ");
  Serial.print(calib.gyroBias[1]); Serial.print(", ");
  Serial.println(calib.gyroBias[2]);

  if (IMU.hasMagnetometer()) {
    Serial.println("Mag biases X/Y/Z: ");
    Serial.print(calib.magBias[0]); Serial.print(", ");
    Serial.print(calib.magBias[1]); Serial.print(", ");
    Serial.println(calib.magBias[2]);

    Serial.println("Mag scale X/Y/Z: ");
    Serial.print(calib.magScale[0]); Serial.print(", ");
    Serial.print(calib.magScale[1]); Serial.print(", ");
    Serial.println(calib.magScale[2]);
  }

  delay(5000);
  IMU.init(calib, IMU_ADDRESS);
}