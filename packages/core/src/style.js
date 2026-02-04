import { effect } from './signals.js';

let styleIdCounter = 0;

export function css(strings, ...values) {
    const id = `g-${styleIdCounter++}`;
    const styleEl = document.createElement('style');
    styleEl.dataset.ghostId = id;
    document.head.appendChild(styleEl);

    let baseCss = '';
    const bindings = [];

    strings.forEach((str, i) => {
        baseCss += str;
        if (i < values.length) {
            const val = values[i];
            if (typeof val === 'function') {
                const varName = `--${id}-${i}`;
                baseCss += `var(${varName})`;
                bindings.push({ varName, getter: val });
            } else {
                baseCss += val;
            }
        }
    });

    // Scoping (very basic: prefix all selectors with [data-ghost-id="id"])
    // In a real implementation, we'd use a CSS parser to scope correctly.
    const scopedCss = baseCss.replace(/([^\r\n,{}]+)(?=[^{]*\{)/g, (match) => {
        return match.split(',').map(s => `[data-ghost-scope="${id}"] ${s.trim()}`).join(', ');
    });

    styleEl.textContent = scopedCss;

    return {
        scope: id,
        mount(el) {
            el.setAttribute('data-ghost-scope', id);
            bindings.forEach(({ varName, getter }) => {
                effect(() => {
                    el.style.setProperty(varName, getter());
                });
            });
        }
    };
}
