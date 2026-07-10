// Ghost Bundler — updated 2026-04-06 (added ghostPlugin for .ghost templates, code splitting)
import { createServer } from 'http';
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, watch as fsWatch, writeFileSync } from 'fs';
import { extname, join } from 'path';
import { ghostAssetPlugin } from './asset-pipeline.js';
import { checkSize } from './size-monitor.js';

function getContentType(filePath) {
    switch (extname(filePath)) {
    case '.html':
        return 'text/html; charset=utf-8';
    case '.js':
        return 'application/javascript; charset=utf-8';
    case '.css':
        return 'text/css; charset=utf-8';
    case '.json':
        return 'application/json; charset=utf-8';
    case '.svg':
        return 'image/svg+xml';
    case '.png':
        return 'image/png';
    case '.jpg':
    case '.jpeg':
        return 'image/jpeg';
    default:
        return 'application/octet-stream';
    }
}

function resolveStaticFile(rootDir, requestPath) {
    const normalizedPath = requestPath === '/' ? '/index.html' : requestPath;
    let filePath = join(rootDir, normalizedPath);

    if (!existsSync(filePath)) {
        return join(rootDir, 'index.html');
    }

    const stats = statSync(filePath);
    if (stats.isDirectory()) {
        const indexPath = join(filePath, 'index.html');
        return existsSync(indexPath) ? indexPath : join(rootDir, 'index.html');
    }

    return filePath;
}

function snapshotMemoryUsage() {
    const usage = process.memoryUsage();
    const toMB = (value) => Number((value / 1024 / 1024).toFixed(2));

    return {
        rssMB: toMB(usage.rss),
        heapUsedMB: toMB(usage.heapUsed),
        heapTotalMB: toMB(usage.heapTotal),
        externalMB: toMB(usage.external),
        arrayBuffersMB: toMB(usage.arrayBuffers || 0)
    };
}

function printDevMetrics(label, metrics, json = false) {
    const payload = {
        label,
        timestamp: new Date().toISOString(),
        ...metrics
    };

    if (json) {
        console.log(`${label} Metrics: ${JSON.stringify(payload)}`);
        return;
    }

    console.log(`${label} Metrics:`);
    console.log(`  Heap Used: ${payload.heapUsedMB} MB`);
    console.log(`  Heap Total: ${payload.heapTotalMB} MB`);
    console.log(`  RSS: ${payload.rssMB} MB`);
    console.log(`  Watchers: ${payload.watcherCount}`);
    console.log(`  Cache Hit Rate: ${payload.cacheHitRate}`);
    console.log(`  Last Rebuild: ${payload.rebuildMs}`);
}

function resolvePort(value, fallback) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

async function runStaticServer(projectRoot, options = {}) {
    const {
        rootDir = projectRoot,
        host = '127.0.0.1',
        port = 4173,
        label = 'Ghost Preview'
    } = options;

    const server = createServer((req, res) => {
        const url = new URL(req.url || '/', 'http://localhost');
        const filePath = resolveStaticFile(rootDir, url.pathname);

        try {
            const content = readFileSync(filePath);
            res.statusCode = 200;
            res.setHeader('Content-Type', getContentType(filePath));
            res.end(content);
        } catch {
            res.statusCode = 404;
            res.setHeader('Content-Type', 'text/plain; charset=utf-8');
            res.end('Not Found');
        }
    });

    await new Promise((resolve) => {
        server.listen(port, host, () => resolve());
    });

    const address = server.address();
    const resolvedPort = typeof address === 'object' && address ? address.port : port;
    const resolvedHost = typeof address === 'object' && address && typeof address.address === 'string'
        ? address.address
        : host;
    console.log(`${label}: http://${resolvedHost}:${resolvedPort}`);

    return server;
}

async function loadGhostPlugin() {
    try {
        return await import('@ghost-js/compiler/src/ghost-plugin.js');
    } catch {
        return await import('../../compiler/src/ghost-plugin.js');
    }
}

function buildFallbackRuntimeBundle(projectRoot, { entryPoint = 'src/index.js', outdir }) {
    const sourcePath = join(projectRoot, entryPoint);
    if (!existsSync(sourcePath)) {
        console.error('❌ Error: esbuild is not installed and the entry file is missing.');
        process.exit(1);
    }

    mkdirSync(join(projectRoot, outdir), { recursive: true });
    const fallbackBundle = `/* Ghost.js fallback build: esbuild is not installed. */\n${readFileSync(sourcePath, 'utf8')}\n`;
    writeFileSync(join(projectRoot, outdir, 'bundle.js'), fallbackBundle);
    checkSize(join(projectRoot, outdir, 'bundle.js'));
}

function startFallbackRuntimeWatch(projectRoot, { outdir, label, host = '127.0.0.1', port = 3000, metrics = false, jsonMetrics = false }) {
    const resolvedPort = resolvePort(port, resolvePort(process.env.GHOST_PORT ?? process.env.PORT, 3000));
    let lastRebuildMs = null;
    let watcherCount = 0;

    const rebuild = () => {
        const startedAt = Date.now();
        buildFallbackRuntimeBundle(projectRoot, { outdir });
        lastRebuildMs = `${Date.now() - startedAt}ms`;
    };

    rebuild();

    const serverPromise = runStaticServer(projectRoot, {
        rootDir: projectRoot,
        host,
        port: resolvedPort,
        label
    });

    const srcDir = join(projectRoot, 'src');
    try {
        watcherCount = 1;
        fsWatch(srcDir, { persistent: true }, () => {
            try {
                const startedAt = Date.now();
                rebuild();
                lastRebuildMs = `${Date.now() - startedAt}ms`;
                console.log(`${label}: rebuilt ${outdir}/bundle.js`);
                if (metrics) {
                    printDevMetrics(label, {
                        ...snapshotMemoryUsage(),
                        watcherCount,
                        cacheHitRate: 'n/a',
                        rebuildMs: lastRebuildMs
                    }, jsonMetrics);
                }
            } catch (error) {
                console.error(`❌ ${label} rebuild failed: ${error.message}`);
            }
        });
    } catch {
        // If file watching is unavailable, the static server still runs.
    }

    if (metrics) {
        printDevMetrics(label, {
            ...snapshotMemoryUsage(),
            watcherCount,
            cacheHitRate: 'n/a',
            rebuildMs: lastRebuildMs ?? 'n/a'
        }, jsonMetrics);
    }

    return serverPromise;
}

export async function build(projectRoot, options = {}) {
    const {
        entryPoint = 'src/index.js',
        outfile = 'dist/build/bundle.js',
        minify = true,
        sourcemap = false  // 'inline' in dev, true (external) in prod — 2026-04-06
    } = options;

    const outPath = join(projectRoot, outfile);
    console.log(`Building Ghost project at ${projectRoot}...`);

    const esbuild = await import('esbuild').catch(() => null);
    if (!esbuild) {
        buildFallbackRuntimeBundle(projectRoot, { entryPoint, outdir: 'dist/build' });
        console.log('Build completed successfully! (fallback mode)');
        return;
    }

    try {
        const { ghostPlugin } = await loadGhostPlugin();
        await esbuild.build({
            entryPoints: {
                bundle: join(projectRoot, entryPoint)
            },
            bundle: true,
            outdir: join(projectRoot, 'dist/build'),
            minify,
            sourcemap,
            format: 'esm',
            platform: 'browser',
            splitting: true,           // enables lazyNode() code splitting
            plugins: [ghostPlugin(), ghostAssetPlugin()],
            loader: { '.js': 'jsx', '.png': 'file', '.jpg': 'file' },
        });
        console.log('Build completed successfully!');
        checkSize(join(projectRoot, 'dist/build/bundle.js'));
    } catch (e) {
        console.error('Build failed:', e.message);
        process.exit(1);
    }
}

export async function serve(projectRoot, options = {}) {
    const {
        host = process.env.GHOST_HOST || process.env.HOST || '127.0.0.1',
        port = null,
        metrics = false,
        jsonMetrics = false
    } = options;
    const resolvedPort = resolvePort(port, resolvePort(process.env.GHOST_PORT ?? process.env.PORT, 3000));

    console.log(`Starting Ghost dev server at ${projectRoot}...`);

    const esbuild = await import('esbuild').catch(() => null);
    if (!esbuild) {
        await startFallbackRuntimeWatch(projectRoot, {
            outdir: 'dist/dev',
            label: 'Ghost Dev Server',
            host,
            port: resolvedPort,
            metrics,
            jsonMetrics
        });
        return;
    }

    const ctx = await esbuild.context({
        entryPoints: {
            bundle: join(projectRoot, 'src/index.js')
        },
        bundle: true,
        outdir: join(projectRoot, 'dist/dev'),
        format: 'esm',
        platform: 'browser',
        sourcemap: 'inline',  // inline source maps in dev for readable stack traces — 2026-04-06
        banner: {
            js: `new EventSource('/esbuild').onmessage = () => location.reload();`,
        },
    });

    await ctx.watch();

    const served = await ctx.serve({
        servedir: projectRoot,
        host,
        port: resolvedPort
    });

    const servedHost = served?.host || host;
    const servedPort = served?.port || resolvedPort;
    console.log(`Ghost Dev Server: http://${servedHost}:${servedPort}`);
    if (metrics) {
        printDevMetrics('Ghost Dev Server', {
            ...snapshotMemoryUsage(),
            watcherCount: 1,
            cacheHitRate: 'n/a',
            rebuildMs: 'n/a'
        }, jsonMetrics);
    }
}

export async function preview(projectRoot, options = {}) {
    const {
        host = '127.0.0.1',
        port = 4173
    } = options;

    const buildDir = join(projectRoot, 'dist/build');
    if (!existsSync(buildDir)) {
        await build(projectRoot);
    }

    return runStaticServer(projectRoot, {
        rootDir: projectRoot,
        host,
        port,
        label: 'Ghost Preview'
    });
}

export async function clean(projectRoot) {
    const targets = [
        join(projectRoot, 'dist/build'),
        join(projectRoot, 'dist/dev'),
        join(projectRoot, 'dist/watch'),
        join(projectRoot, '.ghost/cache'),
        join(projectRoot, '.ghost/manifests')
    ];

    for (const target of targets) {
        rmSync(target, { recursive: true, force: true });
    }

    console.log('Ghost clean: removed isolated runtime outputs and caches.');
}

export async function watch(projectRoot, options = {}) {
    const {
        host = process.env.GHOST_HOST || process.env.HOST || '127.0.0.1',
        port = null
    } = options;
    const resolvedPort = resolvePort(port, resolvePort(process.env.GHOST_PORT ?? process.env.PORT, 3000));

    console.log(`Watching Ghost project at ${projectRoot}...`);

    const esbuild = await import('esbuild').catch(() => null);
    if (!esbuild) {
        await startFallbackRuntimeWatch(projectRoot, {
            outdir: 'dist/watch',
            label: 'Ghost Watch',
            host,
            port: resolvedPort
        });
        console.log('Ghost Watch: output isolated to dist/watch/');
        return;
    }

    const ctx = await esbuild.context({
        entryPoints: {
            bundle: join(projectRoot, 'src/index.js')
        },
        bundle: true,
        outdir: join(projectRoot, 'dist/watch'),
        format: 'esm',
        platform: 'browser',
        sourcemap: true
    });

    await ctx.watch();
    console.log('Ghost Watch: output isolated to dist/watch/');
}
