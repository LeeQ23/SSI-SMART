const pool = require('../database');
const config = require('../config');
const settingsManager = require('../settingsManager');

const calculateSessionStats = async (machine_id, start_time, end_time) => {
    const [
        [counts],
        [stateLogs]
    ] = await Promise.all([
        pool.query(`
            SELECT signal_type, COUNT(*) as count 
            FROM production_events 
            WHERE machine_id = ? AND timestamp BETWEEN ? AND ?
            GROUP BY signal_type
        `, [machine_id, start_time, end_time]),
        pool.query(`
            SELECT state, timestamp 
            FROM machine_logs 
            WHERE machine_id = ? AND timestamp BETWEEN ? AND ?
            ORDER BY timestamp ASC
        `, [machine_id, start_time, end_time])
    ]);

    const good = counts.find(c => c.signal_type === 'good')?.count || 0;
    const ng = counts.find(c => c.signal_type === 'ng')?.count || 0;
    const totalCount = good + ng;

    let runningTime = 0;
    let downtime = 0;
    if (stateLogs.length > 0) {
        let prevTs = new Date(stateLogs[0].timestamp);
        
        for (let i = 0; i < stateLogs.length - 1; i++) {
            const currentTs = new Date(stateLogs[i + 1].timestamp);
            const duration = (currentTs - prevTs) / 1000;
            if (stateLogs[i].state === 'running') runningTime += duration;
            else downtime += duration;
            prevTs = currentTs;
        }
        const eTime = new Date(end_time);
        const durationSinceLast = (eTime - prevTs) / 1000;
        if (stateLogs[stateLogs.length - 1].state === 'running') runningTime += durationSinceLast;
        else downtime += durationSinceLast;
    }

    const sTime = new Date(start_time);
    const eTime = new Date(end_time);
    const queriedDurationSec = Math.max((eTime - sTime) / 1000, runningTime + downtime); // Ensure we don't divide by zero
    const plannedProductionTimeSec = queriedDurationSec * (1270 / 1440); // 1270 mins planned out of 1440 mins

    const availability = plannedProductionTimeSec > 0 ? (runningTime / plannedProductionTimeSec) : 0;
    const idealCycleTime = 8.5; // Specifically for 200A1 machine
    const performance = runningTime > 0 ? ((idealCycleTime * totalCount) / runningTime) : 0;
    const quality = totalCount > 0 ? (good / totalCount) : 0;
    const oee = (availability * performance * quality) * 100;

    return {
        good,
        ng,
        runningTime: Math.round(runningTime),
        downtime: Math.round(downtime),
        oee: Math.min(oee, 100).toFixed(1),
        availability: (availability * 100).toFixed(1),
        performance: (performance * 100).toFixed(1),
        quality: (quality * 100).toFixed(1)
    };
};

module.exports = {
    calculateSessionStats
};
