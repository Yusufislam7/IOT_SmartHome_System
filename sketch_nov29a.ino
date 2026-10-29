#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <ESP32Servo.h>
#include "DHT.h"

/* ===== WIFI ===== */
const char* ssid = "A34 milik Achraf";
const char* password = "yusufislam";

/* ===== MQTT ===== */
const char* mqtt_server = "broker.hivemq.com";
const char* topicSensor  = "smarthome/sensor";
const char* topicControl = "smarthome/control";

/* ===== PIN ===== */
#define DHTPIN 4
#define DHTTYPE DHT22
#define MQ2_PIN 34
#define LDR_PIN 35
#define LED_PIN 14
#define RELAY_PIN 27
#define BUZZER_PIN 15
#define TRIG_PIN 25
#define ECHO_PIN 26
#define SERVO_PIN 33

WiFiClient espClient;
PubSubClient client(espClient);
DHT dht(DHTPIN, DHTTYPE);
Servo servo;

/* ===== VARIABLE ===== */
float batasSuhu = 30.0;
int gasThreshold = 800;
int ldrThreshold = 3000;

String MODE = "AUTO";

/* ===== STATE MANUAL ===== */
bool lampuManual = false;
bool kipasManual = false;
String gerbangManual = "TUTUP";

/* ===== WIFI ===== */
void setupWiFi() {
  Serial.print("🔌 Connecting WiFi");
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\n✅ WiFi Connected");
}

/* ===== MQTT CALLBACK ===== */
void callback(char* topic, byte* payload, unsigned int length) {
  String msg;
  for (int i = 0; i < length; i++) msg += (char)payload[i];
  Serial.println("📥 MQTT CONTROL: " + msg);

  StaticJsonDocument<256> doc;
  if (deserializeJson(doc, msg)) return;

  if (doc.containsKey("mode")) {
    MODE = doc["mode"].as<String>();
    Serial.println("🔁 MODE -> " + MODE);
  }

  if (MODE == "MANUAL") {
    if (doc["lampu"] == "ON")  lampuManual = true;
    if (doc["lampu"] == "OFF") lampuManual = false;

    if (doc["kipas"] == "ON")  kipasManual = true;
    if (doc["kipas"] == "OFF") kipasManual = false;

    if (doc["gerbang"]) gerbangManual = doc["gerbang"].as<String>();
  }
}

/* ===== MQTT CONNECT ===== */
void reconnectMQTT() {
  while (!client.connected()) {
    if (client.connect("ESP32_SMART_HOME")) {
      client.subscribe(topicControl);
    } else {
      delay(2000);
    }
  }
}

void setup() {
  Serial.begin(115200);

  pinMode(LED_PIN, OUTPUT);
  pinMode(RELAY_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);

  digitalWrite(RELAY_PIN, HIGH);
  servo.attach(SERVO_PIN);
  servo.write(20);

  dht.begin();
  setupWiFi();

  client.setServer(mqtt_server, 1883);
  client.setCallback(callback);
}

/* ===== LOOP ===== */
void loop() {
  if (!client.connected()) reconnectMQTT();
  client.loop();

  float suhu = dht.readTemperature();
  float hum  = dht.readHumidity();
  int gas    = analogRead(MQ2_PIN);
  int ldr    = analogRead(LDR_PIN);
  float jarak = 0;

  if (MODE == "AUTO") {

    digitalWrite(RELAY_PIN, suhu >= batasSuhu ? LOW : HIGH);
    digitalWrite(LED_PIN, ldr > ldrThreshold ? HIGH : LOW);
    digitalWrite(BUZZER_PIN, gas >= gasThreshold ? HIGH : LOW);

    digitalWrite(TRIG_PIN, LOW);
    delayMicroseconds(2);
    digitalWrite(TRIG_PIN, HIGH);
    delayMicroseconds(10);
    digitalWrite(TRIG_PIN, LOW);

    long duration = pulseIn(ECHO_PIN, HIGH, 30000);
    jarak = (duration > 0) ? duration * 0.034 / 2 : 0;

    servo.write(jarak < 20 ? 110 : 20);

  } else { // MANUAL
    digitalWrite(LED_PIN, lampuManual ? HIGH : LOW);
    digitalWrite(RELAY_PIN, kipasManual ? LOW : HIGH);
    servo.write(gerbangManual == "BUKA" ? 110 : 20);
  }

  /* ===== MQTT SENSOR ===== */
  StaticJsonDocument<256> doc;

  doc["mode"] = MODE;
  doc["suhu"] = suhu;
  doc["kelembapan"] = hum;
  doc["gas_value"] = gas;
  doc["gas_status"] = gas >= gasThreshold ? "Tidak Aman" : "Aman";
  doc["ldr_value"] = ldr;
  doc["lampu_status"] = digitalRead(LED_PIN) ? "Nyala" : "Mati";
  doc["kipas_status"] = digitalRead(RELAY_PIN) == LOW ? "Nyala" : "Mati";
  doc["jarak"] = jarak;
  doc["gerbang_status"] = servo.read() > 90 ? "Buka" : "Tutup";

  char buffer[256];
  serializeJson(doc, buffer);
  client.publish(topicSensor, buffer);

  delay(2000);
}