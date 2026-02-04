export function compile(template) {
    // A very simple regex-based compiler for now
    // In a full implementation, we'd use a proper HTML parser

    // 1. Identify reactive expressions in text: {{ expr }}
    const textParts = template.split(/\{\{(.*?)\}\}/);

    // 2. Identify reactive attributes: g-bind:attr="expr" or :attr="expr"
    // For now, let's just focus on the core structure

    return {
        code: generateCode(textParts),
        map: null // Original source map
    };
}

function generateCode(parts) {
    // Generate a function that returns a Ghost node
    // Example: (state) => createNode('div', {}, [() => state.count])

    let childrenCode = parts.map((part, i) => {
        if (i % 2 === 1) {
            // It's a reactive expression
            return `() => ${part.trim()}`;
        }
        return `"${part.replace(/"/g, '\\"')}"`;
    }).join(', ');

    return `(state) => createNode('div', {}, [${childrenCode}])`;
}
