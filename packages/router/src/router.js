import { signal, effect, batch } from '../../core/src/index.js';

const currentPath = signal(window.location.pathname);

// Basic route matching
function matchRoute(routes, path) {
    for (const route of routes) {
        if (route.path === path) return route;
        // Basic nested route check (very simple for now)
        if (route.children) {
            const childMatch = matchRoute(route.children, path);
            if (childMatch) return { ...route, matchedChild: childMatch };
        }
    }
    return null;
}

export function createRouter(routes) {
    window.addEventListener('popstate', () => {
        currentPath.set(window.location.pathname);
    });

    return {
        get path() { return currentPath.get(); },
        push(path) {
            if (typeof window !== 'undefined') {
                window.history.pushState({}, '', path);
            }
            currentPath.set(path);
        },
        link(path, children) {
            return {
                tag: 'a',
                props: {
                    href: path,
                    onclick: (e) => {
                        e.preventDefault();
                        this.push(path);
                    }
                },
                children
            };
        },
        get activeComponent() {
            const match = matchRoute(routes, currentPath.get());
            return match ? match.component : null;
        }
    };
}
