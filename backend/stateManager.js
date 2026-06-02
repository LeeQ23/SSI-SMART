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

module.exports = {
    initMachineState,
    getMachineState,
    getAllMachineStates
};
