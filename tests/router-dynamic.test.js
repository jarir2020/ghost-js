// Tests for dynamic route segments, query parsing, and 404 — 2026-04-06
import { createFileRouter } from '../packages/router/src/file-router.js';
import { createRouter } from '../packages/router/src/router.js';

export function testRouterDynamic() {
    console.log('--- Testing Router: Dynamic Segments, Query, 404 ---');

    // ---- createFileRouter tests ----
    const tree = {
        layout: 'RootLayout',
        children: {
            'about': { page: 'AboutPage' },
            'user': {
                children: {
                    ':id': { page: 'UserPage' }
                }
            },
            'blog': {
                layout: 'BlogLayout',
                children: {
                    ':slug': { page: 'PostPage' }
                }
            }
        },
        '*': { page: 'NotFoundPage' }
    };

    const router = createFileRouter(tree);

    // 1. Literal route still works
    router.push('/about');
    let m = router.matched;
    if (m[0] !== 'RootLayout') throw new Error(`about: expected RootLayout, got ${m[0]}`);
    if (m[1] !== 'AboutPage') throw new Error(`about: expected AboutPage, got ${m[1]}`);

    // 2. Dynamic :id segment
    router.push('/user/42');
    m = router.matched;
    if (m[0] !== 'RootLayout') throw new Error(`user/42: expected RootLayout, got ${m[0]}`);
    if (m[1] !== 'UserPage') throw new Error(`user/42: expected UserPage, got ${m[1]}`);
    if (router.params.id !== '42') throw new Error(`user/42: params.id should be '42', got ${router.params.id}`);

    // 3. Dynamic :slug inside nested layout
    router.push('/blog/hello-world');
    m = router.matched;
    if (m[0] !== 'RootLayout') throw new Error(`blog/hello-world: expected RootLayout, got ${m[0]}`);
    if (m[1] !== 'BlogLayout') throw new Error(`blog/hello-world: expected BlogLayout, got ${m[1]}`);
    if (m[2] !== 'PostPage') throw new Error(`blog/hello-world: expected PostPage, got ${m[2]}`);
    if (router.params.slug !== 'hello-world') throw new Error(`blog/hello-world: params.slug wrong: ${router.params.slug}`);

    // 4. 404 wildcard
    router.push('/nonexistent/path');
    m = router.matched;
    if (!m.includes('NotFoundPage')) throw new Error(`404: expected NotFoundPage in ${m}`);

    // 5. Query string parsing
    router.push('/about?foo=bar&count=3');
    if (router.query.foo !== 'bar') throw new Error(`query.foo expected 'bar', got ${router.query.foo}`);
    if (router.query.count !== '3') throw new Error(`query.count expected '3', got ${router.query.count}`);

    // ---- createRouter (manual routes) tests ----
    const routes = [
        { path: '/home', component: 'HomeComp' },
        { path: '/user/:id', component: 'UserComp' },
        { path: '*', component: 'NotFound' }
    ];
    const manualRouter = createRouter(routes);

    manualRouter.push('/home');
    if (manualRouter.activeComponent !== 'HomeComp') {
        throw new Error(`manual /home: expected HomeComp, got ${manualRouter.activeComponent}`);
    }

    manualRouter.push('/user/99');
    if (manualRouter.activeComponent !== 'UserComp') {
        throw new Error(`manual /user/99: expected UserComp, got ${manualRouter.activeComponent}`);
    }

    manualRouter.push('/nowhere');
    if (manualRouter.activeComponent !== 'NotFound') {
        throw new Error(`manual wildcard: expected NotFound, got ${manualRouter.activeComponent}`);
    }

    console.log('✅ Router dynamic segment tests passed!');
}
