CREATE DATABASE IF NOT EXISTS ssi_smart_mfg;
USE ssi_smart_mfg;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('manager', 'operator') NOT NULL DEFAULT 'operator',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS shifts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS targets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  date DATE NOT NULL,
  target_qty INT NOT NULL,
  order_name VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_date (date)
);

CREATE TABLE IF NOT EXISTS production_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  good_count INT DEFAULT 0,
  ng_count INT DEFAULT 0,
  machine_current FLOAT DEFAULT 0,
  state ENUM('running', 'downtime') DEFAULT 'downtime',
  shift_id INT,
  FOREIGN KEY (shift_id) REFERENCES shifts(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS shift_comments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  shift_date DATE NOT NULL,
  shift_id INT NOT NULL,
  comment TEXT,
  manager_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (shift_id) REFERENCES shifts(id),
  FOREIGN KEY (manager_id) REFERENCES users(id)
);

-- Insert default shifts if not exist
INSERT IGNORE INTO shifts (id, name, start_time, end_time) VALUES
(1, 'Morning', '08:00:00', '16:00:00'),
(2, 'Evening', '16:00:00', '00:00:00'),
(3, 'Night', '00:00:00', '08:00:00');
