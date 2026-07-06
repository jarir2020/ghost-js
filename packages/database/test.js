import { testDatabaseOrm } from '../../tests/database-orm.test.js';

testDatabaseOrm().catch((error) => {
    console.error('❌ Database ORM tests failed:', error.message);
    process.exit(1);
});
