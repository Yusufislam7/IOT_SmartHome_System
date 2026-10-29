# Smart Home IoT Dashboard

Proyek monitoring smart home berbasis ESP32. Firmware membaca sensor dan
mengendalikan perangkat, lalu mengirim data melalui MQTT. Backend Flask
menyimpan data sensor ke MySQL dan menyediakan API untuk dashboard web.

## Fitur

- Monitoring suhu dan kelembapan dari DHT22.
- Monitoring kadar gas MQ-2, intensitas cahaya LDR, dan jarak ultrasonik.
- Menampilkan status lampu, kipas, buzzer, dan gerbang servo.
- Mode otomatis dan manual pada firmware ESP32.
- Grafik sensor, statistik sesi, indikator peringatan, prediksi suhu sederhana,
  suara peringatan, serta lima pilihan tema.
- Skrip `dashboard.py` untuk visualisasi terpisah data jarak dalam format batch.

> Dashboard web saat ini hanya untuk monitoring dan tidak menampilkan kontrol
> manual. Backend memiliki endpoint kontrol MQTT, tetapi endpoint tersebut
> belum dihubungkan ke kontrol pada halaman web.

## Arsitektur

```text
Sensor dan aktuator
       │
       ▼
ESP32 (sketch_nov29a.ino)
       │ MQTT: smarthome/sensor dan smarthome/control
       ▼
Broker MQTT publik HiveMQ
       │
       ├── Flask (app.py) ── MySQL (smart_home.sensor_data)
       │         │
       │         └── REST API ── Dashboard web
       │
       └── dashboard.py: subscriber terpisah untuk data jarak batch
```

Komponen aplikasi utama dan skrip grafik jarak tidak menggunakan topik atau
format pesan yang sama. `dashboard.py` bukan bagian dari alur penyimpanan
database maupun dashboard web.

## Struktur proyek

| Berkas | Kegunaan |
| --- | --- |
| `app.py` | Backend Flask, koneksi MySQL, MQTT subscriber, serta API status dan kontrol. |
| `db.sql` | Definisi awal tabel `sensor_data`. |
| `sketch_nov29a.ino` | Firmware ESP32 untuk sensor, aktuator, dan komunikasi MQTT. |
| `templates/index.html` | Halaman dashboard. |
| `static/script.js` | Pengambilan data API, grafik, statistik, prediksi, alert, dan tema. |
| `static/style.css` | Gaya dan tata letak dashboard. |
| `dashboard.py` | Grafik desktop untuk paket jarak biner dari topik MQTT yang berbeda. |
| `templates/README.md` | Dokumentasi frontend lama; beberapa petunjuknya tidak sesuai dengan struktur proyek saat ini. |

## Kebutuhan

- Python 3.9 atau lebih baru.
- MySQL Server.
- Arduino IDE atau PlatformIO dengan dukungan ESP32.
- Koneksi internet/LAN yang dapat mencapai broker MQTT HiveMQ publik.
- Browser modern untuk dashboard.

Pustaka Python untuk backend:

- Flask
- PyMySQL
- paho-mqtt

Pustaka tambahan untuk menjalankan `dashboard.py`:

- NumPy
- Matplotlib

Library Arduino yang dipakai firmware:

- PubSubClient
- ArduinoJson
- ESP32Servo
- DHT sensor library

## Menjalankan backend dan dashboard

### 1. Siapkan database

Buat database bernama `smart_home`, lalu jalankan `db.sql` pada database
tersebut. Contohnya melalui MySQL client:

```sql
CREATE DATABASE smart_home;
USE smart_home;
```

Kemudian jalankan isi `db.sql` melalui MySQL Workbench atau klien MySQL.

**Penting:** skema di `db.sql` saat ini belum lengkap untuk backend. Backend
mencoba menyimpan `kipas_status`, `jarak`, dan `ldr_value`, tetapi ketiga kolom
tersebut belum didefinisikan. Tambahkan kolom berikut sebelum menjalankan
aplikasi:

```sql
USE smart_home;
ALTER TABLE sensor_data
  ADD COLUMN kipas_status VARCHAR(10),
  ADD COLUMN jarak FLOAT,
  ADD COLUMN ldr_value INT;
```

Konfigurasi MySQL pada `app.py` saat ini menggunakan host `localhost`, user
`root`, password kosong, dan database `smart_home`. Sesuaikan fungsi `get_db()`
jika konfigurasi MySQL lokal berbeda. Jangan gunakan konfigurasi default ini
untuk deployment.

### 2. Siapkan lingkungan Python

Jalankan perintah berikut dari direktori proyek di PowerShell:

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install Flask PyMySQL paho-mqtt
```

Untuk memakai skrip grafik jarak, instal dependensi tambahannya:

```powershell
python -m pip install numpy matplotlib
```

### 3. Jalankan backend

Pastikan MySQL aktif, lalu jalankan:

```powershell
python app.py
```

Buka dashboard di [http://localhost:5000](http://localhost:5000). Backend
mengambil data sensor terbaru dari database; halaman menampilkan nilai kosong
sampai ada data masuk dari ESP32.

## Menyiapkan ESP32

1. Buka `sketch_nov29a.ino` di Arduino IDE.
2. Pilih board ESP32 yang sesuai dan pasang library yang tercantum di atas.
3. Isi SSID dan password Wi-Fi milik perangkat pada konfigurasi firmware.
   Jangan membagikan atau mengunggah kredensial Wi-Fi ke repositori.
4. Pastikan pin sensor dan aktuator sesuai dengan rangkaian, lalu unggah sketch.
5. Backend Flask dan ESP32 harus dapat mengakses broker yang sama.

Pin yang ditentukan dalam sketch:

| Komponen | GPIO |
| --- | ---: |
| DHT22 | 4 |
| MQ-2 (analog) | 34 |
| LDR (analog) | 35 |
| LED/lampu | 14 |
| Relay/kipas | 27 |
| Buzzer | 15 |
| Ultrasonik TRIG | 25 |
| Ultrasonik ECHO | 26 |
| Servo gerbang | 33 |

Firmware mempublikasikan data sensor setiap sekitar 2 detik. Dalam mode
`AUTO`, kipas menyala saat suhu minimal 30 °C, lampu mengikuti nilai LDR
(ambang 3000), buzzer menyala saat nilai gas minimal 800, dan servo membuka
gerbang saat jarak di bawah 20 cm. Perhatikan bahwa pembacaan sensor dan
ambang tersebut bergantung pada sensor, rangkaian, dan kalibrasi aktual.
Nilai `gas_value` dan `ldr_value` yang dikirim firmware adalah pembacaan ADC
mentah, bukan hasil konversi terkalibrasi ke ppm atau persen, meskipun label
dashboard saat ini menampilkan unit tersebut.

## MQTT dan API

Broker dan topik aplikasi utama yang digunakan saat ini:

| Arah | Topik | Format |
| --- | --- | --- |
| ESP32 → backend | `smarthome/sensor` | Objek JSON berisi `suhu`, `kelembapan`, `gas_value`, `gas_status`, `lampu_status`, `kipas_status`, `gerbang_status`, `jarak`, dan `ldr_value`. |
| Backend → ESP32 | `smarthome/control` | Objek JSON untuk mode atau perintah aktuator. |

API Flask:

| Method dan path | Kegunaan |
| --- | --- |
| `GET /api/status` | Mengembalikan mode saat ini dan data sensor terbaru dalam objek `sensor`. Jika database belum memiliki data, nilai sensor dikembalikan sebagai default kosong/0. |
| `POST /api/control` | Mengubah mode dan/atau menerbitkan perintah ke topik kontrol MQTT. |

Contoh permintaan kontrol:

```json
{
  "mode": "MANUAL",
  "lampu": "ON",
  "kipas": "OFF",
  "gerbang": "BUKA"
}
```

Perintah aktuator hanya diteruskan saat mode `MANUAL`. API ini belum memiliki
autentikasi atau otorisasi; jangan mengeksposnya ke jaringan publik tanpa
pengamanan.

## Grafik jarak batch (opsional)

`dashboard.py` adalah program desktop terpisah. Program ini berlangganan pada
topik `iot/kelompok5/jarak` dan hanya memproses payload biner berukuran tepat
44 byte: satu timestamp float32 little-endian dan sepuluh nilai jarak
float32 little-endian. Nilai jarak dirata-ratakan dan ditampilkan dalam grafik.

Jalankan dengan:

```powershell
python dashboard.py
```

ESP32 pada `sketch_nov29a.ino` tidak memublikasikan payload batch tersebut;
karena itu grafik ini tidak akan menerima data dari firmware aplikasi utama
tanpa publisher tambahan yang memakai topik dan format yang sesuai.

## Batasan dan catatan

- Broker MQTT yang digunakan adalah broker publik tanpa autentikasi dan topik
  yang dipakai bersifat umum. Data/perintah dapat terlihat atau terganggu oleh
  klien lain. Gunakan broker privat, autentikasi, dan topik unik sebelum
  penggunaan nyata.
- Kredensial Wi-Fi ditulis langsung di firmware; pindahkan ke konfigurasi lokal
  dan jangan memasukkan kredensial ke commit.
- `CURRENT_MODE` hanya disimpan di memori backend, sehingga kembali ke `AUTO`
  ketika proses Flask dimulai ulang.
- Dashboard meminta `/api/status` setiap 2 detik. Grafik dan statistik hanya
  menyimpan hingga 20 titik data selama sesi halaman; bukan riwayat database.
- Chart.js dan ikon Font Awesome dimuat dari CDN, sehingga fitur terkait
  memerlukan akses internet pada browser.
- Pembacaan status buzzer pada dashboard dihitung dari ambang gas, bukan dari
  kolom status buzzer terpisah.
- File `templates/README.md` merujuk ke frontend/backend Node.js dan halaman
  login yang tidak ada pada struktur proyek ini. Gunakan README utama ini
  sebagai petunjuk proyek saat ini.

## Pemecahan masalah

- **API gagal mengambil data:** pastikan Flask berjalan di port 5000 dan cek
  log terminal backend.
- **Gagal terhubung ke MySQL atau penyimpanan MQTT gagal:** pastikan database
  `smart_home` tersedia, konfigurasi MySQL benar, serta semua kolom yang
  diperlukan backend sudah ada.
- **Data tidak muncul:** pastikan ESP32 terhubung ke Wi-Fi, terhubung ke broker,
  dan memublikasikan ke `smarthome/sensor`.
- **Grafik `dashboard.py` kosong:** pastikan ada publisher pada
  `iot/kelompok5/jarak` yang mengirim payload biner sesuai format 44 byte.
- **Peringatan browser tidak berbunyi:** interaksi pengguna mungkin diperlukan
  oleh kebijakan autoplay browser.
