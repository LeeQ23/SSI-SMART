const cron = require('node-cron');
const pool = require('../database');
const { getCurrentShiftWindow } = require('../utils/shift');
const { calculateSessionStats } = require('../services/statsService');

const saveShiftHistory = async () => {
    console.log(`[${new Date().toISOString()}] Auto-saving shift history...`);
    try {
        const [machines] = await pool.query('SELECT id FROM machines');
        const now = new Date();
        const shiftWindow = getCurrentShiftWindow(); 
        
        for (const m of machines) {
            const machine_id = m.id;
            const [activeSessions] = await pool.query('SELECT * FROM active_sessions WHERE machine_id = ?', [machine_id]);
            
            let session = activeSessions[0];
            let product_id = session ? session.product_id : 'N/A';
            let target_qty = session ? session.target_qty : 0;
            let shift_name = shiftWindow.name; 
            let operator_name = session ? session.operator_name : 'N/A';
            let operator_nim = session ? session.operator_nim : 'N/A';

            const stats = await calculateSessionStats(machine_id, shiftWindow.start, now);

            await pool.query(`
                INSERT INTO production_sessions 
                (machine_id, product_id, target_qty, shift_name, operator_name, operator_nim, 
                 start_time, end_time, good_count, ng_count, running_duration_sec, downtime_duration_sec, 
                 oee, availability, performance, quality) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                machine_id, product_id, target_qty, shift_name, operator_name, operator_nim,
                shiftWindow.start, now, stats.good, stats.ng, stats.runningTime, stats.downtime,
                stats.oee, stats.availability, stats.performance, stats.quality
            ]);
        }
        console.log(`[${new Date().toISOString()}] Auto-save completed.`);
    } catch (e) {
        console.error("Failed to auto-save shift history:", e);
    }
};

const initCronJobs = () => {
    // Schedule history save based on shift times
    cron.schedule('24 7 * * *', saveShiftHistory);
    cron.schedule('25 19 * * *', saveShiftHistory);
    console.log("Cron jobs initialized.");
};

module.exports = {
    initCronJobs
};
