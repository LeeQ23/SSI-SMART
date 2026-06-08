const getCurrentShiftWindow = () => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const timeInMinutes = currentHour * 60 + currentMinute;
    
    // Day Shift: 07:25 to 19:25 (445 to 1165 mins)
    // Night Shift: 19:26 to 07:24 (1166 to 444 mins)
    const dayStart = 7 * 60 + 25; // 445
    const nightStart = 19 * 60 + 26; // 1166
    
    let shiftStart = new Date(now);
    let shiftEnd = new Date(now);
    let shiftName = '';
    let shiftId = 1;

    if (timeInMinutes >= dayStart && timeInMinutes < nightStart) {
        shiftName = 'Day Shift';
        shiftId = 1;
        shiftStart.setHours(7, 25, 0, 0);
        shiftEnd.setHours(19, 25, 59, 999);
    } else {
        shiftName = 'Night Shift';
        shiftId = 2;
        if (timeInMinutes >= nightStart) {
            // Before midnight
            shiftStart.setHours(19, 26, 0, 0);
            shiftEnd.setDate(shiftEnd.getDate() + 1);
            shiftEnd.setHours(7, 24, 59, 999);
        } else {
            // After midnight
            shiftStart.setDate(shiftStart.getDate() - 1);
            shiftStart.setHours(19, 26, 0, 0);
            shiftEnd.setHours(7, 24, 59, 999);
        }
    }
    return { id: shiftId, name: shiftName, start: shiftStart, end: shiftEnd };
};

const getShift = async () => {
    return getCurrentShiftWindow();
};

module.exports = {
    getCurrentShiftWindow,
    getShift
};
