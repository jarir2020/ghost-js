// Tests for fixed SSR: signals, when(), createList, streaming — 2026-04-06
import { signal } from '../packages/core/src/signals.js';
import { renderToString, renderToStream } from '../packages/core/src/ssr.js';
import { when, createList, createNode } from '../packages/core/src/render-graph.js';

export async function testSSRv2() {
    console.log('--- Testing SSR v2 (signals, when, list, stream) ---');

    // 1. Function child is called (signal rendering fix)
    const count = signal(42);
    const node = {
        tag: 'p', props: {}, children: [() => count.get()]
    };
    const html = renderToString(node);
    if (!html.includes('42')) throw new Error(`SSR signal: expected '42' in "${html}"`);

    // 2. Reactive prop is resolved
    const node2 = { tag: 'div', props: { id: () => 'dynamic-id' }, children: [] };
    const html2 = renderToString(node2);
    if (!html2.includes('id="dynamic-id"')) throw new Error(`SSR reactive prop: got "${html2}"`);

    // 3. Boolean prop true → attribute present, false → omitted
    const node3 = { tag: 'input', props: { disabled: true, required: false }, children: [] };
    const html3 = renderToString(node3);
    if (!html3.includes('disabled')) throw new Error(`SSR bool true: expected 'disabled' in "${html3}"`);
    if (html3.includes('required')) throw new Error(`SSR bool false: 'required' should be omitted in "${html3}"`);

    // 4. when() renders correct branch
    const visible = signal(true);
    const whenNode = when(
        () => visible.get(),
        () => ({ tag: 'span', props: {}, children: ['shown'] }),
        () => ({ tag: 'span', props: {}, children: ['hidden'] })
    );
    const htmlTrue = renderToString(whenNode);
    if (!htmlTrue.includes('shown')) throw new Error(`SSR when true: got "${htmlTrue}"`);
    visible.set(false);
    const htmlFalse = renderToString(whenNode);
    if (!htmlFalse.includes('hidden')) throw new Error(`SSR when false: got "${htmlFalse}"`);

    // 5. createList renders all items
    const todos = signal([{ id: 1, text: 'Buy milk' }, { id: 2, text: 'Write code' }]);
    const listNode = createList(
        () => todos.get(),
        t => t.id,
        t => ({ tag: 'li', props: {}, children: [t.text] })
    );
    const htmlList = renderToString(listNode);
    if (!htmlList.includes('Buy milk')) throw new Error(`SSR list: missing item 1 in "${htmlList}"`);
    if (!htmlList.includes('Write code')) throw new Error(`SSR list: missing item 2 in "${htmlList}"`);

    // 6. Void elements have no closing tag
    const brNode = { tag: 'br', props: {}, children: [] };
    const htmlBr = renderToString(brNode);
    if (htmlBr !== '<br>') throw new Error(`SSR void: expected '<br>', got "${htmlBr}"`);

    // 7. renderToStream yields chunks
    const streamNode = { tag: 'div', props: {}, children: ['hello'] };
    let streamed = '';
    for await (const chunk of renderToStream(streamNode)) {
        streamed += chunk;
    }
    if (!streamed.includes('<div>') || !streamed.includes('hello') || !streamed.includes('</div>')) {
        throw new Error(`SSR stream: got "${streamed}"`);
    }

    console.log('✅ SSR v2 tests passed!');
}
