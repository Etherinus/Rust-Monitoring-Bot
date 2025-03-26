module.exports = async (client, updateMonitorFunc, intervalMs) => {
    console.log(`✅ Bot ${client.user.tag} is ready!`);

    if (process.env.BATTLEMETRICS_TOKEN) {
        const intervalMinutes = intervalMs / 60 / 1000;
        console.log(`[Monitor] Starting monitoring with a ${intervalMinutes} min PAUSE between cycles.`);

        const runUpdateCycle = async () => {
            const cycleStartTime = Date.now();
            try {
                await updateMonitorFunc(client);
            } catch (error) {
                console.error('[Monitor] ❌ Error INSIDE the monitoring update cycle:', error);
            } finally {
                const nextRunDelay = Math.max(0, intervalMs);
                setTimeout(runUpdateCycle, nextRunDelay);
            }
        };

        console.log('[Monitor] Initial update starting in 10 seconds...');
        setTimeout(runUpdateCycle, 10000);

    } else {
        console.log('[Monitor] Monitoring is disabled (BATTLEMETRICS_TOKEN not found).');
    }
};