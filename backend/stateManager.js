const pool = require('./database');
const { getShift } = require('./utils/shift');

// In-memory state for real-time calculation (persisted to DB periodically)
let machinesState = {};
let activeShiftId = null;

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

const checkAndResetShift = (currentShiftId) => {
    if (activeShiftId !== null && activeShiftId !== currentShiftId) {
        console.log(`State Manager: Shift changed from ${activeShiftId} to ${currentShiftId}. Counts are kept continuously (session-based).`);
    }
    activeShiftId = currentShiftId;
};

const resetMachineStateCounts = (id) => {
    const mState = initMachineState(id);
    mState.good = 0;
    mState.ng = 0;
    mState.lastSignalTime = 0;
    console.log(`State Manager: Reset in-memory production counts for machine ID ${id} to 0.`);
};

const syncAllMachineStates = async () => {
    try {
        const currentShift = await getShift();
        checkAndResetShift(currentShift.id);
        
        const [rows] = await pool.query(`
            SELECT 
                m.id as machine_id,
                COUNT(CASE WHEN pe.signal_type = 'good' THEN 1 END) as good,
                COUNT(CASE WHEN pe.signal_type = 'ng' THEN 1 END) as ng
            FROM machines m
            LEFT JOIN active_sessions axs ON m.id = axs.machine_id
            LEFT JOIN production_events pe ON m.id = pe.machine_id AND pe.timestamp >= COALESCE(axs.start_time, NOW())
            GROUP BY m.id
        `);

        rows.forEach(row => {
            const mState = initMachineState(row.machine_id);
            mState.good = row.good || 0;
            mState.ng = row.ng || 0;
        });
        console.log("State Manager: Synced production counts from database (session-based).");
    } catch (e) {
        console.error("State Manager: Failed to sync counts.", e);
    }
};

module.exports = {
    initMachineState,
    getMachineState,
    getAllMachineStates,
    syncAllMachineStates,
    checkAndResetShift,
    resetMachineStateCounts
};
