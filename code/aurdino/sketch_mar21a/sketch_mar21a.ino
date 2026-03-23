#define IR_PIN 15
#define TRIG_PIN 5
#define ECHO_PIN 18
#define LDR_PIN 34
#define BUZZER_PIN 21

long duration;
float distanceCm;

void setup() {
  Serial.begin(115200);
  Serial.setTimeout(50);

  pinMode(IR_PIN, INPUT);
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  pinMode(BUZZER_PIN, OUTPUT);

  digitalWrite(BUZZER_PIN, LOW);
}

float getDistance() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);

  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);

  duration = pulseIn(ECHO_PIN, HIGH, 20000);

  if (duration == 0) {
    return 0.0;
  }

  distanceCm = duration * 0.034 / 2.0;
  return distanceCm;
}

void stopBuzzer() {
  digitalWrite(BUZZER_PIN, LOW);
}

void successBeep() {
  stopBuzzer();
  digitalWrite(BUZZER_PIN, HIGH);
  delay(150);
  digitalWrite(BUZZER_PIN, LOW);
}

void errorBeep() {
  for (int i = 0; i < 3; i++) {
    digitalWrite(BUZZER_PIN, HIGH);
    delay(120);
    digitalWrite(BUZZER_PIN, LOW);
    delay(120);
  }
}

void loop() {
  int irValue = digitalRead(IR_PIN);
  float distance = getDistance();
  int ldrValue = analogRead(LDR_PIN);

  Serial.print("IR:");
  Serial.print(irValue);
  Serial.print(",DIST:");
  Serial.print(distance, 2);
  Serial.print(",LDR:");
  Serial.println(ldrValue);

  if (Serial.available()) {
    String command = Serial.readStringUntil('\n');
    command.trim();

    if (command == "SUCCESS") {
      successBeep();
    } 
    else if (command == "ERROR") {
      errorBeep();
    }
    else if (command == "STOP") {
      stopBuzzer();
    }
  }

  delay(100);
}