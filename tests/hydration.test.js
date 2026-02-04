import { renderWithState } from '../packages/core/src/index.js';

export function testHydration() {
    console.log('--- Testing Hydration & SSR State ---');

    const App = {
        tag: 'div',
        props: {},
        children: ['Ghost']
    };

    const state = { user: 'phantom' };
    const html = renderWithState(App, state);

    if (!html.includes('data-ghost-ssr')) {
        throw new Error('SSR missing state script');
    }

    if (!html.includes('{"user":"phantom"}')) {
        throw new Error('SSR state content mismatch');
    }

    console.log('✅ Hydration/SSR tests passed!');
}
