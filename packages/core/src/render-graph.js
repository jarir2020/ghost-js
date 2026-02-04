import { effect, batch } from './signals.js';
import { nodes, recordUpdate } from './state.js';
let frameDeadline = 0;
const YIELD_THRESHOLD = 5; // ms

export function createNode(tag, props, children = []) {
    const node = {
        tag,
        props,
        children,
        el: null,
        effects: [],
        events: {
            mount: [],
            update: [],
            destroy: []
        }
    };
    nodes.add(node);
    return node;
}

export function on(node, event, fn) {
    if (!node) return;
    node.events = node.events || { mount: [], update: [], destroy: [] };
    if (node.events[event]) {
        node.events[event].push(fn);
    }
}

export function mount(node, parentEl) {
    if (!node || typeof node !== 'object') return;

    // Basic normalization for raw objects
    node.props = node.props || {};
    node.effects = node.effects || [];
    node.children = node.children || [];
    node.events = node.events || { mount: [], update: [], destroy: [] };

    if (!node.tag) return;
    nodes.add(node);

    const el = document.createElement(node.tag);
    node.el = el;

    // Apply props
    Object.entries(node.props).forEach(([key, value]) => {
        if (key === 'ghostStyle' && value && typeof value === 'object' && value.mount) {
            value.mount(el);
            return;
        }

        const isEvent = key.startsWith('on');

        if (typeof value === 'function' && !isEvent) {
            // If it's a reactive getter (not an event)
            node.effects.push(effect(() => {
                const val = value();
                el.setAttribute(key, val);
                recordUpdate();
                if (node.events && node.events.update) {
                    node.events.update.forEach(fn => fn());
                }
            }));
        } else if (isEvent) {
            // Event listener: assign directly, DO NOT call it
            el[key.toLowerCase()] = value;
        } else {
            el.setAttribute(key, value);
        }
    });

    // Mount children
    node.children.forEach(child => {
        if (!child) return;
        if (typeof child === 'string' || typeof child === 'number') {
            el.appendChild(document.createTextNode(String(child)));
        } else if (typeof child === 'function') {
            // Reactive child
            let currentChildEl = null;
            node.effects.push(effect(() => {
                const val = child();
                const newText = document.createTextNode(String(val));
                if (currentChildEl) {
                    el.replaceChild(newText, currentChildEl);
                } else {
                    el.appendChild(newText);
                }
                currentChildEl = newText;
                recordUpdate();
                if (node.events && node.events.update) {
                    node.events.update.forEach(fn => fn());
                }
            }));
        } else {
            mount(child, el);
        }
    });

    parentEl.appendChild(el);
    if (node.events && node.events.mount) {
        node.events.mount.forEach(fn => fn());
    }
}

export function destroy(node) {
    if (!node) return;
    if (node.effects) node.effects.forEach(cleanup => cleanup());
    if (node.events && node.events.destroy) {
        node.events.destroy.forEach(fn => fn());
    }
    if (node.el && node.el.parentNode) {
        node.el.parentNode.removeChild(node.el);
    }
    nodes.delete(node);
}

// Time-boxed rendering concept (simplified)
// In a real implementation, we would use a scheduler to handle batches of updates
// and yield if we exceed the budget.
export function scheduleUpdate(fn) {
    if (performance.now() > frameDeadline) {
        // Yield or schedule for next frame
        requestAnimationFrame(() => {
            frameDeadline = performance.now() + YIELD_THRESHOLD;
            batch(fn);
        });
    } else {
        batch(fn);
    }
}
