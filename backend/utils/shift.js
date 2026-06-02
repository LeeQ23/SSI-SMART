const getCurrentShiftWindow = () => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const timeInMinutes = currentHour * 60 + currentMinute;
    
    // Morning: 07:25 (445 min) to 19:25 (1165 min)
    const morningStart = 7 * 60 + 25;
    const morningEnd = 19 * 60 + 25;
    
    let shiftStart = new Date(now);
    let shiftEnd = new Date(now);
    let shiftName = '';
    let shiftId = 1;

    if (timeInMinutes >= morningStart && timeInMinutes <= morningEnd) {
        shiftName = 'Morning';
        shiftId = 1;
        shiftStart.setHours(7, 25, 0, 0);
        shiftEnd.setHours(19, 25, 59, 999);
    } else {
        shiftName = 'Night';
        shiftId = 2;
        if (timeInMinutes > morningEnd) {
            shiftStart.setHours(19, 26, 0, 0);
            shiftEnd.setDate(shiftEnd.getDate() + 1);
            shiftEnd.setHours(7, 24, 59, 999);
        } else {
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
