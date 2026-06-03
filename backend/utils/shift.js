const getCurrentShiftWindow = () => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const timeInMinutes = currentHour * 60 + currentMinute;
    
    // Default times (Shift logic updated to match standard 3 shifts)
    // Morning: 07:00 (420 min) to 15:00 (900 min)
    // Evening: 15:00 (900 min) to 23:00 (1380 min)
    // Night: 23:00 (1380 min) to 07:00 (420 min)
    const morningStart = 7 * 60;
    const eveningStart = 15 * 60;
    const nightStart = 23 * 60;
    
    let shiftStart = new Date(now);
    let shiftEnd = new Date(now);
    let shiftName = '';
    let shiftId = 1;

    if (timeInMinutes >= morningStart && timeInMinutes < eveningStart) {
        shiftName = 'Morning';
        shiftId = 1;
        shiftStart.setHours(7, 0, 0, 0);
        shiftEnd.setHours(14, 59, 59, 999);
    } else if (timeInMinutes >= eveningStart && timeInMinutes < nightStart) {
        shiftName = 'Evening';
        shiftId = 2;
        shiftStart.setHours(15, 0, 0, 0);
        shiftEnd.setHours(22, 59, 59, 999);
    } else {
        shiftName = 'Night';
        shiftId = 3;
        if (timeInMinutes >= nightStart) {
            shiftStart.setHours(23, 0, 0, 0);
            shiftEnd.setDate(shiftEnd.getDate() + 1);
            shiftEnd.setHours(6, 59, 59, 999);
        } else {
            shiftStart.setDate(shiftStart.getDate() - 1);
            shiftStart.setHours(23, 0, 0, 0);
            shiftEnd.setHours(6, 59, 59, 999);
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
