#include <Arduino_PMIC.h>

int chargeStatus = NOT_CHARGING;
bool canRunOnBattery = false;

void setup()
{
    /* open serial port with computer */
    Serial.begin(115200);
    while(!Serial);

    PMIC.begin();
    PMIC.disableCharge();
    PMIC.setInputCurrentLimit(0.5);
    PMIC.setInputVoltageLimit(3.88);
    PMIC.setMinimumSystemVoltage(3.6);
    PMIC.setChargeVoltage(4.2);
    PMIC.setChargeCurrent(0.150);
    PMIC.enableCharge();
    Serial.println("Charge initialized");
}

void loop()
{
  if ((!canRunOnBattery) && (PMIC.canRunOnBattery())) {
    canRunOnBattery = true;
    Serial.println("System can now run on battery");
  }
  if (chargeStatus != PMIC.chargeStatus()) {
    chargeStatus = PMIC.chargeStatus();
    switch(chargeStatus) {
      case NOT_CHARGING: {
        Serial.println("Charger is not charging the battery");
      } break;
      case PRE_CHARGING: {
        Serial.println("Charger is pre-charging the battery");
      } break;
      case FAST_CHARGING: {
        Serial.println("Charger is fast-charging the battery");
      } break;
      case CHARGE_TERMINATION_DONE: {
        Serial.println("Battery is fully charged. Disabling charger !");
        PMIC.disableCharge();
      } break;
    }
  }
  delay(1000);
}
