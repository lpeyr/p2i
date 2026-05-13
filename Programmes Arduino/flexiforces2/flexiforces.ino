const int pin_A0 = A0;
const int pin_A1 = A1;
const int pin_A2 = A2;

void setup() {
  Serial.begin(9600);
  pinMode(pin_A0, INPUT);
  pinMode(pin_A1, INPUT);
  pinMode(pin_A2, INPUT);
}

void loop() {
  int val_A0 = analogRead(pin_A0);
  int val_A1 = analogRead(pin_A1);
  int val_A2 = analogRead(pin_A2);
  Serial.print(val_A0);
  Serial.print("||");
  Serial.print(val_A1);
  Serial.print("||");
  Serial.println(val_A2);
  delay(500);   
  

}
