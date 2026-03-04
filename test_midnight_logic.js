function testLogic(dateParam, startTime, endTime) {
    const d = new Date(dateParam);
    const dateStr = d.getFullYear() + '-' +
        String(d.getMonth() + 1).padStart(2, '0') + '-' +
        String(d.getDate()).padStart(2, '0');

    console.log(`Input Date: ${dateParam}`);
    console.log(`Shift: ${startTime} - ${endTime}`);

    const start = `${dateStr} ${startTime}`;
    let end = `${dateStr} ${endTime}`;

    if (endTime < startTime) {
        const nextD = new Date(d);
        nextD.setDate(nextD.getDate() + 1);
        const nextDateStr = nextD.getFullYear() + '-' +
            String(nextD.getMonth() + 1).padStart(2, '0') + '-' +
            String(nextD.getDate()).padStart(2, '0');
        end = `${nextDateStr} ${endTime}`;
    }

    console.log(`Result Start: ${start}`);
    console.log(`Result End:   ${end}`);
    console.log('---');
}

// Test case 1: Normal shift (Morning)
testLogic('2026-02-28', '07:00:00', '15:00:00');

// Test case 2: Evening shift
testLogic('2026-02-28', '15:00:00', '23:00:00');

// Test case 3: Night shift (Crosses midnight)
testLogic('2026-02-28', '23:00:00', '07:00:00');
