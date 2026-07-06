import { createDatabase, createQueryBuilder, defineModel, belongsTo, hasMany, belongsToMany, morphTo, morphMany, createSchemaBuilder, listDialects, createMigrationRunner, createMigrationPlan, createApiResponse, createResourceEnvelope, createPaginatedResponse } from '../packages/database/src/index.js';

function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}

export function testDatabaseOrm() {
    console.log('--- Testing Database ORM ---');

    const dialects = listDialects();
    assert(dialects.includes('mysql') && dialects.includes('pgsql') && dialects.includes('sqlite'), 'missing supported dialects');

    const mysqlQuery = createQueryBuilder('users', 'mysql').select(['id', 'email']).where('active', true).limit(10).toSQL();
    assert(mysqlQuery.sql === 'SELECT `id`, `email` FROM `users` WHERE `active` = ? LIMIT 10', 'mysql select SQL mismatch');
    assert(mysqlQuery.params.length === 1 && mysqlQuery.params[0] === true, 'mysql params mismatch');

    const pgQuery = createQueryBuilder('users', 'pgsql').insert({ email: 'a@example.com', active: true }).toSQL();
    assert(pgQuery.sql === 'INSERT INTO "users" ("email", "active") VALUES ($1, $2)', 'pgsql insert SQL mismatch');

    const sqliteSchema = createSchemaBuilder('sqlite').createTable('users', [
        { name: 'id', type: 'integer', primary: true },
        { name: 'email', type: 'text', notNull: true }
    ]);
    assert(sqliteSchema.sql.includes('CREATE TABLE'), 'schema builder did not create table SQL');

    const resourceEnvelope = createResourceEnvelope({ id: 7, name: 'Invoice' }, { resource: 'invoices', baseUrl: '/api' });
    assert(resourceEnvelope.links.self === '/api/invoices/7', 'resource envelope did not build the self link');

    const apiResponse = createApiResponse(resourceEnvelope, { status: 200, message: 'OK' });
    assert(apiResponse.ok === true && apiResponse.status === 200, 'API response helper did not build a successful response');

    const paginated = createPaginatedResponse([{ id: 1 }], { page: 2, perPage: 10, total: 18 });
    assert(paginated.meta.totalPages === 2, 'paginated response helper did not compute total pages');

    const User = defineModel({
        name: 'User',
        table: 'users',
        fillable: ['email', 'name'],
        relations: {
            profile: hasMany('Profile', 'user_id'),
            company: belongsTo('Company', 'company_id'),
            roles: belongsToMany('Role', 'role_user', 'user_id', 'role_id'),
            imageable: morphTo('imageable_type', 'imageable_id'),
            photos: morphMany('Photo', 'imageable_type', 'imageable_id')
        }
    });
    const user = new User({ id: 1, email: 'test@example.com', name: 'Test' });
    assert(user.toJSON().email === 'test@example.com', 'model JSON serialization failed');
    assert(User.relation('profile').type === 'hasMany', 'model relation metadata missing');

    const executed = [];
    const db = createDatabase({
        dialect: 'mysql',
        driver: {
            execute(sql, params) {
                executed.push({ sql, params });
                return { ok: true, sql, params };
            }
        }
    });

    return db.query(db.table('users').select(['id']).where('id', 1)).then(() => {
        assert(executed.length === 1, 'database driver did not receive executed SQL');
        assert(executed[0].sql.includes('SELECT `id` FROM `users` WHERE `id` = ?'), 'database query SQL mismatch');
        assert(User.relation('roles').type === 'belongsToMany', 'belongsToMany relation metadata missing');
        assert(User.relation('imageable').type === 'morphTo', 'morphTo relation metadata missing');
        assert(User.relation('photos').type === 'morphMany', 'morphMany relation metadata missing');

        const plan = createMigrationPlan([
            {
                name: 'create_users_table',
                async up(schema, execute) {
                    await execute(schema.createTable('users', [
                        { name: 'id', type: 'integer', primary: true },
                        { name: 'email', type: 'text', notNull: true }
                    ]));
                },
                async down(schema, execute) {
                    await execute(schema.dropTable('users'));
                }
            }
        ]);
        assert(plan.length === 1 && plan[0].name === 'create_users_table', 'migration plan did not normalize migrations');

        const migrationSql = [];
        const runner = createMigrationRunner({
            dialect: 'sqlite',
            driver: {
                execute(sql, params) {
                    migrationSql.push({ sql, params });
                    return { ok: true, sql, params };
                }
            }
        });

        return runner.up([
            {
                name: 'create_users_table',
                async up(schema, execute) {
                    await execute(schema.createTable('users', [
                        { name: 'id', type: 'integer', primary: true },
                        { name: 'email', type: 'text', notNull: true }
                    ]));
                },
                async down(schema, execute) {
                    await execute(schema.dropTable('users'));
                }
            }
        ]).then(() => {
            assert(migrationSql.some((entry) => entry.sql.includes('ghost_migrations')), 'migration runner did not ensure the ledger table');
            assert(migrationSql.some((entry) => entry.sql.includes('CREATE TABLE')), 'migration runner did not execute the migration up SQL');

            return runner.down([
                {
                    name: 'create_users_table',
                    async up(schema, execute) {
                        await execute(schema.createTable('users', [
                            { name: 'id', type: 'integer', primary: true },
                            { name: 'email', type: 'text', notNull: true }
                        ]));
                    },
                    async down(schema, execute) {
                        await execute(schema.dropTable('users'));
                    }
                }
            ]);
        }).then(() => {
            assert(migrationSql.some((entry) => entry.sql.includes('DROP TABLE IF EXISTS') && entry.sql.includes('users')), 'migration runner did not execute the migration down SQL');
            console.log('✅ Database ORM tests passed!');
        });
    });
}
