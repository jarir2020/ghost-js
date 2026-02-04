import { asyncSignal } from './src/async.js';
import { effect } from './src/signals.js';

console.log('--- Testing Async Signals ---');

const mockFetch = () => new Promise(resolve => {
    setTimeout(() => resolve('Ghost Data Loaded!'), 100);
});

const user = asyncSignal(mockFetch);

let updates = 0;
effect(() => {
    updates++;
    console.log(`Update ${updates}: Loading=${user.loading}, Data=${user.data}, Error=${user.error}`);
});

// Wait for the async operation to complete
setTimeout(() => {
    if (user.data === 'Ghost Data Loaded!' && user.loading === false && updates === 2) {
        console.log('✅ Async Signals test passed!');
        process.exit(0);
    } else {
        console.log('❌ Async Signals test failed!');
        console.log({ data: user.data, loading: user.loading, updates });
        process.exit(1);
    }
}, 300);
