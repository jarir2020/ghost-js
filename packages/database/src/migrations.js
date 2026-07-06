import { createSchemaBuilder } from './schema.js';

function normalizeMigration(migration, index) {
    if (!migration) {
        return null;
    }

    if (typeof migration === 'function') {
        const resolved = migration();
        return normalizeMigration(resolved, index);
    }

    const name = migration.name || migration.id || `migration_${index + 1}`;
    return {
        name,
        up: typeof migration.up === 'function' ? migration.up : null,
        down: typeof migration.down === 'function' ? migration.down : null
    };
}

export function createMigrationPlan(migrations = []) {
    return migrations
        .map((migration, index) => normalizeMigration(migration, index))
        .filter(Boolean)
        .map((migration, index) => ({
            order: index + 1,
            ...migration
        }));
}

export function createMigrationRunner({ driver = null, dialect = 'sqlite', logger = null } = {}) {
    const schema = createSchemaBuilder(dialect);
    const ledger = [];

    const execute = async (statement) => {
        const payload = typeof statement?.toSQL === 'function' ? statement.toSQL() : statement;
        if (typeof logger === 'function') {
            logger(payload);
        }
        if (driver && typeof driver.execute === 'function') {
            return driver.execute(payload.sql, payload.params ?? [], { dialect });
        }
        return payload;
    };

    const record = (migration, direction) => {
        ledger.push({
            name: migration.name,
            direction,
            timestamp: new Date().toISOString()
        });
    };

    return {
        schema,
        plan(migrations = []) {
            return createMigrationPlan(migrations);
        },
        async ensureLedger() {
            return execute(schema.createTable('ghost_migrations', [
                { name: 'name', type: 'text', notNull: true },
                { name: 'direction', type: 'text', notNull: true },
                { name: 'applied_at', type: 'timestamp', notNull: true }
            ]));
        },
        async up(migrations = []) {
            const plan = createMigrationPlan(migrations);
            await this.ensureLedger();
            for (const migration of plan) {
                if (typeof migration.up === 'function') {
                    await migration.up(schema, execute);
                }
                record(migration, 'up');
            }
            return { applied: ledger.filter((entry) => entry.direction === 'up'), ledger: [...ledger] };
        },
        async down(migrations = []) {
            const plan = createMigrationPlan(migrations).reverse();
            for (const migration of plan) {
                if (typeof migration.down === 'function') {
                    await migration.down(schema, execute);
                }
                record(migration, 'down');
            }
            return { applied: ledger.filter((entry) => entry.direction === 'down'), ledger: [...ledger] };
        },
        ledger() {
            return [...ledger];
        }
    };
}
