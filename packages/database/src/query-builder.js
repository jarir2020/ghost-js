import { placeholderFor, quoteIdentifier, resolveDialect } from './dialects.js';
import { createSchemaBuilder } from './schema.js';

function normalizeColumns(columns = ['*']) {
    if (!Array.isArray(columns) || columns.length === 0) {
        return ['*'];
    }
    return columns;
}

function buildWhereClause(clauses, dialect) {
    if (clauses.length === 0) {
        return { sql: '', params: [] };
    }

    const params = [];
    const sql = clauses.map((clause) => {
        params.push(clause.value);
        return `${quoteIdentifier(clause.column, dialect)} ${clause.operator} ${placeholderFor(params.length - 1, dialect)}`;
    }).join(' AND ');

    return { sql: ` WHERE ${sql}`, params };
}

export class QueryBuilder {
    constructor(table, dialect = 'sqlite') {
        this.table = table;
        this.dialect = resolveDialect(dialect).name;
        this._mode = 'select';
        this._columns = ['*'];
        this._where = [];
        this._orderBy = [];
        this._limit = null;
        this._offset = null;
        this._payload = null;
    }

    select(columns = ['*']) {
        this._mode = 'select';
        this._columns = normalizeColumns(columns);
        return this;
    }

    insert(values = {}) {
        this._mode = 'insert';
        this._payload = values;
        return this;
    }

    update(values = {}) {
        this._mode = 'update';
        this._payload = values;
        return this;
    }

    delete() {
        this._mode = 'delete';
        return this;
    }

    where(column, operator, value) {
        if (arguments.length === 2) {
            value = operator;
            operator = '=';
        }

        this._where.push({ column, operator, value });
        return this;
    }

    orderBy(column, direction = 'asc') {
        this._orderBy.push({ column, direction: String(direction).toUpperCase() === 'DESC' ? 'DESC' : 'ASC' });
        return this;
    }

    limit(value) {
        this._limit = Number(value);
        return this;
    }

    offset(value) {
        this._offset = Number(value);
        return this;
    }

    toSQL() {
        const dialect = this.dialect;
        const table = quoteIdentifier(this.table, dialect);

        if (this._mode === 'insert') {
            const entries = Object.entries(this._payload ?? {});
            const columns = entries.map(([key]) => quoteIdentifier(key, dialect));
            const params = entries.map(([, value]) => value);
            const placeholders = params.map((_, index) => placeholderFor(index, dialect));
            return {
                sql: `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`,
                params
            };
        }

        if (this._mode === 'update') {
            const entries = Object.entries(this._payload ?? {});
            const setSql = entries.map(([key], index) => `${quoteIdentifier(key, dialect)} = ${placeholderFor(index, dialect)}`).join(', ');
            const params = entries.map(([, value]) => value);
            const where = buildWhereClause(this._where, dialect);
            return {
                sql: `UPDATE ${table} SET ${setSql}${where.sql}`,
                params: [...params, ...where.params]
            };
        }

        if (this._mode === 'delete') {
            const where = buildWhereClause(this._where, dialect);
            return {
                sql: `DELETE FROM ${table}${where.sql}`,
                params: where.params
            };
        }

        const columns = normalizeColumns(this._columns)
            .map((column) => column === '*' ? '*' : quoteIdentifier(column, dialect))
            .join(', ');
        const where = buildWhereClause(this._where, dialect);
        const orderBy = this._orderBy.length
            ? ` ORDER BY ${this._orderBy.map((order) => `${quoteIdentifier(order.column, dialect)} ${order.direction}`).join(', ')}`
            : '';
        const limit = Number.isFinite(this._limit) ? ` LIMIT ${this._limit}` : '';
        const offset = Number.isFinite(this._offset) ? ` OFFSET ${this._offset}` : '';

        return {
            sql: `SELECT ${columns} FROM ${table}${where.sql}${orderBy}${limit}${offset}`,
            params: where.params
        };
    }
}

export function createQueryBuilder(table, dialect = 'sqlite') {
    return new QueryBuilder(table, dialect);
}

export function createDatabase({ dialect = 'sqlite', driver = null, logger = null } = {}) {
    const resolvedDialect = resolveDialect(dialect);
    const buildApi = (sessionDriver = driver) => ({
        dialect: resolvedDialect.name,
        table: (name) => createQueryBuilder(name, resolvedDialect.name),
        query: async (statement) => {
            const payload = typeof statement?.toSQL === 'function' ? statement.toSQL() : statement;
            if (typeof logger === 'function') {
                logger(payload);
            }
            if (sessionDriver && typeof sessionDriver.execute === 'function') {
                return sessionDriver.execute(payload.sql, payload.params, { dialect: resolvedDialect.name });
            }
            return payload;
        },
        raw: async (sql, params = []) => {
            const payload = { sql, params };
            if (typeof logger === 'function') {
                logger(payload);
            }
            if (sessionDriver && typeof sessionDriver.execute === 'function') {
                return sessionDriver.execute(sql, params, { dialect: resolvedDialect.name });
            }
            return payload;
        },
        schema: createSchemaBuilder(resolvedDialect.name)
    });

    const baseApi = buildApi(driver);

    return {
        ...baseApi,
        transaction: async (callback) => {
            if (driver && typeof driver.transaction === 'function') {
                return driver.transaction((session) => callback(buildApi(session)));
            }

            return callback(baseApi);
        }
    };
}
