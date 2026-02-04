import { signal, effect } from './signals.js';

/**
 * Ghost Bridge: Persistence Pillar
 * Synchronizes local storage with reactive signals.
 */
export function persistSignal(key, initialValue) {
    // 1. Try to load existing value
    let stored;
    try {
        const item = localStorage.getItem(key);
        stored = item ? JSON.parse(item) : initialValue;
    } catch (e) {
        stored = initialValue;
    }

    const s = signal(stored);

    // 2. Automatically sync to localStorage when changed
    effect(() => {
        try {
            localStorage.setItem(key, JSON.stringify(s.get()));
        } catch (e) {
            console.warn(`Ghost-Bridge: Failed to persist key "${key}"`, e);
        }
    });

    return s;
}
