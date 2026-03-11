-- Tables to support session-based production tracking

USE ssi_smart_mfg;

-- 1. Table for Active Sessions (Current state of each machine)
CREATE TABLE IF NOT EXISTS active_sessions (
    machine_id INT PRIMARY KEY,
    product_id VARCHAR(50) NOT NULL,
    target_qty INT NOT NULL,
    shift_name VARCHAR(50) NOT NULL,
    operator_name VARCHAR(100) NOT NULL,
    operator_nim VARCHAR(50) NOT NULL,
    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (machine_id) REFERENCES machines(id)
);

-- 2. Table for Finalized Production Sessions (History)
CREATE TABLE IF NOT EXISTS production_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    machine_id INT NOT NULL,
    product_id VARCHAR(50) NOT NULL,
    target_qty INT NOT NULL,
    shift_name VARCHAR(50) NOT NULL,
    operator_name VARCHAR(100) NOT NULL,
    operator_nim VARCHAR(50) NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    good_count INT DEFAULT 0,
    ng_count INT DEFAULT 0,
    running_duration_sec INT DEFAULT 0,
    downtime_duration_sec INT DEFAULT 0,
    oee FLOAT DEFAULT 0,
    availability FLOAT DEFAULT 0,
    performance FLOAT DEFAULT 0,
    quality FLOAT DEFAULT 0,
    FOREIGN KEY (machine_id) REFERENCES machines(id)
);
