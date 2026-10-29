import paho.mqtt.client as mqtt
import numpy as np
import matplotlib.pyplot as plt
from matplotlib.animation import FuncAnimation

# --- KONFIGURASI ---
MQTT_BROKER = "broker.hivemq.com"
TOPIC = "iot/kelompok5/jarak" 

waktu_data = []
rata_rata_jarak = []
limit_data = 50 

def on_message(client, userdata, msg):
    try:
        data = msg.payload
        # Cek apakah ukuran data sesuai revisi (44 byte)
        if len(data) != 44:
            return

        # Ekstrak timestamp (offset 0)
        ts0 = np.frombuffer(data, dtype="<f4", count=1, offset=0)[0]
        
        # Ekstrak array 10 jarak (offset 4, count 10)
        jarak_batch = np.frombuffer(data, dtype="<f4", count=10, offset=4)

        # Hitung Rata-rata dari batch tersebut (Data Processing)
        avg_jarak = np.mean(jarak_batch)

        waktu_data.append(ts0)
        rata_rata_jarak.append(avg_jarak)

        if len(waktu_data) > limit_data:
            waktu_data.pop(0)
            rata_rata_jarak.pop(0)

        print(f"--- BATCH TERIMA ---")
        print(f"Timestamp : {ts0:.2f} s")
        print(f"Rata-rata : {avg_jarak:.2f} cm")
        print(f"Status    : {'TERBUKA' if avg_jarak < 20 else 'TERTUTUP'}")
        
    except Exception as e:
        print(f"Error: {e}")

client = mqtt.Client()
client.on_message = on_message
client.connect(MQTT_BROKER, 1883, 60)
client.subscribe(TOPIC)
client.loop_start()

# --- SETUP GRAFIK ---
fig, ax = plt.subplots()
line, = ax.plot([], [], 'b-', lw=2, label='Rata-rata Jarak') 
ax.set_ylim(0, 200)
ax.set_xlabel('Waktu (detik)')
ax.set_ylabel('Jarak Rata-rata (cm)')
ax.set_title('Dashboard Kelompok 5: Monitoring Jarak (Batch Mode)')
ax.legend()
ax.grid(True)

def update_plot(frame):
    if len(waktu_data) > 0:
        line.set_data(waktu_data, rata_rata_jarak)
        ax.set_xlim(min(waktu_data), max(waktu_data))
    return line,

ani = FuncAnimation(fig, update_plot, interval=200, blit=True, cache_frame_data=False)
plt.show()