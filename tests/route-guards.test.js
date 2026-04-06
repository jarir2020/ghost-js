// Tests for route guards on both router types — 2026-04-06
import { createRouter } from '../packages/router/src/router.js';
import { createFileRouter } from '../packages/router/src/file-router.js';

// Stub window for Node.js
global.window = global.window || {
    location: { pathname: '/', search: '' },
    history: { pushState() {} },
    addEventListener() {}
};

export async function testRouteGuards() {
    console.log('--- Testing Route Guards ---');

    // ── createRouter guards ──────────────────────────────────────────────────
    const routes = [
        { path: '/public',  component: 'PublicPage' },
        { path: '/private', component: 'PrivatePage' },
        { path: '/login',   component: 'LoginPage' },
        { path: '*',        component: 'NotFound' },
    ];

    const router = createRouter(routes);
    let guardCalled = false;

    // 1. Guard allows navigation
    router.guard((to, from) => {
        guardCalled = true;
        return true; // allow
    });
    await router.push('/public');
    if (!guardCalled) throw new Error('Guard was not called on push');
    if (router.path !== '/public') throw new Error(`Guard allow: expected /public, got ${router.path}`);

    // 2. Guard blocks navigation
    const blockingGuard = (to) => to === '/private' ? false : true;
    router.guard(blockingGuard);
    await router.push('/private');
    // Should stay on /public (navigation blocked)
    if (router.path !== '/public') throw new Error(`Guard block: path should stay /public, got ${router.path}`);

    // 3. Guard redirects
    const redirectGuard = (to) => to === '/admin' ? '/login' : true;
    const router2 = createRouter(routes);
    router2.guard(redirectGuard);
    await router2.push('/admin');
    if (router2.path !== '/login') throw new Error(`Guard redirect: expected /login, got ${router2.path}`);

    // ── createFileRouter guards ──────────────────────────────────────────────
    const tree = {
        children: {
            'home': { page: 'HomePage' },
            'secure': { page: 'SecurePage' },
        }
    };
    const fileRouter = createFileRouter(tree);
    let fileGuardCalled = false;

    fileRouter.guard((to) => {
        fileGuardCalled = true;
        if (to === '/secure') return false; // block
        return true;
    });

    await fileRouter.push('/home');
    if (!fileGuardCalled) throw new Error('File router guard not called');
    if (fileRouter.path !== '/home') throw new Error(`File router guard allow: got ${fileRouter.path}`);

    await fileRouter.push('/secure');
    // Should remain on /home (blocked)
    if (fileRouter.path !== '/home') throw new Error(`File router guard block: got ${fileRouter.path}`);

    // 4. Async guard
    const asyncRouter = createRouter(routes);
    asyncRouter.guard(async (to) => {
        await new Promise(r => setTimeout(r, 10));
        return to !== '/private'; // block /private asynchronously
    });
    await asyncRouter.push('/public');
    if (asyncRouter.path !== '/public') throw new Error(`Async guard allow: got ${asyncRouter.path}`);
    await asyncRouter.push('/private');
    if (asyncRouter.path !== '/public') throw new Error(`Async guard block: got ${asyncRouter.path}`);

    console.log('✅ Route guard tests passed!');
}
