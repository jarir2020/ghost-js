import { createFileRouter } from '../packages/router/src/file-router.js';

export function testRouter() {
    console.log('--- Testing File Router ---');

    const mockTree = {
        layout: 'RootLayout',
        children: {
            'about': {
                page: 'AboutPage'
            },
            'blog': {
                layout: 'BlogLayout',
                children: {
                    'post': {
                        page: 'PostPage'
                    }
                }
            }
        }
    };

    // Test recursive matching
    const router = createFileRouter(mockTree);

    // Simulate navigation
    router.push('/about');
    let matched = router.matched;
    if (matched[0] !== 'RootLayout' || matched[1] !== 'AboutPage') {
        throw new Error(`Router failed /about: got ${matched}`);
    }

    router.push('/blog/post');
    matched = router.matched;
    if (matched[0] !== 'RootLayout' || matched[1] !== 'BlogLayout' || matched[2] !== 'PostPage') {
        throw new Error(`Router failed /blog/post: got ${matched}`);
    }

    console.log('✅ Router tests passed!');
}
