from flask import Flask, request, jsonify, render_template
import pymysql
import json
import threading
import paho.mqtt.client as mqtt
from paho.mqtt import publish

app = Flask(__name__)

# ================= MQTT =================
MQTT_BROKER = "broker.hivemq.com"
MQTT_SENSOR_TOPIC = "smarthome/sensor"
MQTT_CONTROL_TOPIC = "smarthome/control"

# ================= MODE GLOBAL =================
CURRENT_MODE = "AUTO"

# ================= DATABASE =================
def get_db():
    return pymysql.connect(
        host="localhost",
        user="root",
        password="",
        database="smart_home",
        cursorclass=pymysql.cursors.DictCursor
    )

# ================= MQTT CALLBACK =================
def on_connect(client, userdata, flags, rc):
    print("✅ MQTT Connected")
    client.subscribe(MQTT_SENSOR_TOPIC)

def on_message(client, userdata, msg):
    data = json.loads(msg.payload.decode())
    print("📥 DATA SENSOR:", data)

    db = get_db()
    cur = db.cursor()

    sql = """
    INSERT INTO sensor_data
    (suhu, kelembapan, gas_value, gas_status,
     lampu_status, kipas_status, gerbang_status,
     jarak, ldr_value)
    VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)
    """

    cur.execute(sql, (
        data.get("suhu"),
        data.get("kelembapan"),
        data.get("gas_value"),
        data.get("gas_status"),
        data.get("lampu_status"),
        data.get("kipas_status"),
        data.get("gerbang_status"),
        data.get("jarak"),
        data.get("ldr_value")
    ))

    db.commit()
    db.close()

# ================= MQTT THREAD =================
def mqtt_thread():
    client = mqtt.Client()
    client.on_connect = on_connect
    client.on_message = on_message
    client.connect(MQTT_BROKER, 1883, 60)
    client.loop_forever()

threading.Thread(target=mqtt_thread, daemon=True).start()

# ================= ROUTES =================

@app.route("/")
def dashboard():
    db = get_db()
    cur = db.cursor()
    cur.execute("SELECT * FROM sensor_data ORDER BY id DESC LIMIT 1")
    data = cur.fetchone()
    db.close()
    return render_template("index.html", data=data, mode=CURRENT_MODE)

@app.route("/api/status")
def api_status():
    db = get_db()
    cur = db.cursor()
    cur.execute("SELECT * FROM sensor_data ORDER BY id DESC LIMIT 1")
    data = cur.fetchone()
    db.close()

    # If there's no data yet, return sensible defaults so frontend works
    if not data:
        data = {
            "suhu": None,
            "kelembapan": None,
            "gas_value": None,
            "gas_status": 0,
            "lampu_status": 0,
            "kipas_status": 0,
            "gerbang_status": 0,
            "jarak": None,
            "ldr_value": None,
        }

    return jsonify({
        "mode": CURRENT_MODE,
        "sensor": data
    })

@app.route("/api/control", methods=["POST"])
def control():
    global CURRENT_MODE

    data = request.get_json()
    print("📩 REQUEST:", data)

    # === SET MODE ===
    if "mode" in data:
        CURRENT_MODE = data["mode"]
        print(f"🔁 MODE DIUBAH -> {CURRENT_MODE}")

        publish.single(
            MQTT_CONTROL_TOPIC,
            json.dumps({"mode": CURRENT_MODE}),
            hostname=MQTT_BROKER
        )

    # === KIRIM PERINTAH HANYA JIKA MANUAL ===
    if CURRENT_MODE == "MANUAL":
        publish.single(
            MQTT_CONTROL_TOPIC,
            json.dumps(data),
            hostname=MQTT_BROKER
        )
        print("📤 CONTROL DIKIRIM:", data)
    else:
        print("⚠️ MODE AUTO - CONTROL DIABAIKAN")

    return jsonify({
        "status": "OK",
        "mode": CURRENT_MODE,
        "sent": data
    })

# ================= MAIN =================
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)