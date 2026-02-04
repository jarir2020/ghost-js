import { signal, effect } from '../../core/src/index.js';

/**
 * Enhanced Router with Nested Layout support
 */
export function createFileRouter(routeTree) {
    const currentPath = signal(typeof window !== 'undefined' ? window.location.pathname : '/');

    if (typeof window !== 'undefined') {
        window.addEventListener('popstate', () => {
            currentPath.set(window.location.pathname);
        });
    }

    return {
        get path() { return currentPath.get(); },
        push(path) {
            if (typeof window !== 'undefined') {
                window.history.pushState({}, '', path);
            }
            currentPath.set(path);
        },
        // Returns the list of components to render (Layouts + Page)
        get matched() {
            const path = currentPath.get();
            const result = [];
            let current = routeTree;

            // This is a simplified tree traversal for routing
            // In a real implementation, we'd use regex or a segment-based matcher
            const segments = path.split('/').filter(Boolean);

            if (current.layout) result.push(current.layout);

            let nodes = current.children || {};
            for (const segment of segments) {
                if (nodes[segment]) {
                    current = nodes[segment];
                    if (current.layout) result.push(current.layout);
                    nodes = current.children || {};
                }
            }

            if (current.page) result.push(current.page);
            return result;
        }
    };
}
