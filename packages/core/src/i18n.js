// Ghost i18n — 2026-04-06
// Built-in, signal-driven internationalization.
import { signal, computed } from './signals.js';

// ─── State ────────────────────────────────────────────────────────────────────

/** The active locale code, e.g. 'en', 'fr', 'ar'. Changing it re-renders all t() calls. */
export const locale = signal('en');

/** Internal store: locale code → translation dictionary */
const _dicts = new Map();
_dicts.set('en', {}); // default empty English dict

// ─── API ──────────────────────────────────────────────────────────────────────

/**
 * Load a translation dictionary for a locale.
 * Merges into any existing entries for that locale.
 *
 * @param {string} lang  — locale code, e.g. 'fr'
 * @param {Object} dict  — flat or nested key→string map
 *
 * Usage:
 *   loadLocale('fr', { hello: 'Bonjour', nav: { home: 'Accueil' } });
 */
export function loadLocale(lang, dict) {
    const existing = _dicts.get(lang) || {};
    _dicts.set(lang, { ...existing, ...flattenDict(dict) });
}

/**
 * Translate a key in the active locale.
 * Returns a reactive computed getter — use as a function child in Ghost nodes.
 *
 * @param {string} key    — dot-separated key, e.g. 'nav.home'
 * @param {Object} [vars] — interpolation variables: { name: 'Ghost' } for "Hello, {{name}}!"
 * @returns {() => string}  reactive getter
 *
 * Usage:
 *   createNode('p', {}, [t('greeting', { name: 'Ghost' })])
 *   // with dict: { greeting: 'Hello, {{name}}!' }
 */
export function t(key, vars = {}) {
    const c = computed(() => {
        const lang = locale.get();
        const dict = _dicts.get(lang) || _dicts.get('en') || {};
        let str = dict[key] ?? key; // fallback to key itself if not found
        // Interpolate {{var}} placeholders
        for (const [k, v] of Object.entries(vars)) {
            str = str.replaceAll(`{{${k}}}`, String(v));
        }
        return str;
    });
    return () => c.get();
}

/**
 * Translate a key with reactive variables (each var may be a signal getter).
 * Use when interpolated values are themselves reactive.
 *
 * @param {string} key
 * @param {Object} reactiveVars — { name: () => nameSignal.get() }
 */
export function tr(key, reactiveVars = {}) {
    const c = computed(() => {
        const lang = locale.get();
        const dict = _dicts.get(lang) || _dicts.get('en') || {};
        let str = dict[key] ?? key;
        for (const [k, getter] of Object.entries(reactiveVars)) {
            const val = typeof getter === 'function' ? getter() : getter;
            str = str.replaceAll(`{{${k}}}`, String(val));
        }
        return str;
    });
    return () => c.get();
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Flatten a nested dict: { nav: { home: 'Home' } } → { 'nav.home': 'Home' } */
function flattenDict(obj, prefix = '') {
    const result = {};
    for (const [key, val] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
            Object.assign(result, flattenDict(val, fullKey));
        } else {
            result[fullKey] = val;
        }
    }
    return result;
}
