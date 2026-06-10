const express = require('express');
const router = express.Router();
const pool = require('../database');
const config = require('../config');
const authenticateToken = require('../utils/auth');
const settingsManager = require('../settingsManager');
const { calculateSessionStats } = require('../services/statsService');

router.get('/', authenticateToken, async (req, res) => {
    const { start, end } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    if (!start || !end) {
        return res.status(400).send('Start and End dates required');
    }

    try {
        const machine_id = req.query.machine_id;

        // 1. Get Production Counts (Good/NG)
        let eventQuery = `
            SELECT signal_type, CAST(COUNT(*) AS UNSIGNED) as count
            FROM production_events
            WHERE timestamp BETWEEN ? AND ?
            `;
        let eventParams = [start, end];
        if (machine_id) {
            eventQuery += ' AND machine_id = ?';
            eventParams.push(machine_id);
        }
        eventQuery += ' GROUP BY signal_type';
        const [eventRows] = await pool.query(eventQuery, eventParams);

        const good = Number(eventRows.find(r => r.signal_type === 'good')?.count || 0);
        const ng = Number(eventRows.find(r => r.signal_type === 'ng')?.count || 0);

        let stateQuery = 'SELECT state, timestamp FROM machine_logs WHERE timestamp BETWEEN ? AND ?';
        let stateParams = [start, end];
        if (machine_id) {
            stateQuery += ' AND machine_id = ?';
            stateParams.push(machine_id);
        }
        stateQuery += ' ORDER BY timestamp ASC';
        const [stateLogs] = await pool.query(stateQuery, stateParams);

        let timeline = stateLogs.map(l => ({
            state: l.state,
            timestamp: l.timestamp
        }));

        // Bucket timeline for large date ranges to keep chart performant
        if (stateLogs.length > 0) {
            const rangeMs = new Date(end).getTime() - new Date(start).getTime();
            const rangeHrs = rangeMs / (1000 * 60 * 60);

            let bucketMs = 0;
            if (rangeHrs > 24 * 30) bucketMs = 4 * 60 * 60 * 1000;  // > 1 month: 4h buckets
            else if (rangeHrs > 24 * 7) bucketMs = 60 * 60 * 1000;   // > 1 week: 1h buckets
            else if (rangeHrs > 24) bucketMs = 15 * 60 * 1000;       // > 1 day: 15m buckets

            if (bucketMs > 0) {
                const startMs = new Date(start).getTime();
                const endMs = new Date(end).getTime();
                const bucketedTimeline = [];

                for (let t = startMs; t < endMs; t += bucketMs) {
                    const bucketEnd = t + bucketMs;
                    const logsInBucket = stateLogs.filter(l => {
                        const ts = new Date(l.timestamp).getTime();
                        return ts >= t && ts < bucketEnd;
                    });

                    if (logsInBucket.length > 0) {
                        const runCount = logsInBucket.filter(l => l.state === 'running').length;
                        const majorityState = runCount >= logsInBucket.length / 2 ? 'running' : 'downtime';
                        bucketedTimeline.push({
                            state: majorityState,
                            timestamp: new Date(t)
                        });
                    }
                }
                timeline = bucketedTimeline;
            }
        }

        let runTimeSec = 0;
        let downTimeSec = 0;
        let oee = 0, availability = 0, performance = 0, quality = 0;

        // If specific machine selected, use standard statsService logic
        if (machine_id) {
            const stats = await calculateSessionStats(machine_id, start, end);
            runTimeSec = stats.runningTime;
            downTimeSec = stats.downtime;
            oee = stats.oee;
            availability = stats.availability;
            performance = stats.performance;
            quality = stats.quality;
        } else {
            // Global calculation across all machines
            if (timeline.length > 0) {
                for (let i = 0; i < timeline.length - 1; i++) {
                    const s = new Date(stateLogs[i].timestamp);
                    const e = new Date(stateLogs[i + 1].timestamp);
                    const duration = (e - s) / 1000;
                    if (stateLogs[i].state === 'running') runTimeSec += duration;
                    else downTimeSec += duration;
                }
            }
            const totalTime = runTimeSec + downTimeSec;
            const totalParts = good + ng;
            const idealCycleTime = settingsManager.getSetting('IDEAL_CYCLE_TIME') || config.IDEAL_CYCLE_TIME;
            const availCalc = totalTime > 0 ? runTimeSec / totalTime : 0;
            const perfCalc = runTimeSec > 0 ? (totalParts * idealCycleTime) / runTimeSec : 0;
            const qualCalc = totalParts > 0 ? good / totalParts : 0;
            oee = (Math.min(availCalc * perfCalc * qualCalc, 1) * 100).toFixed(1);
            availability = (availCalc * 100).toFixed(1);
            performance = (perfCalc * 100).toFixed(1);
            quality = (qualCalc * 100).toFixed(1);
        }

        // 3. Get Production Event Logs (for tiny dots in timeline)
        let eventLogQuery = 'SELECT signal_type, timestamp FROM production_events WHERE timestamp BETWEEN ? AND ?';
        let eventLogParams = [start, end];
        if (machine_id) {
            eventLogQuery += ' AND machine_id = ?';
            eventLogParams.push(machine_id);
        }
        eventLogQuery += ' ORDER BY timestamp ASC';
        const [productionEvents] = await pool.query(eventLogQuery, eventLogParams);

        // 4. Get Downtime Events for this period with Pagination
        let downtimeCountQuery = 'SELECT COUNT(*) as total FROM downtimes d WHERE d.start_time BETWEEN ? AND ?';
        let downtimeLogQuery = `
            SELECT d.*, m.code as machine_code, u.username as operator_name
            FROM downtimes d
            JOIN machines m ON d.machine_id = m.id
            LEFT JOIN users u ON d.operator_id = u.id
            WHERE d.start_time BETWEEN ? AND ?
        `;
        let downtimeLogParams = [start, end];
        
        if (machine_id) {
            downtimeCountQuery += ' AND d.machine_id = ?';
            downtimeLogQuery += ' AND d.machine_id = ?';
            downtimeLogParams.push(machine_id);
        }

        const [countResult] = await pool.query(downtimeCountQuery, downtimeLogParams);
        const totalEvents = countResult[0].total;
        const totalPages = Math.ceil(totalEvents / limit);

        downtimeLogQuery += ' ORDER BY d.start_time DESC LIMIT ? OFFSET ?';
        downtimeLogParams.push(limit, offset);
        
        const [downtimeEvents] = await pool.query(downtimeLogQuery, downtimeLogParams);

        res.json({
            metrics: {
                good,
                ng,
                oee,
                availability,
                performance,
                quality,
                runTime: runTimeSec,
                downTime: downTimeSec
            },
            timeline,
            productionEvents,
            downtimeEvents,
            pagination: {
                currentPage: page,
                totalPages,
                totalEvents,
                limit
            }
        });

    } catch (e) {
        console.error("Analytics Error", e);
        res.status(500).json({ error: e.message });
    }
});

router.get('/history', authenticateToken, async (req, res) => {
    try {
        const { machine_id, limit, start_date, end_date, orderBy, orderDir } = req.query;
        let query = `
            SELECT ps.*, m.code as machine_code
            FROM production_sessions ps
            JOIN machines m ON ps.machine_id = m.id
            WHERE 1=1
        `;
        let params = [];
        if (machine_id) {
            query += ` AND ps.machine_id = ? `;
            params.push(machine_id);
        }
        if (start_date) {
            query += ` AND DATE(ps.start_time) >= ? `;
            params.push(start_date);
        }
        if (end_date) {
            query += ` AND DATE(ps.start_time) <= ? `;
            params.push(end_date);
        }

        // Fetch a larger pool to allow for aggregation
        query += ` ORDER BY ps.start_time DESC LIMIT 200 `;
        
        const [rows] = await pool.query(query, params);
        
        // Dynamically map and merge legacy 3-shifts into 2-shifts (12h split)
        const aggregated = {};
        rows.forEach(row => {
            let newShift = row.shift_name;
            if (newShift === 'Morning') newShift = 'Day Shift';
            else if (newShift === 'Evening' || newShift === 'Night') newShift = 'Night Shift';
            
            // Logical work day: Night shift starting after midnight belongs to previous day's shift
            const dateObj = new Date(row.start_time);
            let workDate = dateObj.toISOString().split('T')[0];
            if (newShift === 'Night Shift' && dateObj.getHours() < 12) {
                 const prevDay = new Date(dateObj);
                 prevDay.setDate(prevDay.getDate() - 1);
                 workDate = prevDay.toISOString().split('T')[0];
            }

            const key = `${row.machine_id}_${workDate}_${newShift}`;
            if (!aggregated[key]) {
                aggregated[key] = { ...row, shift_name: newShift };
            } else {
                const existing = aggregated[key];
                
                // Calculate weighted OEE
                const t1 = existing.running_duration_sec + existing.downtime_duration_sec;
                const t2 = row.running_duration_sec + row.downtime_duration_sec;
                if (t1 + t2 > 0) {
                     existing.oee = ((Number(existing.oee) * t1 + Number(row.oee) * t2) / (t1 + t2)).toFixed(1);
                }
                
                // Sum counts and durations
                existing.good_count += row.good_count;
                existing.ng_count += row.ng_count;
                existing.running_duration_sec += row.running_duration_sec;
                existing.downtime_duration_sec += row.downtime_duration_sec;
                
                // Expand start/end boundaries
                if (new Date(row.start_time) < new Date(existing.start_time)) existing.start_time = row.start_time;
                if (new Date(row.end_time) > new Date(existing.end_time)) existing.end_time = row.end_time;
            }
        });
        
        // Convert to array and sort dynamically based on user request
        let finalRows = Object.values(aggregated);
        
        const allowedSort = ['start_time', 'product_id', 'good_count', 'ng_count', 'oee'];
        const sortCol = allowedSort.includes(orderBy) ? orderBy : 'start_time';
        const isAsc = orderDir === 'ASC';
        
        finalRows.sort((a, b) => {
            let valA = a[sortCol];
            let valB = b[sortCol];
            if (sortCol === 'start_time') {
                valA = new Date(valA).getTime();
                valB = new Date(valB).getTime();
            } else {
                valA = Number(valA);
                valB = Number(valB);
            }
            if (valA < valB) return isAsc ? -1 : 1;
            if (valA > valB) return isAsc ? 1 : -1;
            return 0;
        });
        
        const finalLimit = limit ? parseInt(limit) : 25;
        res.json(finalRows.slice(0, finalLimit));
    } catch (e) {
        console.error("History API Error", e);
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;
