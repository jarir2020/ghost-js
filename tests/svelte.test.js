// Tests for Svelte paradigm adapter — 2026-04-06
import { Svelte } from '../packages/paradigms/src/index.js';

export function testSvelte() {
    console.log('--- Testing Svelte Paradigm Adapter ---');

    // 1. writable — subscribe gets current value immediately
    const count = Svelte.writable(0);
    let received = null;
    const unsub = count.subscribe(v => { received = v; });
    if (received !== 0) throw new Error(`writable initial: expected 0, got ${received}`);

    count.set(5);
    if (received !== 5) throw new Error(`writable set: expected 5, got ${received}`);

    count.update(v => v + 1);
    if (received !== 6) throw new Error(`writable update: expected 6, got ${received}`);

    unsub(); // unsubscribe
    count.set(99);
    if (received !== 6) throw new Error('writable unsub: should not receive after unsub');

    // 2. writable .get() extension
    if (count.get() !== 99) throw new Error(`writable .get(): expected 99, got ${count.get()}`);

    // 3. readable — fires immediately, cleanup called when unsubscribed
    let cleanupCalled = false;
    const timer = Svelte.readable(0, (set) => {
        set(42);
        return () => { cleanupCalled = true; };
    });
    let timerVal = null;
    const unsubTimer = timer.subscribe(v => timerVal = v);
    if (timerVal !== 42) throw new Error(`readable start: expected 42, got ${timerVal}`);
    unsubTimer();
    if (!cleanupCalled) throw new Error('readable: cleanup function not called on unsubscribe');

    // 4. derived — recomputes when source changes
    const a = Svelte.writable(2);
    const b = Svelte.writable(3);
    const sum = Svelte.derived([a, b], ([va, vb]) => va + vb);
    let sumVal = null;
    sum.subscribe(v => sumVal = v);
    if (sumVal !== 5) throw new Error(`derived initial: expected 5, got ${sumVal}`);
    a.set(10);
    if (sumVal !== 13) throw new Error(`derived update: expected 13, got ${sumVal}`);

    console.log('✅ Svelte paradigm tests passed!');
}
