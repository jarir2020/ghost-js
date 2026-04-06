// Tests for error boundaries in effects — 2026-04-06
import { signal, effect, onError } from '../packages/core/src/index.js';

export function testErrorBoundary() {
    console.log('--- Testing Error Boundaries ---');

    // 1. A throwing effect should NOT crash the process
    let caughtByGlobal = null;
    onError((err) => { caughtByGlobal = err; });

    let sideEffect = 0;
    const s = signal(0);

    // This effect throws on first run
    effect(() => {
        s.get(); // track dependency
        throw new Error('deliberate effect error');
    });

    if (!(caughtByGlobal instanceof Error)) {
        throw new Error('onError handler was not called for effect error');
    }
    if (!caughtByGlobal.message.includes('deliberate')) {
        throw new Error(`Wrong error captured: ${caughtByGlobal.message}`);
    }

    // 2. Other effects continue running after one throws
    caughtByGlobal = null;
    let otherRan = false;
    effect(() => {
        s.get();
        otherRan = true;
    });

    // Reset — trigger a signal update; the throwing effect should be silently caught,
    // the healthy effect should still execute.
    otherRan = false;
    caughtByGlobal = null;
    s.set(1);

    if (!otherRan) throw new Error('Healthy effect did not run after sibling threw');

    // 3. Reset global handler
    onError(null);

    console.log('✅ Error boundary tests passed!');
}
