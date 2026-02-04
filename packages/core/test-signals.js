import { signal, effect, computed } from './src/signals.js';

console.log('--- Testing Signals ---');

const count = signal(0);
const double = computed(() => count.get() * 2);

let effectCount = 0;
effect(() => {
    effectCount++;
    console.log(`Count: ${count.get()}, Double: ${double.get()}`);
});

console.log('Setting count to 1...');
count.set(1);

console.log('Setting count to 5...');
count.set(5);

if (count.get() === 5 && double.get() === 10 && effectCount === 3) {
    console.log('✅ Signals test passed!');
} else {
    console.log('❌ Signals test failed!');
    console.log({ count: count.get(), double: double.get(), effectCount });
    process.exit(1);
}
