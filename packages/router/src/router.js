// Ghost Router — updated 2026-04-06 (added route guards)
import { signal, batch } from '../../core/src/index.js';

const currentPath  = signal(typeof window !== 'undefined' ? window.location.pathname : '/');
export const routeParams = signal({});
export const routeQuery  = signal({});

function parseQuery(search) {
    if (!search || search === '?') return {};
    const params = {};
    search.replace(/^\?/, '').split('&').forEach(part => {
        const [key, val] = part.split('=');
        if (key) params[decodeURIComponent(key)] = val !== undefined ? decodeURIComponent(val) : true;
    });
    return params;
}

function matchPattern(pattern, path) {
    const pp = pattern.split('/').filter(Boolean);
    const vp = path.split('/').filter(Boolean);
    if (pp.length !== vp.length) return null;
    const params = {};
    for (let i = 0; i < pp.length; i++) {
        if (pp[i].startsWith(':')) params[pp[i].slice(1)] = vp[i];
        else if (pp[i] !== vp[i]) return null;
    }
    return params;
}

function matchRoute(routes, path) {
    let wildcard = null;
    for (const route of routes) {
        if (route.path === '*') { wildcard = { route, params: {} }; continue; }
        const params = matchPattern(route.path, path);
        if (params !== null) return { route, params };
        if (route.children) {
            const child = matchRoute(route.children, path);
            if (child) return { ...child, route: { ...route, matchedChild: child.route } };
        }
    }
    return wildcard;
}

export function createRouter(routes) {
    const guards = []; // Array of async (to, from) => boolean | string

    if (typeof window !== 'undefined') {
        window.addEventListener('popstate', () => {
            _navigate(window.location.pathname, parseQuery(window.location.search));
        });
    }

    async function _navigate(pathname, query = {}) {
        const from = currentPath.get();

        // Run all guards in sequence
        for (const guard of guards) {
            const result = await guard(pathname, from);
            if (result === false) return; // cancelled
            if (typeof result === 'string') {
                // Redirect to the returned path
                return _navigate(result);
            }
        }

        batch(() => {
            currentPath.set(pathname);
            routeQuery.set(query);
        });
    }

    const router = {
        get path()   { return currentPath.get(); },
        get query()  { return routeQuery.get(); },
        get params() { return routeParams.get(); },

        /**
         * Navigate to a path. Runs guards first.
         * @param {string} path — may include query string: '/user/1?tab=profile'
         */
        async push(path) {
            const [pathname, search] = path.split('?');
            if (typeof window !== 'undefined') {
                window.history.pushState({}, '', path);
            }
            await _navigate(pathname, parseQuery(search ? '?' + search : ''));
        },

        /**
         * Register a navigation guard.
         * @param {(to: string, from: string) => boolean | string | Promise<boolean|string>} fn
         *   Return false to cancel, a string to redirect, or true/undefined to allow.
         */
        guard(fn) {
            guards.push(fn);
            return this; // chainable
        },

        link(path, children) {
            return {
                tag: 'a',
                props: {
                    href: path,
                    onclick: (e) => { e.preventDefault(); router.push(path); }
                },
                children
            };
        },

        get activeComponent() {
            const match = matchRoute(routes, currentPath.get());
            if (!match) return null;
            routeParams.set(match.params || {});
            return match.route.matchedChild
                ? match.route.matchedChild.component
                : match.route.component;
        }
    };

    return router;
}
