// Tests for Ghost i18n module — 2026-04-06
import { locale, loadLocale, t, tr } from '../packages/core/src/i18n.js';
import { signal } from '../packages/core/src/signals.js';

export async function testI18n() {
    console.log('--- Testing i18n (t, locale, loadLocale) ---');

    // Reset locale to 'en'
    locale.set('en');

    // 1. Load English dictionary
    loadLocale('en', {
        greeting: 'Hello, {{name}}!',
        nav: { home: 'Home', about: 'About' },
        count: '{{count}} items'
    });

    // 2. Basic translation
    const greet = t('greeting', { name: 'Ghost' });
    if (typeof greet !== 'function') throw new Error('t(): should return a function');
    if (greet() !== 'Hello, Ghost!') throw new Error(`t() basic: got "${greet()}"`);

    // 3. Nested key (dot notation)
    const home = t('nav.home');
    if (home() !== 'Home') throw new Error(`t() nested: got "${home()}"`);

    // 4. Missing key fallback to key itself
    const missing = t('does.not.exist');
    if (missing() !== 'does.not.exist') throw new Error(`t() fallback: got "${missing()}"`);

    // 5. Number interpolation
    const count = t('count', { count: 5 });
    if (count() !== '5 items') throw new Error(`t() number var: got "${count()}"`);

    // 6. Load French locale and switch
    loadLocale('fr', {
        greeting: 'Bonjour, {{name}}!',
        nav: { home: 'Accueil' }
    });

    locale.set('fr');
    if (greet() !== 'Bonjour, Ghost!') throw new Error(`locale switch: got "${greet()}"`);

    const homeFr = t('nav.home');
    if (homeFr() !== 'Accueil') throw new Error(`fr nav.home: got "${homeFr()}"`);

    // 7. tr() with reactive variable
    const userName = signal('World');
    locale.set('en');
    const reactiveGreet = tr('greeting', { name: () => userName.get() });
    if (reactiveGreet() !== 'Hello, World!') throw new Error(`tr() initial: got "${reactiveGreet()}"`);
    userName.set('Ghost');
    if (reactiveGreet() !== 'Hello, Ghost!') throw new Error(`tr() after update: got "${reactiveGreet()}"`);

    // Reset locale
    locale.set('en');

    console.log('✅ i18n tests passed!');
}
