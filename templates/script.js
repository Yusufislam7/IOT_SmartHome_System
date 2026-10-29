// ===== KONFIGURASI =====
const CONFIG = {
  // ============================================================
  // 🔧 UBAH INI NANTI SAAT KONEKSI KE ESP32:
  // Ganti 'localhost' dengan IP komputer/server kamu
  // Contoh: "http://192.168.1.100:5000"
  // ============================================================
  SERVER_URL: "http://localhost:5000",
  API_ENDPOINT: "/api/status",
  UPDATE_INTERVAL: 2000, // Update setiap 2 detik
  CHART_MAX_POINTS: 20,

  // Threshold untuk status sensor
  THRESHOLDS: {
    temperature: { warning: 28, danger: 32 },
    humidity: { warning: 70, danger: 80 },
    gas: { warning: 300, danger: 500 },
    light: { min: 20, max: 80 },
    distance: { warning: 30, danger: 10 },
  },
};

// ===== STATE MANAGEMENT =====
let sensorData = {
  temperature: 0,
  humidity: 0,
  gasLevel: 0,
  lightIntensity: 0,
  distance: 0,
  lampStatus: false,
  fanStatus: false,
  buzzerStatus: false,
  gateStatus: false,
};

let chartData = {
  labels: [],
  temperature: [],
  humidity: [],
  gas: [],
  light: [],
};

let charts = {};
let updateTimer = null;
let connectionStatus = false;
let dataCount = 0;
let currentTheme = "dark"; // Default theme
let lastAlertTime = 0; // For sound notification throttling
let alertAudio = null; // Audio element for alerts

// ===== INITIALIZATION =====
document.addEventListener("DOMContentLoaded", () => {
  console.log("🚀 Dashboard IoT dimulai...");

  // Initialize alert sound
  alertAudio = document.getElementById("alertSound");

  loadTheme(); // Load saved theme
  initializeCharts();
  startDataFetching();
  setupEventListeners();
});

// ===== CHARTS INITIALIZATION =====
function initializeCharts() {
  // Chart Suhu & Kelembaban
  const ctxTempHumid = document.getElementById("tempHumidChart");
  if (ctxTempHumid) {
    charts.tempHumid = new Chart(ctxTempHumid, {
      type: "line",
      data: {
        labels: chartData.labels,
        datasets: [
          {
            label: "Suhu (°C)",
            data: chartData.temperature,
            borderColor: "#ef4444",
            backgroundColor: "rgba(239, 68, 68, 0.1)",
            tension: 0.4,
            fill: true,
          },
          {
            label: "Kelembaban (%)",
            data: chartData.humidity,
            borderColor: "#3b82f6",
            backgroundColor: "rgba(59, 130, 246, 0.1)",
            tension: 0.4,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            display: true,
            labels: { color: "#f1f5f9" },
          },
        },
        scales: {
          x: {
            ticks: { color: "#94a3b8" },
            grid: { color: "rgba(148, 163, 184, 0.1)" },
          },
          y: {
            ticks: { color: "#94a3b8" },
            grid: { color: "rgba(148, 163, 184, 0.1)" },
          },
        },
      },
    });
  }

  // Chart Gas & Cahaya
  const ctxGasLight = document.getElementById("gasLightChart");
  if (ctxGasLight) {
    charts.gasLight = new Chart(ctxGasLight, {
      type: "line",
      data: {
        labels: chartData.labels,
        datasets: [
          {
            label: "Gas (ppm)",
            data: chartData.gas,
            borderColor: "#f59e0b",
            backgroundColor: "rgba(245, 158, 11, 0.1)",
            tension: 0.4,
            fill: true,
            yAxisID: "y",
          },
          {
            label: "Cahaya (%)",
            data: chartData.light,
            borderColor: "#fbbf24",
            backgroundColor: "rgba(251, 191, 36, 0.1)",
            tension: 0.4,
            fill: true,
            yAxisID: "y1",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            display: true,
            labels: { color: "#f1f5f9" },
          },
        },
        scales: {
          x: {
            ticks: { color: "#94a3b8" },
            grid: { color: "rgba(148, 163, 184, 0.1)" },
          },
          y: {
            type: "linear",
            position: "left",
            ticks: { color: "#94a3b8" },
            grid: { color: "rgba(148, 163, 184, 0.1)" },
            title: { display: true, text: "Gas (ppm)", color: "#f59e0b" },
          },
          y1: {
            type: "linear",
            position: "right",
            ticks: { color: "#94a3b8" },
            grid: { display: false },
            title: { display: true, text: "Cahaya (%)", color: "#fbbf24" },
          },
        },
      },
    });
  }
}

// ===== DATA FETCHING =====
function startDataFetching() {
  fetchData(); // Fetch pertama kali
  updateTimer = setInterval(fetchData, CONFIG.UPDATE_INTERVAL);
}

async function fetchData() {
  try {
    // ============================================================
    // 📡 FETCHING DATA REAL DARI BACKEND FLASK
    // ============================================================
    const response = await fetch(`${CONFIG.SERVER_URL}${CONFIG.API_ENDPOINT}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    // Format data dari backend Flask ke format yang dipakai frontend
    const formattedData = {
      temperature: data.sensor?.suhu || 0,
      humidity: data.sensor?.kelembapan || 0,
      gasLevel: data.sensor?.gas_value || 0,
      lightIntensity: data.sensor?.ldr_value || 0,
      distance: data.sensor?.jarak || 0,
      devices: {
        lamp: data.sensor?.lampu_status == 1,
        fan: data.sensor?.kipas_status == 1,
        buzzer: data.sensor?.gas_status == 1,
        gate: data.sensor?.gerbang_status == 1,
      },
      timestamp: new Date().toISOString(),
    };

    updateDashboard(formattedData);
    updateConnectionStatus(true);
  } catch (error) {
    console.error("❌ Error fetching data:", error);
    updateConnectionStatus(false);
    showAlert("danger", "Koneksi ke server terputus!");
  }
}

// ============================================================
// 🎭 MOCK DATA GENERATOR (Untuk Testing Saja)
// ============================================================
// Fungsi ini generate data palsu/simulasi untuk testing UI
// Nanti kalau sudah pakai data real, fungsi ini tidak dipanggil lagi
// (tapi biarkan tetap ada untuk jaga-jaga kalau mau testing lagi)

function generateMockData() {
  return {
    // Data sensor (random untuk simulasi)
    temperature: (25 + Math.random() * 10).toFixed(1),
    humidity: (50 + Math.random() * 30).toFixed(1),
    gasLevel: Math.floor(100 + Math.random() * 400),
    lightIntensity: Math.floor(30 + Math.random() * 50),
    distance: Math.floor(20 + Math.random() * 80),

    // Status device (random ON/OFF)
    devices: {
      lamp: Math.random() > 0.5,
      fan: Math.random() > 0.5,
      buzzer: Math.random() > 0.8,
      gate: Math.random() > 0.6,
    },

    timestamp: new Date().toISOString(),
  };
}

// ===== UPDATE DASHBOARD =====
function updateDashboard(data) {
  if (!data) return;

  // Update sensor values
  updateSensorValue("temperature", data.temperature, "°C");
  updateSensorValue("humidity", data.humidity, "%");
  updateSensorValue("gasLevel", data.gasLevel, "ppm");
  updateSensorValue("lightIntensity", data.lightIntensity, "%");
  updateSensorValue("distance", data.distance, "cm");

  // Update status badges
  updateStatus("tempStatus", getTemperatureStatus(data.temperature));
  updateStatus("humidStatus", getHumidityStatus(data.humidity));
  updateStatus("gasStatus", getGasStatus(data.gasLevel));
  updateStatus("lightStatus", getLightStatus(data.lightIntensity));
  updateStatus("distanceStatus", getDistanceStatus(data.distance));

  // Update device status
  if (data.devices) {
    updateDeviceStatus("lampStatus", data.devices.lamp);
    updateDeviceStatus("fanStatus", data.devices.fan);
    updateDeviceStatus("buzzerStatus", data.devices.buzzer);
    updateDeviceStatus("gateStatus", data.devices.gate, true);
  }

  // Update charts
  updateCharts(data);

  // Update statistics
  updateStatistics();

  // Update AI prediction
  updatePrediction();

  // Update info panel
  updateLastUpdate();
  dataCount++;
  updateElement("dataCount", dataCount);

  // Check for alerts
  checkAlerts(data);
}

function updateSensorValue(id, value, unit) {
  const element = document.getElementById(id);
  if (element) {
    element.textContent = parseFloat(value).toFixed(id === "gasLevel" ? 0 : 1);
  }
}

function updateStatus(id, status) {
  const element = document.getElementById(id);
  if (element) {
    element.textContent = status.text;
    element.className = `status-badge ${status.class}`;
  }
}

function updateDeviceStatus(id, isOn, isGate = false) {
  const element = document.getElementById(id);
  if (element) {
    if (isGate) {
      element.textContent = isOn ? "TERBUKA" : "TERTUTUP";
      element.className = `device-status ${isOn ? "open" : "off"}`;
    } else {
      element.textContent = isOn ? "ON" : "OFF";
      element.className = `device-status ${isOn ? "on" : "off"}`;
    }
  }
}

// ===== STATUS HELPERS =====
function getTemperatureStatus(temp) {
  const t = parseFloat(temp);
  if (t >= CONFIG.THRESHOLDS.temperature.danger) {
    return { text: "Bahaya!", class: "danger" };
  } else if (t >= CONFIG.THRESHOLDS.temperature.warning) {
    return { text: "Peringatan", class: "warning" };
  }
  return { text: "Normal", class: "normal" };
}

function getHumidityStatus(humidity) {
  const h = parseFloat(humidity);
  if (h >= CONFIG.THRESHOLDS.humidity.danger) {
    return { text: "Terlalu Lembab", class: "danger" };
  } else if (h >= CONFIG.THRESHOLDS.humidity.warning) {
    return { text: "Peringatan", class: "warning" };
  }
  return { text: "Normal", class: "normal" };
}

function getGasStatus(gas) {
  const g = parseInt(gas);
  if (g >= CONFIG.THRESHOLDS.gas.danger) {
    return { text: "Bahaya!", class: "danger" };
  } else if (g >= CONFIG.THRESHOLDS.gas.warning) {
    return { text: "Peringatan", class: "warning" };
  }
  return { text: "Normal", class: "normal" };
}

function getLightStatus(light) {
  const l = parseInt(light);
  if (l < CONFIG.THRESHOLDS.light.min) {
    return { text: "Terlalu Gelap", class: "warning" };
  } else if (l > CONFIG.THRESHOLDS.light.max) {
    return { text: "Terlalu Terang", class: "warning" };
  }
  return { text: "Normal", class: "normal" };
}

function getDistanceStatus(distance) {
  const d = parseInt(distance);
  if (d <= CONFIG.THRESHOLDS.distance.danger) {
    return { text: "Terlalu Dekat!", class: "danger" };
  } else if (d <= CONFIG.THRESHOLDS.distance.warning) {
    return { text: "Peringatan", class: "warning" };
  }
  return { text: "Aman", class: "normal" };
}

// ===== CHARTS UPDATE =====
function updateCharts(data) {
  const now = new Date();
  const timeLabel = now.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  chartData.labels.push(timeLabel);
  chartData.temperature.push(parseFloat(data.temperature));
  chartData.humidity.push(parseFloat(data.humidity));
  chartData.gas.push(parseInt(data.gasLevel));
  chartData.light.push(parseInt(data.lightIntensity));

  // Batasi jumlah data di chart
  if (chartData.labels.length > CONFIG.CHART_MAX_POINTS) {
    chartData.labels.shift();
    chartData.temperature.shift();
    chartData.humidity.shift();
    chartData.gas.shift();
    chartData.light.shift();
  }

  // Update chart
  if (charts.tempHumid) charts.tempHumid.update("none");
  if (charts.gasLight) charts.gasLight.update("none");
}

// ===== STATISTICS CALCULATION =====
function updateStatistics() {
  if (chartData.temperature.length === 0) return;

  // Calculate average temperature
  const avgTemp =
    chartData.temperature.reduce((a, b) => a + b, 0) /
    chartData.temperature.length;
  updateElement("avgTemp", avgTemp.toFixed(1));

  // Calculate average humidity
  const avgHumidity =
    chartData.humidity.reduce((a, b) => a + b, 0) / chartData.humidity.length;
  updateElement("avgHumidity", avgHumidity.toFixed(1));

  // Calculate max temperature
  const maxTemp = Math.max(...chartData.temperature);
  updateElement("maxTemp", maxTemp.toFixed(1));

  // Calculate min temperature
  const minTemp = Math.min(...chartData.temperature);
  updateElement("minTemp", minTemp.toFixed(1));
}

// ===== AI PREDICTION =====
function updatePrediction() {
  if (chartData.temperature.length < 5) {
    updateElement("predictedTemp", "--");
    return;
  }

  // Simple linear regression for temperature prediction
  const recentData = chartData.temperature.slice(-10); // Last 10 points
  const n = recentData.length;

  // Calculate trend using linear regression
  let sumX = 0,
    sumY = 0,
    sumXY = 0,
    sumX2 = 0;

  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += recentData[i];
    sumXY += i * recentData[i];
    sumX2 += i * i;
  }

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // Predict next value (one step ahead)
  const predictedTemp = slope * n + intercept;
  updateElement("predictedTemp", predictedTemp.toFixed(1));

  // Determine trend
  const trendElement = document.getElementById("tempTrend");
  if (trendElement) {
    if (slope > 0.1) {
      trendElement.innerHTML = '<i class="fas fa-arrow-up"></i> Meningkat';
      trendElement.className = "prediction-trend rising";
    } else if (slope < -0.1) {
      trendElement.innerHTML = '<i class="fas fa-arrow-down"></i> Menurun';
      trendElement.className = "prediction-trend falling";
    } else {
      trendElement.innerHTML = '<i class="fas fa-minus"></i> Stabil';
      trendElement.className = "prediction-trend stable";
    }
  }

  // Calculate risk level based on predicted temperature and current gas level
  const currentGas =
    chartData.gas.length > 0 ? chartData.gas[chartData.gas.length - 1] : 0;
  const riskElement = document.getElementById("riskLevel");

  if (riskElement) {
    let riskClass = "low";

    if (
      predictedTemp >= CONFIG.THRESHOLDS.temperature.danger ||
      currentGas >= CONFIG.THRESHOLDS.gas.danger
    ) {
      riskClass = "high";
    } else if (
      predictedTemp >= CONFIG.THRESHOLDS.temperature.warning ||
      currentGas >= CONFIG.THRESHOLDS.gas.warning
    ) {
      riskClass = "medium";
    }

    riskElement.innerHTML = `<span class="risk-badge ${riskClass}">${riskClass.toUpperCase()}</span>`;
  }
}

// ===== ALERTS =====
function checkAlerts(data) {
  const alerts = [];
  let hasDangerAlert = false;

  // Check temperature
  if (parseFloat(data.temperature) >= CONFIG.THRESHOLDS.temperature.danger) {
    alerts.push({
      type: "danger",
      icon: "fa-temperature-high",
      message: `Suhu terlalu tinggi: ${data.temperature}°C!`,
    });
    hasDangerAlert = true;
  }

  // Check gas
  if (parseInt(data.gasLevel) >= CONFIG.THRESHOLDS.gas.danger) {
    alerts.push({
      type: "danger",
      icon: "fa-exclamation-triangle",
      message: `Kadar gas berbahaya: ${data.gasLevel} ppm!`,
    });
    hasDangerAlert = true;
  }

  // Check distance
  if (parseInt(data.distance) <= CONFIG.THRESHOLDS.distance.danger) {
    alerts.push({
      type: "warning",
      icon: "fa-car-crash",
      message: `Kendaraan terlalu dekat: ${data.distance} cm!`,
    });
  }

  displayAlerts(alerts);

  // Play alert sound for danger alerts (throttled to once per 5 seconds)
  if (hasDangerAlert && alerts.length > 0) {
    playAlertSound();
  }
}

// Play alert sound with throttling
function playAlertSound() {
  const now = Date.now();
  const THROTTLE_TIME = 5000; // 5 seconds

  if (now - lastAlertTime > THROTTLE_TIME) {
    if (alertAudio) {
      alertAudio.currentTime = 0;
      alertAudio.play().catch((err) => {
        console.log("Alert sound autoplay blocked:", err);
      });
      lastAlertTime = now;
    }
  }
}

function displayAlerts(alerts) {
  const container = document.getElementById("alertsContainer");
  if (!container) return;

  container.innerHTML = "";

  alerts.forEach((alert) => {
    const alertDiv = document.createElement("div");
    alertDiv.className = `alert alert-${alert.type}`;
    alertDiv.innerHTML = `
            <i class="fas ${alert.icon}"></i>
            <span>${alert.message}</span>
        `;
    container.appendChild(alertDiv);
  });
}

function showAlert(type, message) {
  displayAlerts([
    {
      type: type,
      icon: "fa-info-circle",
      message: message,
    },
  ]);
}

// ===== CONNECTION STATUS =====
function updateConnectionStatus(connected) {
  connectionStatus = connected;
  const statusDot = document.getElementById("connectionStatus");
  const statusText = document.getElementById("connectionText");

  if (statusDot && statusText) {
    if (connected) {
      statusDot.className = "status-dot connected";
      statusText.textContent = "Terhubung";
    } else {
      statusDot.className = "status-dot disconnected";
      statusText.textContent = "Terputus";
    }
  }
}

// ===== INFO PANEL =====
function updateLastUpdate() {
  const now = new Date();
  const timeString = now.toLocaleString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  updateElement("lastUpdate", timeString);
}

function updateElement(id, value) {
  const element = document.getElementById(id);
  if (element) {
    element.textContent = value;
  }
}

// ===== EVENT LISTENERS =====
function setupEventListeners() {
  // Theme selector dropdown
  const themeBtn = document.getElementById("themeBtn");
  const themeDropdown = document.getElementById("themeDropdown");

  if (themeBtn && themeDropdown) {
    // Toggle dropdown
    themeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      themeDropdown.classList.toggle("show");
    });

    // Close dropdown when clicking outside
    document.addEventListener("click", (e) => {
      if (!themeBtn.contains(e.target) && !themeDropdown.contains(e.target)) {
        themeDropdown.classList.remove("show");
      }
    });

    // Theme options
    const themeOptions = themeDropdown.querySelectorAll(".theme-option");
    themeOptions.forEach((option) => {
      option.addEventListener("click", () => {
        const theme = option.dataset.theme;
        setTheme(theme);
        themeDropdown.classList.remove("show");
      });
    });
  }

  // Legacy theme toggle (if exists)
  const themeToggle = document.getElementById("themeToggle");
  if (themeToggle) {
    themeToggle.addEventListener("click", toggleTheme);
  }

  // Handle page visibility
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      if (updateTimer) clearInterval(updateTimer);
    } else {
      startDataFetching();
    }
  });

  // Handle window unload
  window.addEventListener("beforeunload", () => {
    if (updateTimer) clearInterval(updateTimer);
  });
}

// ===== THEME MANAGEMENT =====
function loadTheme() {
  // Load theme from localStorage
  const savedTheme = localStorage.getItem("dashboardTheme") || "dark";
  currentTheme = savedTheme;

  // Remove all theme classes first
  document.body.classList.remove(
    "light-mode",
    "blue-mode",
    "purple-mode",
    "green-mode"
  );

  // Apply saved theme
  if (savedTheme === "light") {
    document.body.classList.add("light-mode");
  } else if (savedTheme === "blue") {
    document.body.classList.add("blue-mode");
  } else if (savedTheme === "purple") {
    document.body.classList.add("purple-mode");
  } else if (savedTheme === "green") {
    document.body.classList.add("green-mode");
  }

  // Update active state in dropdown
  updateThemeDropdown(savedTheme);

  console.log(`🎨 Theme loaded: ${savedTheme}`);
}

function setTheme(theme) {
  // Remove all theme classes
  document.body.classList.remove(
    "light-mode",
    "blue-mode",
    "purple-mode",
    "green-mode"
  );

  // Apply new theme
  if (theme === "light") {
    document.body.classList.add("light-mode");
  } else if (theme === "blue") {
    document.body.classList.add("blue-mode");
  } else if (theme === "purple") {
    document.body.classList.add("purple-mode");
  } else if (theme === "green") {
    document.body.classList.add("green-mode");
  }
  // dark theme is the default (no class needed)

  currentTheme = theme;
  localStorage.setItem("dashboardTheme", theme);
  updateThemeDropdown(theme);
  updateChartColors();

  console.log(`🎨 Theme changed to: ${theme}`);
}

function updateThemeDropdown(theme) {
  const options = document.querySelectorAll(".theme-option");
  options.forEach((option) => {
    if (option.dataset.theme === theme) {
      option.classList.add("active");
    } else {
      option.classList.remove("active");
    }
  });
}

// Legacy function - kept for compatibility
function toggleTheme() {
  if (currentTheme === "dark") {
    setTheme("light");
  } else {
    setTheme("dark");
  }
}

function updateThemeIcon(theme) {
  // Legacy function - kept for compatibility
}

function updateChartColors() {
  let textColor, gridColor;

  if (currentTheme === "light") {
    textColor = "#0f172a";
    gridColor = "rgba(0, 0, 0, 0.1)";
  } else if (currentTheme === "blue") {
    textColor = "#e0f2fe";
    gridColor = "rgba(224, 242, 254, 0.1)";
  } else if (currentTheme === "purple") {
    textColor = "#f3e8ff";
    gridColor = "rgba(243, 232, 255, 0.1)";
  } else if (currentTheme === "green") {
    textColor = "#d1fae5";
    gridColor = "rgba(209, 250, 229, 0.1)";
  } else {
    textColor = "#f1f5f9";
    gridColor = "rgba(255, 255, 255, 0.1)";
  }

  // Update all charts
  Object.values(charts).forEach((chart) => {
    if (chart && chart.options) {
      // Update legend color
      if (chart.options.plugins && chart.options.plugins.legend) {
        chart.options.plugins.legend.labels.color = textColor;
      }

      // Update scale colors
      if (chart.options.scales) {
        Object.keys(chart.options.scales).forEach((scaleKey) => {
          const scale = chart.options.scales[scaleKey];
          if (scale.ticks) scale.ticks.color = textColor;
          if (scale.grid) scale.grid.color = gridColor;
          if (scale.title) scale.title.color = textColor;
        });
      }

      chart.update("none");
    }
  });
}

// ===== UTILITY FUNCTIONS =====
function logInfo(message) {
  console.log(`ℹ️ ${message}`);
}

function logError(message, error) {
  console.error(`❌ ${message}`, error);
}

// Export untuk debugging
window.dashboardDebug = {
  config: CONFIG,
  sensorData,
  chartData,
  charts,
  connectionStatus,
  forceUpdate: fetchData,
};

console.log("✅ Dashboard siap! Akses window.dashboardDebug untuk debugging");
