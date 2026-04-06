// Ghost — Svelte Paradigm Adapter — 2026-04-06
// Maps Ghost signals to the Svelte store contract: writable, readable, derived.
import { signal, computed as coreComputed, effect } from '../../core/src/index.js';

/**
 * writable(value) — a Svelte-compatible readable/writable store.
 *
 * API: .subscribe(fn), .set(v), .update(fn), .get()
 */
export function writable(initialValue) {
    const s = signal(initialValue);
    const subscribers = new Set();

    // Keep Ghost effect in sync with external subscribers
    effect(() => {
        const val = s.get();
        subscribers.forEach(fn => fn(val));
    });

    return {
        subscribe(fn) {
            subscribers.add(fn);
            fn(s.get()); // immediately call with current value (Svelte contract)
            return () => subscribers.delete(fn); // unsubscribe function
        },
        set(value) { s.set(value); },
        update(fn) { s.set(fn(s.get())); },
        // Ghost extension: direct getter
        get() { return s.get(); }
    };
}

/**
 * readable(value, start?) — a read-only store.
 * start(set) is called when the first subscriber attaches;
 * its return value (a cleanup function) is called when the last subscriber detaches.
 */
export function readable(initialValue, start = null) {
    const s = signal(initialValue);
    const subscribers = new Set();
    let stopFn = null;

    effect(() => {
        const val = s.get();
        subscribers.forEach(fn => fn(val));
    });

    return {
        subscribe(fn) {
            if (subscribers.size === 0 && start) {
                stopFn = start(v => s.set(v)) || null;
            }
            subscribers.add(fn);
            fn(s.get());
            return () => {
                subscribers.delete(fn);
                if (subscribers.size === 0 && stopFn) {
                    stopFn();
                    stopFn = null;
                }
            };
        },
        get() { return s.get(); }
    };
}

/**
 * derived(stores, fn) — derives a new store from one or more stores.
 * Mirrors Svelte's derived() behaviour.
 *
 * @param {Store | Store[]} stores
 * @param {(values) => any} fn
 */
export function derived(stores, fn) {
    const storeArray = Array.isArray(stores) ? stores : [stores];
    const subscribers = new Set();

    // Use Ghost computed to track changes
    const c = coreComputed(() => {
        const values = storeArray.map(s => s.get ? s.get() : undefined);
        return Array.isArray(stores) ? fn(values) : fn(values[0]);
    });

    effect(() => {
        const val = c.get();
        subscribers.forEach(fn => fn(val));
    });

    return {
        subscribe(fn) {
            subscribers.add(fn);
            fn(c.get());
            return () => subscribers.delete(fn);
        },
        get() { return c.get(); }
    };
}
