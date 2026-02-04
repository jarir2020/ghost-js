import { testSignals } from './signals.test.js';
import { testAsync } from './async.test.js';
import { testSSR } from './ssr.test.js';
import { testParadigms } from './paradigms.test.js';
import { testRouter } from './router.test.js';
import { testHydration } from './hydration.test.js';
import { testCLI } from './cli.test.js';
import { testHTTP } from './http.test.js';
import { testBridge } from './bridge.test.js';
import { testMediator } from './mediator.test.js';

async function runAll() {
    try {
        testSignals();
        await testAsync();
        testSSR();
        testParadigms();
        testRouter();
        testHydration();
        testCLI();
        await testHTTP();
        testBridge();
        testMediator();
        console.log('\n🌟 ALL GHOST.JS TESTS PASSED! 🌟');
    } catch (e) {
        console.error('\n❌ TEST SUITE FAILED:', e.message);
        process.exit(1);
    }
}

runAll();
