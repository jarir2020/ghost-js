import { signal, effect, computed, batch } from '../packages/core/src/index.js';

export function testSignals() {
    console.log('--- Testing Signals ---');

    // 1. Basic Signal
    const count = signal(0);
    if (count.get() !== 0) throw new Error('Signal initial value failed');

    count.set(1);
    if (count.get() !== 1) throw new Error('Signal set failed');

    // 2. Computed
    const double = computed(() => count.get() * 2);
    if (double.get() !== 2) throw new Error('Computed initial value failed');

    count.set(5);
    if (double.get() !== 10) throw new Error('Computed update failed');

    // 3. Effect & Batching
    let effectCount = 0;
    effect(() => {
        effectCount++;
        count.get();
        double.get();
    });

    batch(() => {
        count.set(10);
        count.set(20);
    });

    // Effect should run once for the batch, plus initial run
    if (effectCount !== 2) throw new Error(`Batching failed: effect ran ${effectCount} times`);

    console.log('✅ Signals tests passed!');
}
