import { nodes, updateMetrics } from './state.js';

export function initDevTools() {
    if (typeof window === 'undefined') return;

    const hud = document.createElement('div');
    hud.id = 'ghost-devtools-hud';
    hud.style = `
        position: fixed;
        bottom: 10px;
        right: 10px;
        background: rgba(10, 20, 10, 0.9);
        color: #00ff00;
        padding: 10px 15px;
        border-radius: 8px;
        font-family: 'JetBrains Mono', 'Courier New', monospace;
        font-size: 11px;
        z-index: 9999;
        pointer-events: none;
        border: 1px solid #004400;
        box-shadow: 0 4px 15px rgba(0,0,0,0.5);
        min-width: 180px;
    `;
    document.body.appendChild(hud);

    setInterval(() => {
        updateMetrics.recentUpdates = 0;
    }, 1000);

    function update() {
        const uptime = ((Date.now() - updateMetrics.startTime) / 1000).toFixed(1);
        hud.innerHTML = `
            <div style="font-weight: bold; border-bottom: 1px solid #004400; margin-bottom: 5px; padding-bottom: 3px; color: #fff;">GHOST.JS INSPECTOR</div>
            <div style="display: flex; justify-content: space-between;"><span>Nodes:</span> <span>${nodes.size}</span></div>
            <div style="display: flex; justify-content: space-between;"><span>Total Upd:</span> <span>${updateMetrics.totalUpdates}</span></div>
            <div style="display: flex; justify-content: space-between;"><span>Uptime:</span> <span>${uptime}s</span></div>
            <div style="margin-top: 5px; color: #888;">Mode: DETERMINISTIC</div>
        `;
        requestAnimationFrame(update);
    }
    update();
}
