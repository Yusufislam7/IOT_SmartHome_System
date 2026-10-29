# 🎨 Frontend - Smart Home IoT Monitoring

Frontend website untuk monitoring dan visualisasi data IoT dengan dashboard interaktif.

## 📋 Fitur

- ✅ Real-time sensor monitoring (5 sensors)
- ✅ Device status indicators (4 devices)
- ✅ Interactive charts (Temperature & Humidity)
- ✅ AI Temperature Prediction (Linear Regression)
- ✅ Statistics Cards (Avg, Max, Min)
- ✅ 5 Theme Options (Dark, Light, Blue, Purple, Green)
- ✅ Authentication System (Admin & User roles)
- ✅ Export Data (CSV, PDF, JSON)
- ✅ Sound Alert Notifications
- ✅ Responsive Design

## 📂 File Structure

```
frontend/
├── index.html       # Main dashboard
├── login.html       # Login page
├── style.css        # Dashboard styles
├── login.css        # Login styles
├── script.js        # Dashboard logic & features
├── login.js         # Authentication logic
└── README.md        # This file
```

## 🚀 Cara Mengakses

### 1. Pastikan Backend Running

```bash
cd backend
npm start
```

### 2. Buka di Browser

```
http://localhost:3000/login.html
```

### 3. Login

**Admin Account:**

- Username: `admin`
- Password: `admin123`

**User Account:**

- Username: `user`
- Password: `user123`

**Kelompok B8 Account:**

- Username: `kelompokb8`
- Password: `iot2025`

## 🎨 Themes

Pilih tema di dropdown (pojok kanan atas):

1. **Dark Theme** - Default, elegant dark mode
2. **Light Theme** - Clean bright interface
3. **Blue Ocean** - Cool blue gradient
4. **Purple Dream** - Vibrant purple style
5. **Nature Green** - Fresh green design

## 📊 Dashboard Components

### 1. Statistics Cards

- Average Temperature
- Average Humidity
- Maximum Temperature
- Minimum Temperature

### 2. Sensor Monitoring (Real-time)

- 🌡️ DHT22 Temperature
- 💧 DHT22 Humidity
- ☁️ MQ-2 Gas Level
- 💡 LDR Light Intensity
- 📏 Ultrasonic Distance

### 3. AI Prediction

- Temperature forecast using linear regression
- Trend indicator (📈 Rising / 📉 Falling / ➡️ Stable)
- Risk level assessment

### 4. Device Status

- 💡 Lamp (ON/OFF)
- 🌀 Fan (ON/OFF)
- 🔔 Buzzer (ON/OFF)
- 🚪 Gate (OPEN/CLOSE)

### 5. Charts

- Temperature History (Line Chart)
- Humidity History (Line Chart)

### 6. Export Features (Admin Only)

- **CSV**: Excel-compatible table data
- **PDF**: Professional report with statistics, charts, and styling
- **JSON**: Structured data with metadata

## 🔐 User Roles

### Admin

- Full access to all features
- Can export data (CSV/PDF/JSON)
- Can clear alerts
- Access to settings

### User

- View monitoring dashboard
- View charts and statistics
- Cannot export data
- Cannot access admin features

## 🎵 Sound Alerts

System will play alert sound when:

- Temperature > 32°C (Danger)
- Gas Level > 500 ppm (Danger)
- Distance < 10 cm (Danger)

_Note: Alert sound throttled to 5 seconds interval_

## 💾 Local Storage

Frontend menyimpan:

- `currentUser`: Login session data
- `selectedTheme`: Theme preference (persists across sessions)
- `loginTheme`: Login page theme

## 📱 Responsive Design

Dashboard responsive dan dapat diakses di:

- 🖥️ Desktop (1920x1080+)
- 💻 Laptop (1366x768+)
- 📱 Tablet (768px+)
- 📱 Mobile (375px+)

## 🔧 Customization

### Ganti Logo

Edit file `index.html` dan `login.html`:

```html
<i class="fas fa-home"></i>
<!-- Ganti icon -->
```

### Tambah Sensor Baru

1. Edit `index.html` - tambah card sensor
2. Edit `script.js` - update `updateSensorData()`
3. Edit `style.css` - styling card

### Ganti Warna Theme

Edit `style.css` bagian CSS Variables:

```css
[data-theme="dark"] {
  --bg-primary: #1a1a2e;
  --text-primary: #eee;
  /* ... */
}
```

---

**Kelompok B8** - Smart Home IoT Monitoring System
