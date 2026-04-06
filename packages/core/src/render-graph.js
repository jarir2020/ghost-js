// Ghost Render Graph — updated 2026-04-06
// Added: createList (keyed diffing), when() (conditionals), defineComponent (props), memo(), lazyNode()
import { effect, batch, computed } from './signals.js';
import { nodes, recordUpdate } from './state.js';

let frameDeadline = 0;
const YIELD_THRESHOLD = 5; // ms

// ─── Node factory ─────────────────────────────────────────────────────────────

export function createNode(tag, props, children = []) {
    const node = {
        tag,
        props,
        children,
        el: null,
        effects: [],
        events: { mount: [], update: [], destroy: [], error: [] }
    };
    nodes.add(node);
    return node;
}

/** Register per-node error handler. */
export function onNodeError(node, fn) {
    if (!node) return;
    node.events = node.events || { mount: [], update: [], destroy: [], error: [] };
    (node.events.error = node.events.error || []).push(fn);
}

export function on(node, event, fn) {
    if (!node) return;
    node.events = node.events || { mount: [], update: [], destroy: [], error: [] };
    if (node.events[event]) node.events[event].push(fn);
}

// ─── Mount ────────────────────────────────────────────────────────────────────

export function mount(node, parentEl) {
    if (!node || typeof node !== 'object') return;

    // Handle special descriptors first
    if (node.__ghostList) { _mountList(node, parentEl); return; }
    if (node.__ghostWhen) { _mountWhen(node, parentEl); return; }
    if (node.__ghostLazy) { _mountLazy(node, parentEl); return; }

    node.props    = node.props    || {};
    node.effects  = node.effects  || [];
    node.children = node.children || [];
    node.events   = node.events   || { mount: [], update: [], destroy: [], error: [] };

    if (!node.tag) return;
    nodes.add(node);

    const el = document.createElement(node.tag);
    node.el = el;

    // Props
    Object.entries(node.props).forEach(([key, value]) => {
        if (key === 'ghostStyle' && value?.mount) { value.mount(el); return; }

        const isEvent = key.startsWith('on');
        if (typeof value === 'function' && !isEvent) {
            node.effects.push(effect(() => {
                el.setAttribute(key, value());
                recordUpdate();
                node.events.update?.forEach(fn => fn());
            }));
        } else if (isEvent) {
            el[key.toLowerCase()] = value;
        } else {
            el.setAttribute(key, value);
        }
    });

    // Children
    node.children.forEach(child => {
        if (child == null) return;

        if (child.__ghostList || child.__ghostWhen || child.__ghostLazy) {
            mount(child, el);
        } else if (typeof child === 'string' || typeof child === 'number') {
            el.appendChild(document.createTextNode(String(child)));
        } else if (typeof child === 'function') {
            let current = null;
            node.effects.push(effect(() => {
                const val = child();
                const next = document.createTextNode(String(val ?? ''));
                if (current) el.replaceChild(next, current);
                else el.appendChild(next);
                current = next;
                recordUpdate();
                node.events.update?.forEach(fn => fn());
            }));
        } else {
            mount(child, el);
        }
    });

    parentEl.appendChild(el);
    node.events.mount?.forEach(fn => fn());
}

export function destroy(node) {
    if (!node) return;
    if (node._listCleanup) { node._listCleanup(); return; }
    if (node._whenCleanup) { node._whenCleanup(); return; }
    node.effects?.forEach(c => c());
    node.events?.destroy?.forEach(fn => fn());
    if (node.el?.parentNode) node.el.parentNode.removeChild(node.el);
    nodes.delete(node);
}

// ─── createList — reactive keyed list rendering ───────────────────────────────

/**
 * Reactively renders a list with keyed diffing.
 *
 * @param {() => any[]} getItems  - Reactive getter returning the array
 * @param {(item) => string|number} keyFn - Unique key per item
 * @param {(item, index) => GhostNode} renderFn - Factory for each item node
 *
 * Usage:
 *   createNode('ul', {}, [
 *     createList(() => todos.get(), t => t.id, t => createNode('li', {}, [t.text]))
 *   ])
 */
export function createList(getItems, keyFn, renderFn) {
    return { __ghostList: true, getItems, keyFn, renderFn };
}

function _mountList(descriptor, parentEl) {
    const { getItems, keyFn, renderFn } = descriptor;

    // Anchor comments bracket the list's DOM territory
    const start  = document.createComment('[ghost-list]');
    const end    = document.createComment('[/ghost-list]');
    parentEl.appendChild(start);
    parentEl.appendChild(end);

    // key → { ghostNode, els: NodeList[] }
    const live = new Map();

    function getEl(ghostNode) {
        // A mounted ghostNode has el; collect it plus any children
        return ghostNode.el || null;
    }

    const cleanup = effect(() => {
        const items    = getItems();
        const newKeys  = items.map((item, i) => String(keyFn(item, i)));
        const oldKeys  = Array.from(live.keys());

        // 1. Remove items no longer in list
        for (const key of oldKeys) {
            if (!newKeys.includes(key)) {
                const entry = live.get(key);
                destroy(entry.ghostNode);
                live.delete(key);
            }
        }

        // 2. Insert / reorder
        // We build the desired DOM order by walking newKeys and using insertBefore(end)
        for (let i = 0; i < items.length; i++) {
            const key = newKeys[i];
            if (!live.has(key)) {
                // New item — render and insert before end anchor
                const ghostNode = renderFn(items[i], i);
                const tmp = document.createElement('ghost-list-slot');
                mount(ghostNode, tmp);
                // Move children from tmp into parent before end
                while (tmp.firstChild) {
                    parentEl.insertBefore(tmp.firstChild, end);
                }
                live.set(key, { ghostNode });
            }
        }

        // 3. Reorder existing nodes to match newKeys order
        // Walk backwards: ensure each node's el is immediately before the next one's
        for (let i = newKeys.length - 1; i >= 0; i--) {
            const key = newKeys[i];
            const entry = live.get(key);
            if (!entry) continue;
            const el = getEl(entry.ghostNode);
            if (!el) continue;
            // The node should sit just before end (for last) or before the next key's el
            const nextKey  = newKeys[i + 1];
            const nextEl   = nextKey ? getEl(live.get(nextKey)?.ghostNode) : null;
            const before   = nextEl || end;
            if (el.nextSibling !== before) {
                parentEl.insertBefore(el, before);
            }
        }

        recordUpdate();
    });

    // Expose cleanup on a synthetic node for destroy() compatibility
    descriptor._listCleanup = () => {
        cleanup();
        for (const entry of live.values()) destroy(entry.ghostNode);
        live.clear();
        start.remove();
        end.remove();
    };
}

// ─── when() — conditional rendering ──────────────────────────────────────────

/**
 * Conditionally renders a node based on a reactive condition.
 *
 * @param {() => boolean} conditionGetter
 * @param {() => GhostNode} trueFn
 * @param {() => GhostNode} [falseFn]
 *
 * Usage:
 *   when(() => isLoggedIn.get(), () => createNode('div', {}, ['Welcome!']),
 *                                () => createNode('div', {}, ['Please log in']))
 */
export function when(conditionGetter, trueFn, falseFn = null) {
    return { __ghostWhen: true, conditionGetter, trueFn, falseFn };
}

function _mountWhen(descriptor, parentEl) {
    const { conditionGetter, trueFn, falseFn } = descriptor;

    const anchor  = document.createComment('[ghost-when]');
    parentEl.appendChild(anchor);

    let currentNode = null;

    const cleanup = effect(() => {
        const show   = conditionGetter();
        const branch = show ? trueFn : falseFn;

        // Destroy previous branch
        if (currentNode) {
            destroy(currentNode);
            currentNode = null;
        }

        if (branch) {
            currentNode = branch();
            if (currentNode) {
                // Mount into a slot then move before anchor
                const tmp = document.createElement('ghost-when-slot');
                mount(currentNode, tmp);
                while (tmp.firstChild) {
                    parentEl.insertBefore(tmp.firstChild, anchor);
                }
            }
        }
        recordUpdate();
    });

    descriptor._whenCleanup = () => {
        cleanup();
        if (currentNode) destroy(currentNode);
        anchor.remove();
    };
}

// ─── defineComponent() — props system ────────────────────────────────────────

/**
 * Defines a Ghost component with a typed props interface.
 * Props that are plain values get wrapped as getter functions so children
 * can reactively track them without knowing whether they came from a signal.
 *
 * @param {(props: Object) => GhostNode} setup
 * @returns {(rawProps: Object) => GhostNode}
 *
 * Usage:
 *   const Button = defineComponent((props) =>
 *     createNode('button', { onclick: props.onClick }, [props.label])
 *   );
 *   // Use: Button({ label: 'Click me', onClick: () => doSomething() })
 */
export function defineComponent(setup) {
    return function (rawProps = {}) {
        // Normalize: wrap non-function values in getters so they're uniformly callable
        const props = {};
        for (const [key, val] of Object.entries(rawProps)) {
            props[key] = typeof val === 'function' ? val : () => val;
        }
        return setup(props);
    };
}

// ─── memo() — memoized component ─────────────────────────────────────────────

/**
 * Memoizes a node factory — only re-runs if depsGetter() value changes (shallow compare).
 *
 * @param {() => GhostNode} factory
 * @param {() => any} depsGetter  - Should return a value or array of values
 * @returns GhostNode (cached or freshly rendered)
 *
 * Usage:
 *   memo(() => HeavyComponent({ data: data.get() }), () => data.get())
 */
export function memo(factory, depsGetter) {
    let lastDeps  = undefined;
    let lastNode  = null;

    return new Proxy({}, {
        get(_, prop) {
            const deps = depsGetter();
            const changed = lastDeps === undefined || !shallowEqual(deps, lastDeps);
            if (changed) {
                lastDeps = deps;
                lastNode = factory();
            }
            return lastNode?.[prop];
        }
    });
}

function shallowEqual(a, b) {
    if (a === b) return true;
    if (Array.isArray(a) && Array.isArray(b)) {
        if (a.length !== b.length) return false;
        return a.every((v, i) => v === b[i]);
    }
    return false;
}

// ─── lazyNode() — dynamic import / code splitting ────────────────────────────

/**
 * Lazily loads a component via dynamic import.
 * Shows a fallback node while loading, swaps it for the real node on resolve.
 *
 * @param {() => Promise<{ default: Function }>} importFn  - Dynamic import
 * @param {GhostNode} [fallback]  - Shown during load (optional)
 *
 * Usage:
 *   lazyNode(() => import('./HeavyPage.js'))
 */
export function lazyNode(importFn, fallback = null) {
    return { __ghostLazy: true, importFn, fallback };
}

function _mountLazy(descriptor, parentEl) {
    const { importFn, fallback } = descriptor;

    const anchor = document.createComment('[ghost-lazy]');
    parentEl.appendChild(anchor);

    // Show fallback immediately
    let current = null;
    if (fallback) {
        const tmp = document.createElement('ghost-lazy-slot');
        mount(fallback, tmp);
        while (tmp.firstChild) parentEl.insertBefore(tmp.firstChild, anchor);
        current = fallback;
    }

    importFn().then(mod => {
        const factory = mod.default || mod;
        if (current) { destroy(current); current = null; }
        const node = typeof factory === 'function' ? factory() : factory;
        const tmp  = document.createElement('ghost-lazy-slot');
        mount(node, tmp);
        while (tmp.firstChild) parentEl.insertBefore(tmp.firstChild, anchor);
        current = node;
    }).catch(err => {
        console.error('[Ghost] lazyNode failed to load:', err);
    });
}

// ─── Scheduler ───────────────────────────────────────────────────────────────

export function scheduleUpdate(fn) {
    if (typeof performance !== 'undefined' && performance.now() > frameDeadline) {
        requestAnimationFrame(() => {
            frameDeadline = performance.now() + YIELD_THRESHOLD;
            batch(fn);
        });
    } else {
        batch(fn);
    }
}
