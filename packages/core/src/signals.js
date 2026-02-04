let activeEffect = null;
const contextStack = [];
let pendingEffects = new Set();
let batchDepth = 0;

export function signal(initialValue) {
    let value = initialValue;
    const subscribers = new Set();

    return {
        get() {
            if (activeEffect) {
                subscribers.add(activeEffect);
                activeEffect.dependencies.add(subscribers);
            }
            return value;
        },
        set(newValue) {
            if (value === newValue) return;
            value = newValue;
            notify(subscribers);
        }
    };
}

function notify(subscribers) {
    batch(() => {
        subscribers.forEach(sub => {
            if (sub.notify) sub.notify();
            else pendingEffects.add(sub);
        });
    });
}

export function batch(fn) {
    batchDepth++;
    try {
        fn();
    } finally {
        batchDepth--;
        if (batchDepth === 0) {
            const effects = Array.from(pendingEffects);
            pendingEffects.clear();
            effects.forEach(effect => effect.run());
        }
    }
}

export function effect(fn) {
    const effectObj = {
        dependencies: new Set(),
        run() {
            cleanup(effectObj);
            contextStack.push(activeEffect);
            activeEffect = effectObj;
            try {
                fn();
            } finally {
                activeEffect = contextStack.pop();
            }
        },
        notify() {
            pendingEffects.add(effectObj);
        }
    };

    effectObj.run();
    return () => cleanup(effectObj);
}

export function computed(fn) {
    let value;
    let dirty = true;
    const subscribers = new Set();

    const compObj = {
        dependencies: new Set(),
        notify() {
            if (!dirty) {
                dirty = true;
                notify(subscribers);
            }
        }
    };

    return {
        get() {
            if (activeEffect) {
                subscribers.add(activeEffect);
                activeEffect.dependencies.add(subscribers);
            }
            if (dirty) {
                cleanup(compObj);
                contextStack.push(activeEffect);
                activeEffect = compObj;
                try {
                    value = fn();
                } finally {
                    activeEffect = contextStack.pop();
                }
                dirty = false;
            }
            return value;
        }
    };
}

function cleanup(owner) {
    for (const subs of owner.dependencies) {
        subs.delete(owner);
    }
    owner.dependencies.clear();
}
