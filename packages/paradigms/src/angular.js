import { signal, effect, computed } from '../../core/src/index.js';

const registry = new Map();

/**
 * Basic Dependency Injection
 * Ghost doesn't use decorators. Services are classes registered in a global or scoped registry.
 */
export function Injectable(Class) {
    return () => {
        if (!registry.has(Class)) {
            registry.set(Class, new Class());
        }
        return registry.get(Class);
    };
}

/**
 * Reactive Form Paradigm
 */
export function Form(initialValues) {
    const fields = {};
    const errors = signal({});
    const isValid = computed(() => Object.keys(errors.get()).length === 0);

    for (const key in initialValues) {
        fields[key] = signal(initialValues[key]);
    }

    return {
        get value() {
            const val = {};
            for (const key in fields) val[key] = fields[key].get();
            return val;
        },
        fields,
        errors,
        isValid,
        setValue(key, val) {
            if (fields[key]) fields[key].set(val);
        },
        handleSubmit(callback) {
            return (e) => {
                e.preventDefault();
                callback(this.value);
            };
        }
    };
}
