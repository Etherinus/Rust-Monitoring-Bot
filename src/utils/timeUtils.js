const dayMap = { Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6 };
const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

function getNextWipeTimestamp(dayOfWeek, timeStr) {
    if (!timeRegex.test(timeStr)) {
        throw new Error(`Invalid time format for wipe: "${timeStr}". Expected HH:MM.`);
    }
    const [h, m] = timeStr.split(':').map(Number);

    const targetDay = dayMap[dayOfWeek];
    if (targetDay === undefined) {
        throw new Error(`Invalid day of the week for wipe: "${dayOfWeek}". Must be one of ${Object.keys(dayMap).join(', ')}.`);
    }

    const now = new Date();
    const currentDay = now.getDay();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    let daysToAdd = targetDay - currentDay;

    if (daysToAdd < 0 || (daysToAdd === 0 && (currentHour > h || (currentHour === h && currentMinute >= m)))) {
        daysToAdd += 7;
    }

    const nextWipeDate = new Date(now);
    nextWipeDate.setDate(now.getDate() + daysToAdd);
    nextWipeDate.setHours(h, m, 0, 0);

    return Math.floor(nextWipeDate.getTime() / 1000);
}

function getNextDailyTimestamp(timeStr) {
    if (!timeRegex.test(timeStr)) {
        throw new Error(`Invalid time format for restart: "${timeStr}". Expected HH:MM.`);
    }
    const [h, m] = timeStr.split(':').map(Number);

    const now = new Date();
    const nextRestartDate = new Date(now);
    nextRestartDate.setHours(h, m, 0, 0);

    if (nextRestartDate <= now) {
        nextRestartDate.setDate(nextRestartDate.getDate() + 1);
    }

    return Math.floor(nextRestartDate.getTime() / 1000);
}

module.exports = {
    getNextWipeTimestamp,
    getNextDailyTimestamp,
    dayMap
};