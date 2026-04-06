// Tests for ghostFetch caching + interceptors — 2026-04-06
import { ghostFetch, clearHttpCache } from '../packages/core/src/http.js';

export async function testHTTPv2() {
    console.log('--- Testing HTTP v2 (cache, interceptors) ---');

    // 1. clearHttpCache exists and doesn't throw
    clearHttpCache();

    // 2. Interceptors arrays exist
    if (!Array.isArray(ghostFetch.interceptors?.request)) {
        throw new Error('ghostFetch.interceptors.request should be an array');
    }
    if (!Array.isArray(ghostFetch.interceptors?.response)) {
        throw new Error('ghostFetch.interceptors.response should be an array');
    }

    // 3. Request interceptor runs and can mutate config
    let interceptorCalled = false;
    const reqInterceptor = (config) => {
        interceptorCalled = true;
        config.headers = { ...config.headers, 'X-Test': 'ghost' };
        return config;
    };
    ghostFetch.interceptors.request.push(reqInterceptor);

    // Mock fetch globally
    global.fetch = async (url, opts) => {
        return {
            ok: true,
            headers: { get: () => 'application/json' },
            json: async () => ({ url, headers: opts?.headers }),
        };
    };

    const result = await ghostFetch('https://api.example.com/data');
    if (!interceptorCalled) throw new Error('Request interceptor was not called');
    if (!result.headers?.['X-Test']) throw new Error('Interceptor header not passed through');

    // Cleanup
    ghostFetch.interceptors.request.pop();
    interceptorCalled = false;

    // 4. Response interceptor transforms data
    ghostFetch.interceptors.response.push((res, data) => ({ ...data, transformed: true }));
    const result2 = await ghostFetch('https://api.example.com/data2');
    if (!result2.transformed) throw new Error('Response interceptor did not transform data');
    ghostFetch.interceptors.response.pop();

    // 5. Cache: same URL called twice — fetch called once
    let fetchCount = 0;
    global.fetch = async (url) => {
        fetchCount++;
        return {
            ok: true,
            headers: { get: () => 'application/json' },
            json: async () => ({ n: fetchCount }),
        };
    };

    clearHttpCache();
    const r1 = await ghostFetch('https://api.example.com/cached', { cache: 'memory' });
    const r2 = await ghostFetch('https://api.example.com/cached', { cache: 'memory' });
    if (fetchCount !== 1) throw new Error(`Cache: fetch called ${fetchCount} times, expected 1`);
    if (r1.n !== r2.n) throw new Error('Cache: responses differ');

    // 6. clearHttpCache clears specific entry
    clearHttpCache('https://api.example.com/cached');
    const r3 = await ghostFetch('https://api.example.com/cached', { cache: 'memory' });
    if (fetchCount !== 2) throw new Error(`Cache clear: fetch should run again, called ${fetchCount} times`);

    clearHttpCache();

    console.log('✅ HTTP v2 (cache, interceptors) tests passed!');
}
