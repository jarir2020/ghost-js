// Ghost — Angular Paradigm Adapter — updated 2026-04-06
// Replaced Map-based skeleton with hierarchical DI containers + typed tokens.
import { signal, computed } from '../../core/src/index.js';

// ─── DI Container ─────────────────────────────────────────────────────────────

/**
 * createContainer(parent?) — creates a DI scope, optionally inheriting from a parent.
 *
 * Usage:
 *   const root = createContainer();
 *   root.provide(AuthService, new AuthService());
 *   const child = createContainer(root);
 *   child.inject(AuthService); // resolves from parent if not in child
 */
export function createContainer(parent = null) {
    const _registry = new Map();

    return {
        /**
         * Register a value for a token.
         * @param {any} token  — class, Symbol, or plain object used as key
         * @param {any} value  — the instance or value to inject
         */
        provide(token, value) {
            _registry.set(token, value);
            return this;
        },

        /**
         * Resolve a token. Climbs the parent chain if not found locally.
         * Auto-instantiates class tokens if not yet registered (singleton behaviour).
         */
        inject(token) {
            if (_registry.has(token)) return _registry.get(token);
            if (parent) return parent.inject(token);

            // Auto-instantiate class tokens at root scope
            if (typeof token === 'function') {
                const instance = new token();
                _registry.set(token, instance);
                return instance;
            }

            throw new Error(`[Ghost DI] No provider found for token: ${String(token)}`);
        },

        /** Create a child container that inherits from this one. */
        child() { return createContainer(this); }
    };
}

// ─── Global root container (backward-compatible Injectable) ──────────────────

const _root = createContainer();

/**
 * Injectable(Class) — singleton factory using the root DI container.
 * Backward-compatible with v0.1 usage.
 *
 * Usage:
 *   class MyService { value = 'hello'; }
 *   const getService = Injectable(MyService);
 *   getService() === getService() // true — same instance
 */
export function Injectable(Class) {
    return () => _root.inject(Class);
}

// ─── Reactive Form ────────────────────────────────────────────────────────────

/**
 * Form(initialValues, validators?) — reactive form model.
 *
 * validators: { fieldName: (value) => errorString | null }
 */
export function Form(initialValues, validators = {}) {
    const fields = {};
    const errors = signal({});

    for (const key in initialValues) {
        fields[key] = signal(initialValues[key]);
    }

    function validate() {
        const errs = {};
        for (const key in validators) {
            const err = validators[key](fields[key]?.get());
            if (err) errs[key] = err;
        }
        errors.set(errs);
        return Object.keys(errs).length === 0;
    }

    const isValid = computed(() => Object.keys(errors.get()).length === 0);

    // Run initial validation if validators are provided
    if (Object.keys(validators).length > 0) validate();

    return {
        get value() {
            const val = {};
            for (const key in fields) val[key] = fields[key].get();
            return val;
        },
        fields,
        errors,
        get isValid() { return isValid.get(); },

        setValue(key, val) {
            if (fields[key]) {
                fields[key].set(val);
                validate();
            }
        },

        validate,

        handleSubmit(callback) {
            return (e) => {
                e?.preventDefault?.();
                if (validate()) callback(this.value);
            };
        },

        reset() {
            for (const key in initialValues) {
                fields[key]?.set(initialValues[key]);
            }
            errors.set({});
        }
    };
}
