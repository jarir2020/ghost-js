import { signal, computed as coreComputed, effect, asyncSignal } from '../../core/src/index.js';

export function reactive(obj) {
    const wrapped = {};
    for (const key in obj) {
        const s = signal(obj[key]);
        Object.defineProperty(wrapped, key, {
            get: () => s.get(),
            set: (v) => s.set(v),
            enumerable: true,
            configurable: true
        });
    }
    return wrapped;
}

export function computed(fn) {
    const c = coreComputed(fn);
    return {
        get value() { return c.get(); }
    };
}

export function asyncState(fetcher) {
    return asyncSignal(fetcher);
}

export { effect };
