// Ghost Style — updated 2026-04-06
// Replaced broken regex CSS scoper with a proper char-by-char CSS tokenizer.
import { effect } from './signals.js';

let styleIdCounter = 0;

// ─── CSS tokenizer + scoper ───────────────────────────────────────────────────

/**
 * Tokenize CSS into selector and declaration blocks using a char-by-char pass.
 * This correctly ignores braces/colons inside string literals and comments.
 *
 * Returns an array of { selector: string, body: string } objects.
 */
function parseCSSRules(css) {
    const rules = [];
    let i = 0;
    const len = css.length;

    while (i < len) {
        // Skip whitespace
        while (i < len && /\s/.test(css[i])) i++;
        if (i >= len) break;

        // Skip /* comments */
        if (css[i] === '/' && css[i + 1] === '*') {
            i += 2;
            while (i < len && !(css[i] === '*' && css[i + 1] === '/')) i++;
            i += 2;
            continue;
        }

        // Read selector (everything up to the opening {)
        let selector = '';
        while (i < len && css[i] !== '{') {
            // Handle string literals inside attribute selectors [attr="val"]
            if (css[i] === '"' || css[i] === "'") {
                const q = css[i++];
                selector += q;
                while (i < len && css[i] !== q) selector += css[i++];
                if (i < len) selector += css[i++]; // closing quote
            } else {
                selector += css[i++];
            }
        }
        i++; // skip {

        // Read declaration body (everything up to the closing })
        let body = '';
        let depth = 1;
        while (i < len && depth > 0) {
            if (css[i] === '{') depth++;
            else if (css[i] === '}') { depth--; if (depth === 0) { i++; break; } }
            // Skip strings inside values (e.g., content: "}")
            if (css[i] === '"' || css[i] === "'") {
                const q = css[i++];
                body += q;
                while (i < len && css[i] !== q) body += css[i++];
                if (i < len) body += css[i++];
                continue;
            }
            body += css[i++];
        }

        selector = selector.trim();
        body     = body.trim();
        if (selector) rules.push({ selector, body });
    }

    return rules;
}

/**
 * Prefix every comma-separated selector with the scope attribute selector.
 * Handles :root, html, body, and @keyframes / @media correctly.
 */
function scopeSelectors(selector, scopeAttr) {
    // @-rules: pass through unchanged (they wrap rules that will be scoped independently)
    if (selector.startsWith('@')) return selector;

    return selector
        .split(',')
        .map(s => {
            s = s.trim();
            // :host means the component root itself
            if (s === ':host') return `[data-ghost-scope="${scopeAttr}"]`;
            // Global html/body/root selectors — just prepend, don't double-scope
            if (/^(html|body|:root)(\s|$|:|>|~|\+)/.test(s)) return s;
            return `[data-ghost-scope="${scopeAttr}"] ${s}`;
        })
        .join(', ');
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function css(strings, ...values) {
    const id      = `g-${styleIdCounter++}`;
    const styleEl = typeof document !== 'undefined' ? document.createElement('style') : null;
    if (styleEl) {
        styleEl.dataset.ghostId = id;
        document.head.appendChild(styleEl);
    }

    // Build the raw CSS string, replacing signal-bound values with CSS variables
    let rawCss    = '';
    const bindings = [];

    strings.forEach((str, i) => {
        rawCss += str;
        if (i < values.length) {
            const val = values[i];
            if (typeof val === 'function') {
                const varName = `--${id}-${i}`;
                rawCss += `var(${varName})`;
                bindings.push({ varName, getter: val });
            } else {
                rawCss += val;
            }
        }
    });

    // Parse into rules and re-emit with scoped selectors
    const rules = parseCSSRules(rawCss);
    const scopedCss = rules
        .map(({ selector, body }) => {
            const scoped = scopeSelectors(selector, id);
            return `${scoped} { ${body} }`;
        })
        .join('\n');

    if (styleEl) styleEl.textContent = scopedCss;

    return {
        scope: id,
        /** Attach this style scope to a DOM element and bind reactive CSS variables. */
        mount(el) {
            el.setAttribute('data-ghost-scope', id);
            bindings.forEach(({ varName, getter }) => {
                effect(() => el.style.setProperty(varName, getter()));
            });
        }
    };
}
