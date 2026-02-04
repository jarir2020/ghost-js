import { asyncSignal } from '../packages/core/src/index.js';

export async function testAsync() {
    console.log('--- Testing Async Signals ---');

    let fetchCount = 0;
    const fetcher = () => {
        fetchCount++;
        return new Promise(resolve => setTimeout(() => resolve('data'), 50));
    };

    const user = asyncSignal(fetcher);

    if (user.loading !== true) throw new Error('Initial loading state failed');

    await new Promise(r => setTimeout(r, 100));

    if (user.loading !== false) throw new Error('Final loading state failed');
    if (user.data !== 'data') throw new Error('Data resolution failed');
    if (fetchCount !== 1) throw new Error(`Fetcher ran ${fetchCount} times instead of 1`);

    console.log('✅ Async tests passed!');
}
