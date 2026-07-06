const DIALECTS = {
    mysql: {
        name: 'mysql',
        placeholder: () => '?',
        quoteIdentifier: (value) => `\`${String(value).replace(/`/g, '``')}\``
    },
    pgsql: {
        name: 'pgsql',
        placeholder: (index) => `$${index + 1}`,
        quoteIdentifier: (value) => `"${String(value).replace(/"/g, '""')}"`
    },
    sqlite: {
        name: 'sqlite',
        placeholder: () => '?',
        quoteIdentifier: (value) => `\`${String(value).replace(/`/g, '``')}\``
    }
};

export function resolveDialect(name = 'sqlite') {
    const key = String(name || 'sqlite').toLowerCase();
    return DIALECTS[key] ?? DIALECTS.sqlite;
}

export function quoteIdentifier(value, dialect = 'sqlite') {
    return resolveDialect(dialect).quoteIdentifier(value);
}

export function placeholderFor(index, dialect = 'sqlite') {
    return resolveDialect(dialect).placeholder(index);
}

export function listDialects() {
    return Object.keys(DIALECTS);
}
