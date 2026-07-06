import { quoteIdentifier, resolveDialect } from './dialects.js';

function compileColumn(column, dialect) {
    const parts = [quoteIdentifier(column.name, dialect), column.type || 'text'];
    if (column.primary) {
        parts.push('PRIMARY KEY');
    }
    if (column.notNull || column.required) {
        parts.push('NOT NULL');
    }
    if (Object.prototype.hasOwnProperty.call(column, 'default')) {
        const defaultValue = typeof column.default === 'string' ? `'${column.default}'` : column.default;
        parts.push(`DEFAULT ${defaultValue}`);
    }
    return parts.join(' ');
}

function compileColumnList(columns = [], dialect) {
    return columns.map((column) => compileColumn(column, dialect)).join(', ');
}

export function createSchemaBuilder(dialect = 'sqlite') {
    const resolvedDialect = resolveDialect(dialect).name;

    return {
        createTable(name, columns = []) {
            return {
                sql: `CREATE TABLE ${quoteIdentifier(name, resolvedDialect)} (${compileColumnList(columns, resolvedDialect)})`,
                params: []
            };
        },
        dropTable(name) {
            return {
                sql: `DROP TABLE IF EXISTS ${quoteIdentifier(name, resolvedDialect)}`,
                params: []
            };
        },
        addColumn(table, column) {
            return {
                sql: `ALTER TABLE ${quoteIdentifier(table, resolvedDialect)} ADD COLUMN ${compileColumn(column, resolvedDialect)}`,
                params: []
            };
        },
        removeColumn(table, columnName) {
            return {
                sql: `ALTER TABLE ${quoteIdentifier(table, resolvedDialect)} DROP COLUMN ${quoteIdentifier(columnName, resolvedDialect)}`,
                params: []
            };
        },
        renameTable(from, to) {
            return {
                sql: `ALTER TABLE ${quoteIdentifier(from, resolvedDialect)} RENAME TO ${quoteIdentifier(to, resolvedDialect)}`,
                params: []
            };
        },
        addIndex(table, columns = [], name = null) {
            const indexName = name || `${table}_${columns.join('_')}_index`;
            return {
                sql: `CREATE INDEX ${quoteIdentifier(indexName, resolvedDialect)} ON ${quoteIdentifier(table, resolvedDialect)} (${columns.map((column) => quoteIdentifier(column, resolvedDialect)).join(', ')})`,
                params: []
            };
        },
        dropIndex(name) {
            return {
                sql: `DROP INDEX ${quoteIdentifier(name, resolvedDialect)}`,
                params: []
            };
        },
        addForeignKey(table, column, referencesTable, referencesColumn = 'id', constraintName = null) {
            const keyName = constraintName || `${table}_${column}_foreign`;
            return {
                sql: `ALTER TABLE ${quoteIdentifier(table, resolvedDialect)} ADD CONSTRAINT ${quoteIdentifier(keyName, resolvedDialect)} FOREIGN KEY (${quoteIdentifier(column, resolvedDialect)}) REFERENCES ${quoteIdentifier(referencesTable, resolvedDialect)} (${quoteIdentifier(referencesColumn, resolvedDialect)})`,
                params: []
            };
        },
        dropForeignKey(table, constraintName) {
            return {
                sql: `ALTER TABLE ${quoteIdentifier(table, resolvedDialect)} DROP CONSTRAINT ${quoteIdentifier(constraintName, resolvedDialect)}`,
                params: []
            };
        }
    };
}
