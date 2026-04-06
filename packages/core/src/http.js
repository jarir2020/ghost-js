// Ghost HTTP — updated 2026-04-06
// Added: in-memory cache, request/response interceptors

// ─── XML parser ───────────────────────────────────────────────────────────────

export function xml2json(xmlString) {
    if (typeof window === 'undefined' || !window.DOMParser) return {};
    const parser = new DOMParser();
    const doc    = parser.parseFromString(xmlString, 'text/xml');

    function parseNode(node) {
        const obj = {};
        if (node.nodeType === 3) return node.nodeValue.trim(); // text node

        if (node.attributes?.length) {
            obj['@attributes'] = {};
            for (const attr of node.attributes) {
                obj['@attributes'][attr.nodeName] = attr.nodeValue;
            }
        }

        for (const child of node.childNodes) {
            const name   = child.nodeName;
            const parsed = parseNode(child);
            if (parsed === '') continue;

            if (obj[name] === undefined) {
                obj[name] = parsed;
            } else {
                if (!Array.isArray(obj[name])) obj[name] = [obj[name]];
                obj[name].push(parsed);
            }
        }
        return obj;
    }

    return parseNode(doc.documentElement);
}

// ─── Cache ────────────────────────────────────────────────────────────────────

const _cache = new Map(); // key: `${method}:${url}` → parsed response

function cacheKey(url, method = 'GET') {
    return `${method.toUpperCase()}:${url}`;
}

/** Clear the entire in-memory HTTP cache (or a single entry). */
export function clearHttpCache(url, method = 'GET') {
    if (url) _cache.delete(cacheKey(url, method));
    else _cache.clear();
}

// ─── Interceptors ─────────────────────────────────────────────────────────────

/**
 * ghostFetch.interceptors.request  — array of (config) => config
 * ghostFetch.interceptors.response — array of (response, data) => data
 *
 * Usage:
 *   ghostFetch.interceptors.request.push(cfg => {
 *     cfg.headers = { ...cfg.headers, Authorization: `Bearer ${token}` };
 *     return cfg;
 *   });
 */
ghostFetch.interceptors = {
    request:  [],
    response: []
};

// ─── ghostFetch ───────────────────────────────────────────────────────────────

/**
 * Ghost's fetch wrapper.
 *
 * Options (extends standard fetch):
 *   cache: 'memory' | false   — cache GET responses in memory (default false)
 *   All standard fetch options are forwarded.
 */
export async function ghostFetch(url, options = {}) {
    const { cache: useCache = false, ...fetchOptions } = options;
    const method = (fetchOptions.method || 'GET').toUpperCase();

    // Apply request interceptors
    let config = { url, ...fetchOptions };
    for (const interceptor of ghostFetch.interceptors.request) {
        config = interceptor(config) ?? config;
    }
    const resolvedUrl = config.url;
    delete config.url;

    // Check in-memory cache (GET only)
    const key = cacheKey(resolvedUrl, method);
    if (useCache === 'memory' && method === 'GET' && _cache.has(key)) {
        return _cache.get(key);
    }

    const response = await fetch(resolvedUrl, config);
    const contentType = response.headers.get('content-type') || '';

    if (!response.ok) {
        throw new Error(`Ghost-HTTP Error: ${response.status} ${response.statusText}`);
    }

    let data;
    if (contentType.includes('application/xml') || contentType.includes('text/xml')) {
        data = xml2json(await response.text());
    } else if (contentType.includes('application/json')) {
        data = await response.json();
    } else {
        data = await response.text();
    }

    // Apply response interceptors
    for (const interceptor of ghostFetch.interceptors.response) {
        data = interceptor(response, data) ?? data;
    }

    // Store in cache
    if (useCache === 'memory' && method === 'GET') {
        _cache.set(key, data);
    }

    return data;
}
