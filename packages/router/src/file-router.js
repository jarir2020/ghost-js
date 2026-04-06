// Ghost File Router — updated 2026-04-06 (added route guards)
import { signal, batch } from '../../core/src/index.js';

function parseQuery(search) {
    if (!search || search === '?') return {};
    const params = {};
    search.replace(/^\?/, '').split('&').forEach(part => {
        const [key, val] = part.split('=');
        if (key) params[decodeURIComponent(key)] = val !== undefined ? decodeURIComponent(val) : true;
    });
    return params;
}

/**
 * Enhanced Router with Nested Layout support, dynamic :param segments, and 404 wildcard.
 *
 * Route tree example:
 * {
 *   layout: RootLayout,
 *   children: {
 *     'about': { page: AboutPage },
 *     'user': {
 *       children: {
 *         ':id': { page: UserPage }  // dynamic segment
 *       }
 *     }
 *   },
 *   '*': { page: NotFoundPage }       // wildcard 404
 * }
 */
export function createFileRouter(routeTree) {
    const currentPath = signal(typeof window !== 'undefined' ? window.location.pathname : '/');
    const routeParams = signal({});
    const routeQuery = signal({});

    if (typeof window !== 'undefined') {
        window.addEventListener('popstate', () => {
            batch(() => {
                currentPath.set(window.location.pathname);
                routeQuery.set(parseQuery(window.location.search));
            });
        });
    }

    /**
     * Walk the route tree segment by segment.
     * Supports literal keys, ':param' dynamic keys, and '*' wildcard fallback.
     */
    function resolve(tree, segments) {
        const result = [];
        const params = {};

        if (tree.layout) result.push(tree.layout);

        let current = tree;
        for (const segment of segments) {
            const children = current.children || {};

            // 1. Exact match
            if (children[segment]) {
                current = children[segment];
            } else {
                // 2. Dynamic :param match
                const dynamicKey = Object.keys(children).find(k => k.startsWith(':'));
                if (dynamicKey) {
                    params[dynamicKey.slice(1)] = segment;
                    current = children[dynamicKey];
                } else if (children['*']) {
                    // 3. Wildcard within this level
                    current = children['*'];
                    break;
                } else {
                    // No match — check top-level wildcard
                    if (tree['*']) return { components: [tree['*'].page].filter(Boolean), params };
                    return { components: result, params }; // fallthrough (empty page)
                }
            }
            if (current.layout) result.push(current.layout);
        }

        if (current.page) result.push(current.page);
        return { components: result, params };
    }

    const guards = [];

    async function _navigate(pathname, query = {}) {
        const from = currentPath.get();
        for (const guard of guards) {
            const result = await guard(pathname, from);
            if (result === false) return;
            if (typeof result === 'string') return _navigate(result);
        }
        batch(() => {
            currentPath.set(pathname || '/');
            routeQuery.set(query);
        });
    }

    return {
        get path()   { return currentPath.get(); },
        get query()  { return routeQuery.get(); },
        get params() { return routeParams.get(); },

        async push(path) {
            const [pathname, search] = path.split('?');
            if (typeof window !== 'undefined') {
                window.history.pushState({}, '', path);
            }
            await _navigate(pathname, parseQuery(search ? '?' + search : ''));
        },

        /** Register a navigation guard: (to, from) => boolean | string | Promise */
        guard(fn) { guards.push(fn); return this; },

        // Returns ordered array of components to render: [Layout?, ...NestedLayouts?, Page]
        get matched() {
            const path = currentPath.get();
            const segments = path.split('/').filter(Boolean);
            const { components, params } = resolve(routeTree, segments);
            routeParams.set(params);
            return components;
        }
    };
}
