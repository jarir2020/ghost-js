import { signal, effect, createNode, asyncSignal } from '../../core/src/index.js';

export function useState(initialValue) {
    const s = signal(initialValue);
    const getter = () => s.get();
    const setter = (newValue) => {
        if (typeof newValue === 'function') {
            s.set(newValue(s.get()));
        } else {
            s.set(newValue);
        }
    };
    return [getter, setter];
}

export function useEffect(fn) {
    return effect(fn);
}

export function useAsync(fetcher) {
    const s = asyncSignal(fetcher);
    return s;
}

export function useMemo(fn) {
    const s = signal();
    effect(() => {
        s.set(fn());
    });
    return () => s.get();
}

export function Component(renderFn) {
    return (props) => {
        // In Ghost, components are setup once
        return renderFn(props);
    };
}
