// Tests for createList, when(), defineComponent, memo — 2026-04-06
// These run in Node.js with a minimal DOM stub.
import { signal } from '../packages/core/src/signals.js';
import { createList, when, defineComponent, memo, createNode } from '../packages/core/src/render-graph.js';

/** Minimal DOM stub for Node.js testing */
function setupDOM() {
    const els = new Map();
    let idSeq = 0;

    function makeEl(tag) {
        const id = ++idSeq;
        const children = [];
        const attrs = {};
        const el = {
            _id: id, _tag: tag, _children: children, _attrs: attrs,
            setAttribute(k, v) { attrs[k] = v; },
            getAttribute(k)    { return attrs[k]; },
            appendChild(child) { children.push(child); return child; },
            insertBefore(node, ref) {
                const idx = ref ? children.indexOf(ref) : children.length;
                if (idx === -1) children.push(node);
                else children.splice(idx, 0, node);
                return node;
            },
            removeChild(child) {
                const i = children.indexOf(child);
                if (i !== -1) children.splice(i, 1);
                return child;
            },
            remove() { /* stub */ },
            get firstChild() { return children[0] || null; },
            get nextSibling() { return null; },
            get parentNode() { return null; },
        };
        els.set(id, el);
        return el;
    }

    global.document = {
        createElement(tag) { return makeEl(tag); },
        createTextNode(v)  { const n = makeEl('#text'); n._text = v; return n; },
        createComment(v)   { const n = makeEl('#comment'); n._comment = v; return n; },
        head: makeEl('head'),
        body: makeEl('body'),
    };
    global.window = { location: { pathname: '/', search: '' }, history: { pushState() {} }, addEventListener() {} };
    global.performance = { now: () => Date.now() };
    global.requestAnimationFrame = fn => setTimeout(fn, 0);
}

export function testRenderGraph() {
    console.log('--- Testing Render Graph (createList, when, defineComponent, memo) ---');

    setupDOM();

    // ── 1. createList descriptor shape ──────────────────────────────────────
    const items = signal([{ id: 1, name: 'a' }, { id: 2, name: 'b' }]);
    const listDesc = createList(
        () => items.get(),
        item => item.id,
        item => createNode('li', {}, [item.name])
    );
    if (!listDesc.__ghostList) throw new Error('createList: missing __ghostList flag');
    if (typeof listDesc.getItems !== 'function') throw new Error('createList: missing getItems');
    if (typeof listDesc.keyFn !== 'function') throw new Error('createList: missing keyFn');
    if (typeof listDesc.renderFn !== 'function') throw new Error('createList: missing renderFn');

    // ── 2. when descriptor shape ─────────────────────────────────────────────
    const show = signal(true);
    const whenDesc = when(
        () => show.get(),
        () => createNode('span', {}, ['visible']),
        () => createNode('span', {}, ['hidden'])
    );
    if (!whenDesc.__ghostWhen) throw new Error('when: missing __ghostWhen flag');
    if (typeof whenDesc.conditionGetter !== 'function') throw new Error('when: missing conditionGetter');
    if (typeof whenDesc.trueFn !== 'function') throw new Error('when: missing trueFn');
    if (typeof whenDesc.falseFn !== 'function') throw new Error('when: missing falseFn');

    // ── 3. defineComponent normalizes props ──────────────────────────────────
    const Button = defineComponent((props) => {
        // All props should be functions
        if (typeof props.label !== 'function') throw new Error('defineComponent: label should be a getter');
        if (typeof props.onClick !== 'function') throw new Error('defineComponent: onClick should be a getter');
        const labelVal = props.label();
        if (labelVal !== 'Click') throw new Error(`defineComponent: label value wrong: ${labelVal}`);
        return createNode('button', {}, [labelVal]);
    });

    const node = Button({ label: 'Click', onClick: () => {} });
    if (!node || node.tag !== 'button') throw new Error('defineComponent: returned wrong node');

    // ── 4. defineComponent with signal getter prop ───────────────────────────
    const titleSig = signal('Hello');
    const Title = defineComponent((props) => createNode('h1', {}, [props.title()]));
    const titleNode = Title({ title: () => titleSig.get() });
    if (!titleNode || titleNode.tag !== 'h1') throw new Error('defineComponent: signal prop node wrong');

    // ── 5. memo returns consistent node when deps unchanged ──────────────────
    let factoryCallCount = 0;
    const dep = signal('v1');
    const memoNode = memo(
        () => { factoryCallCount++; return createNode('div', {}, []); },
        () => dep.get()
    );
    // Access via tag (first call triggers factory)
    const t1 = memoNode.tag;
    const t2 = memoNode.tag;
    if (factoryCallCount !== 1) throw new Error(`memo: factory should run once, ran ${factoryCallCount}`);
    // Change dep — factory should re-run
    dep.set('v2');
    const t3 = memoNode.tag;
    if (factoryCallCount !== 2) throw new Error(`memo: factory should re-run on dep change, ran ${factoryCallCount}`);

    console.log('✅ Render graph (createList, when, defineComponent, memo) tests passed!');
}
