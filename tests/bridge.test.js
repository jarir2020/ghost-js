import { persistSignal } from '../packages/core/src/index.js';

export function testBridge() {
    console.log('--- Testing Bridge Pillar (Persistence) ---');

    // Mock localStorage
    global.localStorage = {
        store: {},
        getItem(key) { return this.store[key] || null; },
        setItem(key, val) { this.store[key] = val; }
    };

    const s = persistSignal('ghost-test', 10);
    if (s.get() !== 10) throw new Error('Bridge initial value failed');

    s.set(20);
    if (localStorage.getItem('ghost-test') !== '20') {
        throw new Error('Bridge persistence failed');
    }

    // Test loading from existing
    const s2 = persistSignal('ghost-test', 0);
    if (s2.get() !== 20) throw new Error('Bridge load failed');

    console.log('✅ Bridge tests passed!');
}
