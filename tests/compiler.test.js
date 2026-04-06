// Tests for the char-by-char tokenizer compiler — 2026-04-06
import { compile, tokenize } from '../packages/compiler/src/compiler.js';

export function testCompiler() {
    console.log('--- Testing Compiler: Tokenizer ---');

    // 1. Static text
    let tokens = tokenize('Hello World');
    if (tokens.length !== 1 || tokens[0].type !== 'text') {
        throw new Error(`Static text: expected 1 text token, got ${JSON.stringify(tokens)}`);
    }

    // 2. Simple reactive expression
    tokens = tokenize('Count: {{ count }}');
    if (tokens.length !== 2) throw new Error(`Expr: expected 2 tokens, got ${tokens.length}`);
    if (tokens[1].type !== 'expr') throw new Error(`Expr: second token should be expr`);
    if (tokens[1].value !== 'count') throw new Error(`Expr: value should be 'count', got '${tokens[1].value}'`);

    // 3. Nested braces (the key bug fix vs. old regex)
    tokens = tokenize('{{ obj.fn({ key: 1 }) }}');
    if (tokens.length !== 1 || tokens[0].type !== 'expr') {
        throw new Error(`Nested braces: expected 1 expr token, got ${JSON.stringify(tokens)}`);
    }
    if (!tokens[0].value.includes('obj.fn(')) {
        throw new Error(`Nested braces: expr value wrong: '${tokens[0].value}'`);
    }

    // 4. Tag with static attribute
    tokens = tokenize('<div id="main"></div>');
    const openTag = tokens.find(t => t.type === 'tag_open');
    if (!openTag) throw new Error('Tag: no tag_open token found');
    if (openTag.name !== 'div') throw new Error(`Tag name: expected 'div', got '${openTag.name}'`);
    if (openTag.attrs.id !== 'main') throw new Error(`Tag attr: expected id='main', got ${openTag.attrs.id}`);

    // 5. Bound attribute :class
    tokens = tokenize('<p :class="activeClass"></p>');
    const pTag = tokens.find(t => t.type === 'tag_open' && t.name === 'p');
    if (!pTag) throw new Error('Bound attr: no p tag_open found');
    if (!pTag.bindings || pTag.bindings.class !== 'activeClass') {
        throw new Error(`Bound attr: expected bindings.class='activeClass', got ${JSON.stringify(pTag.bindings)}`);
    }

    // 6. Self-closing tag
    tokens = tokenize('<br />');
    if (tokens[0]?.type !== 'self_close') throw new Error(`Self-close: expected self_close, got ${tokens[0]?.type}`);

    // 7. compile() returns code string + tokens
    const result = compile('<div>{{ msg }}</div>');
    if (typeof result.code !== 'string') throw new Error('compile: code should be a string');
    if (!result.code.includes('createNode')) throw new Error('compile: code should contain createNode');
    if (!Array.isArray(result.tokens)) throw new Error('compile: tokens should be an array');

    console.log('✅ Compiler tokenizer tests passed!');
}
