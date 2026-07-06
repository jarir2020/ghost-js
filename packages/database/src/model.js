import { createQueryBuilder } from './query-builder.js';

export function belongsTo(model, foreignKey, ownerKey = 'id') {
    return { type: 'belongsTo', model, foreignKey, ownerKey };
}

export function hasMany(model, foreignKey, localKey = 'id') {
    return { type: 'hasMany', model, foreignKey, localKey };
}

export function hasOne(model, foreignKey, localKey = 'id') {
    return { type: 'hasOne', model, foreignKey, localKey };
}

export function belongsToMany(model, pivotTable, foreignKey, relatedKey, localKey = 'id', relatedPrimaryKey = 'id') {
    return { type: 'belongsToMany', model, pivotTable, foreignKey, relatedKey, localKey, relatedPrimaryKey };
}

export function morphTo(typeField = 'type', idField = 'id') {
    return { type: 'morphTo', typeField, idField };
}

export function morphMany(model, typeField, idField, localKey = 'id') {
    return { type: 'morphMany', model, typeField, idField, localKey };
}

export function defineModel(config = {}) {
    const {
        name = 'Model',
        table = String(name).toLowerCase(),
        fillable = [],
        casts = {},
        relations = {},
        scopes = {}
    } = config;

    class GhostModel {
        constructor(attributes = {}) {
            this.attributes = { ...attributes };
        }

        static get modelName() {
            return name;
        }

        static get table() {
            return table;
        }

        static get fillable() {
            return fillable;
        }

        static get casts() {
            return casts;
        }

        static get relations() {
            return relations;
        }

        static get scopes() {
            return scopes;
        }

        static query(database) {
            if (!database || typeof database.table !== 'function') {
                return createQueryBuilder(table);
            }
            return database.table(table);
        }

        static fromRecord(record = {}) {
            return new GhostModel(record);
        }

        static scope(scopeName, builder) {
            const scope = scopes[scopeName];
            if (typeof scope === 'function') {
                return scope(builder);
            }
            return builder;
        }

        static relation(name) {
            return relations[name] ?? null;
        }

        static relationsFor(type) {
            return Object.fromEntries(Object.entries(relations).filter(([, relation]) => relation?.type === type));
        }

        fill(attributes = {}) {
            for (const key of fillable) {
                if (Object.prototype.hasOwnProperty.call(attributes, key)) {
                    this.attributes[key] = attributes[key];
                }
            }
            return this;
        }

        toJSON() {
            return { ...this.attributes };
        }
    }

    return GhostModel;
}
