const pool = require('../database');
const config = require('../config');
const { getAllMachineStates } = require('../stateManager');
const socketManager = require('../socketManager');
const settingsManager = require('../settingsManager');

const initMachineWatcher = () => {
    setInterval(() => {
        const now = Date.now();
        const machinesState = getAllMachineStates();
        
        for (const [id, mState] of Object.entries(machinesState)) {
            const timeSinceSignal = now - mState.lastSignalTime;
            const currentThreshold = settingsManager.getSetting('CURRENT_THRESHOLD') || config.CURRENT_THRESHOLD;
            const isRunningTarget = (mState.current > currentThreshold) || (timeSinceSignal <= 60000);
            const newState = isRunningTarget ? 'running' : 'downtime';
            
            if (newState !== mState.state) {
                mState.state = newState;
                mState.lastStateChange = now;
                pool.query('INSERT INTO machine_logs (machine_current, state, machine_id) VALUES (?, ?, ?)', [mState.current, newState, id]).catch(console.error);
                
                try {
                    const io = socketManager.getIO();
                    io.emit('machine_update', { machine_id: id, ...mState });
                } catch (e) {
                    console.error("Failed to broadcast machine update from watcher:", e);
                }
            }
        }
    }, 5000);
    console.log("Machine watcher initialized.");
};

module.exports = {
    initMachineWatcher
};
