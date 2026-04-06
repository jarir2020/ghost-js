// Ghost Compiler — updated 2026-04-06
// Replaced regex-based parser with a char-by-char tokenizer for robustness.

const T_TEXT = 'text';
const T_EXPR = 'expr';
const T_ATTR_BIND = 'attr_bind';
const T_TAG_OPEN = 'tag_open';
const T_TAG_CLOSE = 'tag_close';
const T_SELF_CLOSE = 'self_close';

/**
 * Tokenize a Ghost template string into a flat token list.
 *
 * Handles:
 *  - Static text
 *  - Reactive expressions: {{ expr }} (nested braces safe)
 *  - Bound attributes: :attr="expr" or g-bind:attr="expr"
 *  - HTML tags (basic open/close/self-close)
 */
export function tokenize(template) {
    const tokens = [];
    let i = 0;
    const len = template.length;

    while (i < len) {
        // {{ reactive expression }}
        if (template[i] === '{' && template[i + 1] === '{') {
            i += 2;
            let depth = 1;
            let expr = '';
            while (i < len && depth > 0) {
                if (template[i] === '{') depth++;
                else if (template[i] === '}') {
                    depth--;
                    if (depth === 0) { i++; break; }
                }
                expr += template[i++];
            }
            // consume closing }
            if (template[i] === '}') i++;
            tokens.push({ type: T_EXPR, value: expr.trim() });
            continue;
        }

        // HTML tag
        if (template[i] === '<') {
            i++;
            const isClose = template[i] === '/';
            if (isClose) i++;

            // Read tag name
            let name = '';
            while (i < len && /[\w:-]/.test(template[i])) name += template[i++];

            if (isClose) {
                // Skip to >
                while (i < len && template[i] !== '>') i++;
                i++; // skip >
                tokens.push({ type: T_TAG_CLOSE, name });
                continue;
            }

            // Parse attributes
            const attrs = {};
            const bindings = {}; // :attr or g-bind:attr

            while (i < len && template[i] !== '>' && !(template[i] === '/' && template[i + 1] === '>')) {
                // Skip whitespace
                while (i < len && /\s/.test(template[i])) i++;
                if (template[i] === '>' || (template[i] === '/' && template[i + 1] === '>')) break;

                // Read attribute name
                let attrName = '';
                while (i < len && template[i] !== '=' && !/\s/.test(template[i]) && template[i] !== '>' && template[i] !== '/') {
                    attrName += template[i++];
                }

                if (!attrName) { i++; continue; }

                let attrValue = true;
                if (template[i] === '=') {
                    i++; // skip =
                    const quote = template[i];
                    if (quote === '"' || quote === "'") {
                        i++; // skip opening quote
                        let val = '';
                        while (i < len && template[i] !== quote) val += template[i++];
                        i++; // skip closing quote
                        attrValue = val;
                    }
                }

                // Detect bound attribute: :attr or g-bind:attr
                if (attrName.startsWith(':')) {
                    bindings[attrName.slice(1)] = attrValue;
                } else if (attrName.startsWith('g-bind:')) {
                    bindings[attrName.slice(7)] = attrValue;
                } else {
                    attrs[attrName] = attrValue;
                }
            }

            const selfClose = template[i] === '/';
            if (selfClose) i++; // skip /
            if (template[i] === '>') i++; // skip >

            tokens.push({ type: selfClose ? T_SELF_CLOSE : T_TAG_OPEN, name, attrs, bindings });
            continue;
        }

        // Static text — collect until < or {{
        let text = '';
        while (i < len && !(template[i] === '<') && !(template[i] === '{' && template[i + 1] === '{')) {
            text += template[i++];
        }
        if (text.trim()) tokens.push({ type: T_TEXT, value: text });
    }

    return tokens;
}

/**
 * Generate Ghost node factory code from a token stream.
 * Returns a string containing a JS function body.
 */
function generateCode(tokens) {
    const children = tokens.map(tok => {
        if (tok.type === T_TEXT) return JSON.stringify(tok.value);
        if (tok.type === T_EXPR) return `() => (${tok.value})`;
        if (tok.type === T_TAG_OPEN || tok.type === T_SELF_CLOSE) {
            const attrsStr = JSON.stringify(tok.attrs || {});
            const bindingsStr = Object.entries(tok.bindings || {})
                .map(([k, v]) => `${JSON.stringify(k)}: () => ${v}`)
                .join(', ');
            const props = bindingsStr
                ? `{ ...${attrsStr}, ${bindingsStr} }`
                : attrsStr;
            return `createNode(${JSON.stringify(tok.name)}, ${props}, [])`;
        }
        return null;
    }).filter(Boolean);

    return `(state) => createNode('div', {}, [${children.join(', ')}])`;
}

/**
 * Main compile function: tokenize → generate → return code + source map stub.
 */
export function compile(template) {
    const tokens = tokenize(template);
    return {
        code: generateCode(tokens),
        tokens, // exposed for tooling/testing
        map: null
    };
}
