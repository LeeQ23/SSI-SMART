-- 1. Table for Raw Counter Signals (Replaces Client-side Counting)
-- This table logs every time the IR sensor sends a 'good' or 'ng' signal.
CREATE TABLE IF NOT EXISTS production_events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    signal_type ENUM('good', 'ng') NOT NULL, -- The type of signal received
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- Exact time of the event
    shift_id INT, -- Optional: Can be populated by the server at insert time for faster querying
    FOREIGN KEY (shift_id) REFERENCES shifts(id)
);

-- 2. Table for Machine Status (Current, Voltage, etc.)
-- This stores the continuous stream of data from the PZEM sensor.
-- We can use this to determine 'Running' vs 'Downtime' state historically.
CREATE TABLE IF NOT EXISTS machine_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    machine_current FLOAT NOT NULL,
    state ENUM('running', 'downtime') DEFAULT 'downtime', -- Derived from current threshold at insert time
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Note: The 'production_logs' and 'current_logs' tables (from previous attempts) 
-- can be deprecated or migrated to these new structures if needed.
