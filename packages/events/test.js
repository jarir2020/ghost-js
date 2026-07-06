import { testEvents } from '../../tests/events.test.js';

testEvents().catch((error) => {
    console.error('❌ Events tests failed:', error.message);
    process.exit(1);
});
