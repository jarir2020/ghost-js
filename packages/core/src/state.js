export const nodes = new Set();

export const updateMetrics = {
    totalUpdates: 0,
    startTime: Date.now(),
    recentUpdates: 0
};

export function recordUpdate() {
    updateMetrics.totalUpdates++;
    updateMetrics.recentUpdates++;
}
