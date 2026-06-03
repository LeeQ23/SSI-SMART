const pool = require('./database');
const { getShift } = require('./utils/shift');

// In-memory state for real-time calculation (persisted to DB periodically)
let machinesState = {};

// Helper to initialize machine state if not exists
const initMachineState = (id) => {
    if (!machinesState[id]) {
        machinesState[id] = {
            current: 0,
            good: 0,
            ng: 0,
            lastPulse: Date.now(),
            state: 'downtime',
            lastStateChange: Date.now(),
            lastSignalTime: 0
        };
    }
    return machinesState[id];
};

const getMachineState = (id) => {
    return machinesState[id];
};

const getAllMachineStates = () => {
    return machinesState;
};

const syncAllMachineStates = async () => {
    try {
        const currentShift = await getShift();
        const [rows] = await pool.query(`
            SELECT 
                machine_id,
                COUNT(CASE WHEN signal_type = 'good' THEN 1 END) as good,
                COUNT(CASE WHEN signal_type = 'ng' THEN 1 END) as ng
            FROM production_events
            WHERE timestamp >= ?
            GROUP BY machine_id
        `, [currentShift.start]);

        rows.forEach(row => {
            const mState = initMachineState(row.machine_id);
            mState.good = row.good;
            mState.ng = row.ng;
        });
        console.log("State Manager: Synced production counts from database.");
    } catch (e) {
        console.error("State Manager: Failed to sync counts.", e);
    }
};

module.exports = {
    initMachineState,
    getMachineState,
    getAllMachineStates,
    syncAllMachineStates
};
