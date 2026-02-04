import { renderToString } from './src/ssr.js';
import { signal } from './src/signals.js';

console.log('--- Testing SSR ---');

const count = signal(5);

const App = {
    tag: 'div',
    props: { class: 'container', id: 'app' },
    children: [
        { tag: 'h1', props: {}, children: ['Ghost SSR'] },
        { tag: 'p', props: {}, children: [() => `Count: ${count.get()}`] }
    ]
};

const html = renderToString(App);
console.log('Generated HTML:');
console.log(html);

const expected = '<div class="container" id="app"><h1>Ghost SSR</h1><p>Count: 5</p></div>';

if (html === expected) {
    console.log('✅ SSR test passed!');
} else {
    console.log('❌ SSR test failed!');
    console.log('Expected:', expected);
    process.exit(1);
}
