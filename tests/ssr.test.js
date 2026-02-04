import { renderToString } from '../packages/core/src/index.js';

export function testSSR() {
    console.log('--- Testing SSR ---');

    const App = {
        tag: 'div',
        props: { id: 'test' },
        children: [
            { tag: 'span', props: {}, children: ['hello'] }
        ]
    };

    const html = renderToString(App);
    const expected = '<div id="test"><span>hello</span></div>';

    if (html !== expected) {
        throw new Error(`SSR failed: expected ${expected}, got ${html}`);
    }

    console.log('✅ SSR tests passed!');
}
