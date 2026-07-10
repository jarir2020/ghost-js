import { mkdtempSync, mkdirSync, rmSync, writeFileSync, existsSync, readFileSync } from 'fs';
import { execFileSync, spawn } from 'child_process';
import { request } from 'http';
import { tmpdir } from 'os';
import { join } from 'path';

function waitForPreviewPort(child) {
    return new Promise((resolve, reject) => {
        let buffer = '';

        const onData = (chunk) => {
            buffer += chunk.toString();
            const match = buffer.match(/Ghost Preview:\s+http:\/\/127\.0\.0\.1:(\d+)/);
            if (match) {
                cleanup();
                resolve(Number(match[1]));
            }
        };

        const onExit = (code) => {
            cleanup();
            reject(new Error(`ghost start exited before the preview server was ready (code ${code})`));
        };

        const cleanup = () => {
            child.stdout.off('data', onData);
            child.stderr.off('data', onData);
            child.off('exit', onExit);
        };

        child.stdout.on('data', onData);
        child.stderr.on('data', onData);
        child.on('exit', onExit);
    });
}

function waitForServerPort(child, label) {
    return new Promise((resolve, reject) => {
        let buffer = '';
        const pattern = new RegExp(`${label}:\\s+http://127\\.0\\.0\\.1:(\\d+)`);

        const onData = (chunk) => {
            buffer += chunk.toString();
            const match = buffer.match(pattern);
            if (match) {
                cleanup();
                resolve(Number(match[1]));
            }
        };

        const onExit = (code) => {
            cleanup();
            reject(new Error(`${label.toLowerCase()} exited before the server was ready (code ${code})`));
        };

        const cleanup = () => {
            child.stdout.off('data', onData);
            child.stderr.off('data', onData);
            child.off('exit', onExit);
        };

        child.stdout.on('data', onData);
        child.stderr.on('data', onData);
        child.on('exit', onExit);
    });
}

function waitForOutput(child, expectedText) {
    return new Promise((resolve, reject) => {
        let buffer = '';

        const onData = (chunk) => {
            buffer += chunk.toString();
            if (buffer.includes(expectedText)) {
                cleanup();
                resolve(buffer);
            }
        };

        const onExit = (code) => {
            cleanup();
            reject(new Error(`process exited before output "${expectedText}" was observed (code ${code})`));
        };

        const cleanup = () => {
            child.stdout.off('data', onData);
            child.stderr.off('data', onData);
            child.off('exit', onExit);
        };

        child.stdout.on('data', onData);
        child.stderr.on('data', onData);
        child.on('exit', onExit);
    });
}

function waitForWatchServerReady(child) {
    return new Promise((resolve, reject) => {
        let buffer = '';
        let resolvedPort = null;
        let sawReadyLine = false;

        const finishIfReady = () => {
            if (resolvedPort !== null && sawReadyLine) {
                cleanup();
                resolve(resolvedPort);
            }
        };

        const onData = (chunk) => {
            buffer += chunk.toString();

            const portMatch = buffer.match(/Ghost Watch:\s+http:\/\/127\.0\.0\.1:(\d+)/);
            if (portMatch) {
                resolvedPort = Number(portMatch[1]);
                finishIfReady();
            }

            if (buffer.includes('Ghost Watch: output isolated to dist/watch/')) {
                sawReadyLine = true;
                finishIfReady();
            }
        };

        const onExit = (code) => {
            cleanup();
            reject(new Error(`ghost watch exited before the watcher was ready (code ${code})`));
        };

        const cleanup = () => {
            child.stdout.off('data', onData);
            child.stderr.off('data', onData);
            child.off('exit', onExit);
        };

        child.stdout.on('data', onData);
        child.stderr.on('data', onData);
        child.on('exit', onExit);
    });
}

function fetchText(url) {
    return new Promise((resolve, reject) => {
        request(url, (res) => {
            let body = '';
            res.setEncoding('utf8');
            res.on('data', (chunk) => {
                body += chunk;
            });
            res.on('end', () => resolve({ statusCode: res.statusCode, body }));
        }).on('error', reject).end();
    });
}

function waitForBundleUpdate(filePath, expectedText, timeoutMs = 5000) {
    return new Promise((resolve, reject) => {
        const startedAt = Date.now();
        const tick = () => {
            try {
                const body = readFileSync(filePath, 'utf8');
                if (body.includes(expectedText)) {
                    resolve(body);
                    return;
                }
            } catch {
                // Keep waiting.
            }

            if (Date.now() - startedAt > timeoutMs) {
                reject(new Error(`Timed out waiting for ${filePath} to include ${expectedText}`));
                return;
            }

            setTimeout(tick, 100);
        };

        tick();
    });
}

export async function testRuntimeCommands() {
    console.log('--- Testing Runtime Commands ---');

    const cliPath = join(process.cwd(), 'packages', 'ghost-cli', 'src', 'cli.js');
    const tempRoots = [];

    try {
        const startRoot = mkdtempSync(join(tmpdir(), 'ghost-runtime-start-'));
        tempRoots.push(startRoot);
        mkdirSync(join(startRoot, 'src'), { recursive: true });
        writeFileSync(join(startRoot, 'src', 'index.js'), `console.log('hello from runtime test');\n`);
        writeFileSync(join(startRoot, 'index.html'), `<!doctype html>\n<html lang="en">\n<head><meta charset="utf-8"><title>Ghost Runtime Test</title></head>\n<body>\n    <main id="app">Runtime Test</main>\n    <script type="module" src="/dist/build/bundle.js"></script>\n</body>\n</html>\n`);

        const child = spawn('node', [cliPath, 'start', '--port=0'], {
            cwd: startRoot,
            stdio: ['ignore', 'pipe', 'pipe']
        });

        const port = await waitForPreviewPort(child);
        const rootResponse = await fetchText(`http://127.0.0.1:${port}/`);
        if (rootResponse.statusCode !== 200 || !rootResponse.body.includes('Runtime Test')) {
            child.kill('SIGTERM');
            throw new Error('ghost start did not serve the project index');
        }

        const bundleResponse = await fetchText(`http://127.0.0.1:${port}/dist/build/bundle.js`);
        if (bundleResponse.statusCode !== 200 || !bundleResponse.body.includes('hello from runtime test')) {
            child.kill('SIGTERM');
            throw new Error('ghost start did not serve the built bundle');
        }

        child.kill('SIGTERM');
        await new Promise((resolve) => child.once('exit', resolve));

        const distBuildPath = join(startRoot, 'dist', 'build');
        if (!existsSync(distBuildPath)) {
            throw new Error('ghost start did not create the isolated build output');
        }

        const devRoot = mkdtempSync(join(tmpdir(), 'ghost-runtime-dev-'));
        tempRoots.push(devRoot);
        mkdirSync(join(devRoot, 'src'), { recursive: true });
        writeFileSync(join(devRoot, 'src', 'index.js'), `console.log('hello from dev runtime test');\n`);
        writeFileSync(join(devRoot, 'index.html'), `<!doctype html>\n<html lang="en">\n<head><meta charset="utf-8"><title>Ghost Dev Runtime Test</title></head>\n<body>\n    <main id="app">Dev Runtime Test</main>\n    <script type="module" src="/dist/dev/bundle.js"></script>\n</body>\n</html>\n`);

        const customDevPort = 0;
        const devChild = spawn('node', [cliPath, 'dev', `--port=${customDevPort}`], {
            cwd: devRoot,
            stdio: ['ignore', 'pipe', 'pipe']
        });

        const devPort = await waitForServerPort(devChild, 'Ghost Dev Server');
        if (devPort === 3000 || devPort <= 0) {
            devChild.kill('SIGTERM');
            throw new Error(`ghost dev still appears to be pinned to the default port (got ${devPort})`);
        }

        const devResponse = await fetchText(`http://127.0.0.1:${devPort}/`);
        if (devResponse.statusCode !== 200 || !devResponse.body.includes('Dev Runtime Test')) {
            devChild.kill('SIGTERM');
            throw new Error('ghost dev did not serve the dev index');
        }

        const devBundleResponse = await fetchText(`http://127.0.0.1:${devPort}/dist/dev/bundle.js`);
        if (devBundleResponse.statusCode !== 200 || !devBundleResponse.body.includes('hello from dev runtime test')) {
            devChild.kill('SIGTERM');
            throw new Error('ghost dev did not serve the dev bundle');
        }

        devChild.kill('SIGTERM');
        await new Promise((resolve) => devChild.once('exit', resolve));

        const metricsRoot = mkdtempSync(join(tmpdir(), 'ghost-runtime-metrics-'));
        tempRoots.push(metricsRoot);
        mkdirSync(join(metricsRoot, 'src'), { recursive: true });
        writeFileSync(join(metricsRoot, 'src', 'index.js'), `console.log('hello from metrics runtime test');\n`);
        writeFileSync(join(metricsRoot, 'index.html'), `<!doctype html>\n<html lang="en">\n<head><meta charset="utf-8"><title>Ghost Metrics Runtime Test</title></head>\n<body>\n    <main id="app">Metrics Runtime Test</main>\n    <script type="module" src="/dist/dev/bundle.js"></script>\n</body>\n</html>\n`);

        const metricsChild = spawn('node', [cliPath, 'dev', '--metrics'], {
            cwd: metricsRoot,
            stdio: ['ignore', 'pipe', 'pipe']
        });

        const [metricsPort, metricsLog] = await Promise.all([
            waitForServerPort(metricsChild, 'Ghost Dev Server'),
            waitForOutput(metricsChild, 'Last Rebuild:')
        ]);

        const metricsResponse = await fetchText(`http://127.0.0.1:${metricsPort}/`);
        if (metricsResponse.statusCode !== 200 || !metricsResponse.body.includes('Metrics Runtime Test')) {
            metricsChild.kill('SIGTERM');
            throw new Error('ghost dev --metrics did not serve the metrics index');
        }

        if (!metricsLog.includes('Heap Used:') || !metricsLog.includes('Watchers:') || !metricsLog.includes('Cache Hit Rate:') || !metricsLog.includes('Last Rebuild:')) {
            metricsChild.kill('SIGTERM');
            throw new Error('ghost dev --metrics did not print the expected runtime snapshot fields');
        }

        metricsChild.kill('SIGTERM');
        await new Promise((resolve) => metricsChild.once('exit', resolve));

        const watchRoot = mkdtempSync(join(tmpdir(), 'ghost-runtime-watch-'));
        tempRoots.push(watchRoot);
        mkdirSync(join(watchRoot, 'src'), { recursive: true });
        writeFileSync(join(watchRoot, 'src', 'index.js'), `console.log('hello from watch runtime test v1');\n`);
        writeFileSync(join(watchRoot, 'index.html'), `<!doctype html>\n<html lang="en">\n<head><meta charset="utf-8"><title>Ghost Watch Runtime Test</title></head>\n<body>\n    <main id="app">Watch Runtime Test</main>\n    <script type="module" src="/dist/watch/bundle.js"></script>\n</body>\n</html>\n`);

        const watchChild = spawn('node', [cliPath, 'watch'], {
            cwd: watchRoot,
            stdio: ['ignore', 'pipe', 'pipe']
        });

        const watchPort = await waitForWatchServerReady(watchChild);

        const watchResponse = await fetchText(`http://127.0.0.1:${watchPort}/`);
        if (watchResponse.statusCode !== 200 || !watchResponse.body.includes('Watch Runtime Test')) {
            watchChild.kill('SIGTERM');
            throw new Error('ghost watch did not serve the watch index');
        }

        const watchBundlePath = join(watchRoot, 'dist', 'watch', 'bundle.js');
        await waitForBundleUpdate(watchBundlePath, 'hello from watch runtime test v1');

        writeFileSync(join(watchRoot, 'src', 'index.js'), `console.log('hello from watch runtime test v2');\n`);
        await waitForBundleUpdate(watchBundlePath, 'hello from watch runtime test v2');

        watchChild.kill('SIGTERM');
        await new Promise((resolve) => watchChild.once('exit', resolve));

        const cleanRoot = mkdtempSync(join(tmpdir(), 'ghost-runtime-clean-'));
        tempRoots.push(cleanRoot);
        mkdirSync(join(cleanRoot, 'dist', 'build'), { recursive: true });
        mkdirSync(join(cleanRoot, 'dist', 'dev'), { recursive: true });
        mkdirSync(join(cleanRoot, 'dist', 'watch'), { recursive: true });
        mkdirSync(join(cleanRoot, '.ghost', 'cache'), { recursive: true });
        mkdirSync(join(cleanRoot, '.ghost', 'manifests'), { recursive: true });
        writeFileSync(join(cleanRoot, 'dist', 'dev', 'dev.txt'), 'dev');
        writeFileSync(join(cleanRoot, 'dist', 'watch', 'watch.txt'), 'watch');
        writeFileSync(join(cleanRoot, '.ghost', 'cache', 'cache.txt'), 'cache');
        writeFileSync(join(cleanRoot, '.ghost', 'manifests', 'manifest.txt'), 'manifest');

        execFileSync('node', [cliPath, 'clean'], {
            cwd: cleanRoot,
            encoding: 'utf8'
        });

        const removedPaths = [
            join(cleanRoot, 'dist', 'build'),
            join(cleanRoot, 'dist', 'dev'),
            join(cleanRoot, 'dist', 'watch'),
            join(cleanRoot, '.ghost', 'cache'),
            join(cleanRoot, '.ghost', 'manifests')
        ];

        for (const target of removedPaths) {
            if (existsSync(target)) {
                throw new Error(`ghost clean did not remove ${target}`);
            }
        }

        console.log('✅ Runtime commands tests passed!');
    } finally {
        for (const rootDir of tempRoots) {
            rmSync(rootDir, { recursive: true, force: true });
        }
    }
}
