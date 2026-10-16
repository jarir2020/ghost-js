// Ghost SSR — updated 2026-04-06
// Fixed: function children/props now called to get their value (signal-aware rendering)
// Added: renderToStream() for Node.js streaming SSR

/**
 * Recursively render a Ghost node tree to an HTML string.
 * Handles: string/number primitives, function getters (signals), arrays, node objects.
 */
export function renderToString(node) {
    if (node == null) return '';
    if (typeof node === 'string' || typeof node === 'number') return String(node);
    // Function child = reactive getter — call it to get the current value
    if (typeof node === 'function') return renderToString(node());
    if (Array.isArray(node)) return node.map(renderToString).join('');

    // Ghost list / when descriptors — render their current state
    if (node.__ghostWhen) {
        const show   = node.conditionGetter();
        const branch = show ? node.trueFn : node.falseFn;
        return branch ? renderToString(branch()) : '';
    }
    if (node.__ghostList) {
        const items = node.getItems();
        return items.map((item, i) => renderToString(node.renderFn(item, i))).join('');
    }
    if (node.__ghostLazy) return ''; // lazy nodes render empty on server (hydrated on client)

    // Plain node object
    const tag      = node.tag;
    const props    = node.props    || {};
    const children = node.children;

    if (!tag) return '';

    const propsStr = Object.entries(props)
        .map(([key, value]) => {
            if (key === 'ghostStyle') return '';
            if (key.startsWith('on')) return ''; // strip event handlers
            // Reactive prop — resolve to current value
            const resolved = typeof value === 'function' ? value() : value;
            if (resolved == null || resolved === false) return '';
            if (resolved === true) return ` ${key}`;
            return ` ${key}="${String(resolved).replace(/"/g, '&quot;')}"`;
        })
        .join('');

    const resolvedChildren = typeof children === 'function' ? children() : children;
    const childrenStr = renderToString(resolvedChildren);

    // Void elements need no closing tag
    const voidTags = new Set(['area','base','br','col','embed','hr','img','input',
                              'link','meta','param','source','track','wbr']);
    if (voidTags.has(tag)) return `<${tag}${propsStr}>`;

    return `<${tag}${propsStr}>${childrenStr}</${tag}>`;
}

/**
 * Streaming SSR — returns an async generator yielding HTML chunks.
 * Suitable for Node.js `stream.Readable.from(renderToStream(node))`.
 *
 * Usage (Node.js):
 *   const { Readable } = await import('stream');
 *   const stream = Readable.from(renderToStream(App));
 *   stream.pipe(res);
 */
export async function* renderToStream(node) {
    if (node == null) return;
    if (typeof node === 'string' || typeof node === 'number') { yield String(node); return; }
    if (typeof node === 'function') { yield* renderToStream(node()); return; }
    if (Array.isArray(node)) { for (const child of node) yield* renderToStream(child); return; }

    if (node.__ghostWhen) {
        const show   = node.conditionGetter();
        const branch = show ? node.trueFn : node.falseFn;
        if (branch) yield* renderToStream(branch());
        return;
    }
    if (node.__ghostList) {
        const items = node.getItems();
        for (let i = 0; i < items.length; i++) yield* renderToStream(node.renderFn(items[i], i));
        return;
    }
    if (node.__ghostLazy) return;

    const tag      = node.tag;
    const props    = node.props    || {};
    const children = node.children;

    if (!tag) return;

    const propsStr = Object.entries(props)
        .map(([key, value]) => {
            if (key === 'ghostStyle' || key.startsWith('on')) return '';
            const resolved = typeof value === 'function' ? value() : value;
            if (resolved == null || resolved === false) return '';
            if (resolved === true) return ` ${key}`;
            return ` ${key}="${String(resolved).replace(/"/g, '&quot;')}"`;
        })
        .join('');

    yield `<${tag}${propsStr}>`;
    const resolvedChildren = typeof children === 'function' ? children() : children;
    yield* renderToStream(resolvedChildren);
    yield `</${tag}>`;
}
