export function renderToString(node) {
    if (typeof node === 'string') return node;
    if (typeof node === 'function') return renderToString(node());
    if (Array.isArray(node)) return node.map(renderToString).join('');

    const props = Object.entries(node.props || {})
        .map(([key, value]) => {
            if (typeof value === 'function') value = value();
            if (key.startsWith('on')) return ''; // Strip event handlers for SSR
            return ` ${key}="${value}"`;
        })
        .join('');

    const children = (node.children || [])
        .map(renderToString)
        .join('');

    return `<${node.tag}${props}>${children}</${node.tag}>`;
}
