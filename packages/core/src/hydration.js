import { mount, scheduleUpdate } from './render-graph.js';
import { signal } from './signals.js';
import { renderToString } from './ssr.js';

/**
 * Client-side hydration
 * Looks for ghost-data scripts and initializes signals with SSR state.
 */
export function hydrate(App, container) {
    const dataScript = document.querySelector('script[data-ghost-ssr]');
    if (dataScript) {
        try {
            const ssrState = JSON.parse(dataScript.textContent);
            // In a full implementation, we would map these to specific signals
            // For now, we'll just store them globally for the app to consume
            window.__GHOST_SSR_DATA__ = ssrState;
        } catch (e) {
            console.error('Failed to parse Ghost SSR data', e);
        }
    }

    // Mount the app over the existing HTML
    // A real hydrator would diff against the existing DOM
    // Ghost's deterministic render graph makes this predictable
    container.innerHTML = '';
    mount(App, container);
}

/**
 * Enhanced renderToString with state serialization
 */
export function renderWithState(node, state = {}) {
    const html = renderToString(node);
    const stateJson = JSON.stringify(state);
    return `
        ${html}
        <script type="application/json" data-ghost-ssr>${stateJson}</script>
    `.trim();
}

// Re-export basic SSR
export { renderToString } from './ssr.js';
