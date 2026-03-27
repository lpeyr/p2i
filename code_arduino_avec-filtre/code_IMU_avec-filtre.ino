#include "FastIMU.h"
#include <Wire.h>
#include <SensorFusion.h>

/* Uncomment your IMU type */
//#define IMU_6_DOF
#define IMU_9_DOF
//#define IMU_10_DOF

/* Uncomment if you want to perform calibration at start */
#define PERFORM_CALIBRATION

/* Uncomment if you want Euler angles instead of sensors data */
//#define PERFORM_SENSOR_FUSION

#if defined(IMU_6_DOF)
  #warning 6-DOF IMU is selected
  #define IMU_ADDRESS 0x6A // might be 0x6B if board was modified
  LSM6DSL IMU; 
#elif defined(IMU_9_DOF)
  #warning 9-DOF IMU is selected
  #define IMU_ADDRESS 0x68
  MPU9250 IMU; 
#elif defined(IMU_10_DOF)
  #warning 10-DOF IMU is selected
  #define IMU_ADDRESS 0x68
  MPU9250 IMU; 
#else
  #error No IMU selected !
#endif

/* Sensors data variables */
AccelData accelData;
GyroData gyroData;
MagData magData;

/* Calibration variables */
calData calib = { 0 };

/* Euler angles (sensors fusion) variables */
SF fusion;
float yaw, pitch, roll, deltat;

void setup()
{
    /* Open serial port with computer */
    Serial.begin(115200);
    while(!Serial);

    /* Set up I2C bus communication with IMU */
    Wire.begin();
    Wire.setClock(400000);

    /* Initialize IMU */
    int err = IMU.init(calib, IMU_ADDRESS);
    if (err != 0) {
      Serial.print("Error initializing IMU: ");
      Serial.println(err);
      while (true);
    }

    /* Calibrate IMU */
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

  #ifdef PERFORM_SENSOR_FUSION
    deltat = fusion.deltatUpdate();
    fusion.MadgwickUpdate(
      gyroData.gyroX/180.0f*3.14f, gyroData.gyroY/180.0f*3.14f, gyroData.gyroZ/180.0f*3.14f, 
      accelData.accelX, accelData.accelY, accelData.accelZ, 
      magData.magX, magData.magY, magData.magZ, 
      deltat);
    roll = fusion.getRoll();
    pitch = fusion.getPitch();
    yaw = fusion.getYaw();
    displayFusion();
  #else
    displayData();
  #endif
  delay(50);

  

}

void displayData(void)
{
  if (abs(gyroData.gyroX)<0.25){
    gyroData.gyroX=0;
  }
  if (abs(gyroData.gyroY)<0.25){
    gyroData.gyroY=0;
  }
  if (abs(gyroData.gyroZ)<0.25){
    gyroData.gyroZ=0;
  }
  if (abs(accelData.accelX)<0.01){
    accelData.accelX=0;
  }
  if (abs(accelData.accelY)<0.01){
    accelData.accelY=0;
  }
  if (abs(accelData.accelZ)<=1.01){
    accelData.accelZ=1;
  }
  
  Serial.print(accelData.accelX);
  Serial.print("\t");
  Serial.print(accelData.accelY);
  Serial.print("\t");
  Serial.print(accelData.accelZ-1);
  Serial.print("\t");
  Serial.print(gyroData.gyroX);
  Serial.print("\t");
  Serial.print(gyroData.gyroY);
  Serial.print("\t");
  Serial.print(gyroData.gyroZ);
  Serial.print("\t");
  Serial.print(magData.magX);
  Serial.print("\t");
  Serial.print(magData.magY);
  Serial.print("\t");
  Serial.print(magData.magZ);
  Serial.print("\n");
}

void displayFusion(void)
{
  Serial.print(yaw);
  Serial.print("\t");
  Serial.print(pitch);
  Serial.print("\t");
  Serial.print(roll);
  Serial.print("\t");
  Serial.print(deltat);
  Serial.print("\n");
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
  Serial.print(calib.accelBias[0]);
  Serial.print(", ");
  Serial.print(calib.accelBias[1]);
  Serial.print(", ");
  Serial.println(calib.accelBias[2]);
  Serial.println("Gyro biases X/Y/Z: ");
  Serial.print(calib.gyroBias[0]);
  Serial.print(", ");
  Serial.print(calib.gyroBias[1]);
  Serial.print(", ");
  Serial.println(calib.gyroBias[2]);
  if (IMU.hasMagnetometer()) {
    Serial.println("Mag biases X/Y/Z: ");
    Serial.print(calib.magBias[0]);
    Serial.print(", ");
    Serial.print(calib.magBias[1]);
    Serial.print(", ");
    Serial.println(calib.magBias[2]);
    Serial.println("Mag Scale X/Y/Z: ");
    Serial.print(calib.magScale[0]);
    Serial.print(", ");
    Serial.print(calib.magScale[1]);
    Serial.print(", ");
    Serial.println(calib.magScale[2]);
  }
  delay(5000);
  IMU.init(calib, IMU_ADDRESS);
}