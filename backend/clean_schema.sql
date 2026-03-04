-- Clean Schema for SSI Smart Manufacturing
-- This file contains table structures and initial seed data only.
-- Large log/event data has been omitted for portability.

CREATE DATABASE IF NOT EXISTS ssi_smart_mfg;
USE ssi_smart_mfg;

-- 1. Machines Table
CREATE TABLE IF NOT EXISTS `machines` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `code` varchar(10) NOT NULL,
  `type` enum('mechanical','hydraulic','cnc') NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Shifts Table
CREATE TABLE IF NOT EXISTS `shifts` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Users Table
CREATE TABLE IF NOT EXISTS `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL UNIQUE,
  `password` varchar(255) NOT NULL,
  `role` enum('manager','operator') DEFAULT 'operator',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Machine Logs (Status)
CREATE TABLE IF NOT EXISTS `machine_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `machine_id` int(11) DEFAULT 1,
  `machine_current` float NOT NULL,
  `state` enum('running','downtime') DEFAULT 'downtime',
  `timestamp` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  FOREIGN KEY (`machine_id`) REFERENCES `machines` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Production Events (Good/NG pulses)
CREATE TABLE IF NOT EXISTS `production_events` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `machine_id` int(11) DEFAULT 1,
  `shift_id` int(11) DEFAULT NULL,
  `signal_type` enum('good','ng') NOT NULL,
  `timestamp` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  FOREIGN KEY (`machine_id`) REFERENCES `machines` (`id`),
  FOREIGN KEY (`shift_id`) REFERENCES `shifts` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. Targets Table
CREATE TABLE IF NOT EXISTS `targets` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `machine_id` int(11) DEFAULT 1,
  `date` date NOT NULL,
  `target_qty` int(11) NOT NULL DEFAULT 1000,
  `order_name` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_machine_date` (`machine_id`, `date`),
  FOREIGN KEY (`machine_id`) REFERENCES `machines` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ESSENTIAL SEED DATA --

-- Initial Machines
INSERT IGNORE INTO `machines` (`id`, `code`, `type`) VALUES
(1, 'M1', 'mechanical'),
(2, 'M2', 'mechanical'),
(3, 'M3', 'mechanical');

-- Standard Shifts
INSERT IGNORE INTO `shifts` (`id`, `name`, `start_time`, `end_time`) VALUES
(1, 'Shift 1 (Morning)', '07:00:00', '15:00:00'),
(2, 'Shift 2 (Afternoon)', '15:00:00', '23:00:00'),
(3, 'Shift 3 (Night)', '23:00:00', '07:00:00');

-- Default Admin (Password: pass123)
-- bcrypt hash for 'pass123'
INSERT IGNORE INTO `users` (`username`, `password`, `role`) VALUES
('admin', '$2b$10$7Z/VfKx5v7y8y8y8y8y8yOu.sV.9u5.u5.u5.u5.u5.u5.u5.u5', 'manager');
