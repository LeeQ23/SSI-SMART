const assert = require('assert');

// Simulate the logic added to server.js
function getShiftStartStr(now, shift) {
    const todayStr = now.toISOString().split('T')[0];
    let shiftStartStr = `${todayStr} ${shift.start_time}`;

    // Handle midnight-crossing shifts
    if (shift.end_time < shift.start_time) {
        const timeString = now.toTimeString().split(' ')[0];
        if (timeString <= shift.end_time) {
            const yesterday = new Date(now);
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toISOString().split('T')[0];
            shiftStartStr = `${yesterdayStr} ${shift.start_time}`;
        }
    }
    return shiftStartStr;
}

// Test cases
console.log("Running shift logic verification tests...");

// 1. Normal shift (Day)
const now1 = new Date('2026-03-10T10:00:00');
const shift1 = { start_time: '07:00:00', end_time: '15:00:00' };
const res1 = getShiftStartStr(now1, shift1);
console.log(`Test 1 (Normal Day): ${res1} (Expected: 2026-03-10 07:00:00)`);
assert.strictEqual(res1, '2026-03-10 07:00:00');

// 2. Midnight-crossing shift (Night, before midnight)
const now2 = new Date('2026-03-10T23:30:00');
const shift2 = { start_time: '23:00:00', end_time: '07:00:00' };
const res2 = getShiftStartStr(now2, shift2);
console.log(`Test 2 (Night, before midnight): ${res2} (Expected: 2026-03-10 23:00:00)`);
assert.strictEqual(res2, '2026-03-10 23:00:00');

// 3. Midnight-crossing shift (Night, after midnight - THE BUG CASE)
const now3 = new Date('2026-03-11T02:00:00');
const shift3 = { start_time: '23:00:00', end_time: '07:00:00' };
const res3 = getShiftStartStr(now3, shift3);
console.log(`Test 3 (Night, after midnight): ${res3} (Expected: 2026-03-10 23:00:00)`);
assert.strictEqual(res3, '2026-03-10 23:00:00');

console.log("All shift logic tests passed!");
