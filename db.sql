CREATE TABLE sensor_data (
  id INT AUTO_INCREMENT PRIMARY KEY,
  suhu FLOAT,
  kelembapan FLOAT,
  gas_value INT,
  gas_status VARCHAR(10),
  lampu_status VARCHAR(10),
  gerbang_status VARCHAR(10),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
