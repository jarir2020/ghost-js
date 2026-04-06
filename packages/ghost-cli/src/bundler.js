// Ghost Bundler — updated 2026-04-06 (added ghostPlugin for .ghost templates, code splitting)
import { join } from 'path';
import { ghostAssetPlugin } from './asset-pipeline.js';
import { checkSize } from './size-monitor.js';
import { ghostPlugin } from '../../compiler/src/ghost-plugin.js';

export async function build(projectRoot, options = {}) {
    const {
        entryPoint = 'src/index.js',
        outfile = 'dist/bundle.js',
        minify = true,
        sourcemap = false  // 'inline' in dev, true (external) in prod — 2026-04-06
    } = options;

    const outPath = join(projectRoot, outfile);
    console.log(`Building Ghost project at ${projectRoot}...`);

    const esbuild = await import('esbuild').catch(() => null);
    if (!esbuild) {
        console.error('❌ Error: esbuild is not installed. Please run npm install.');
        process.exit(1);
    }

    try {
        await esbuild.build({
            entryPoints: {
                bundle: join(projectRoot, entryPoint)
            },
            bundle: true,
            outdir: join(projectRoot, 'dist'),
            minify,
            sourcemap,
            format: 'esm',
            platform: 'browser',
            splitting: true,           // enables lazyNode() code splitting
            plugins: [ghostPlugin(), ghostAssetPlugin()],
            loader: { '.js': 'jsx', '.png': 'file', '.jpg': 'file' },
        });
        console.log('Build completed successfully!');
        checkSize(join(projectRoot, 'dist/bundle.js'));
    } catch (e) {
        console.error('Build failed:', e.message);
        process.exit(1);
    }
}

export async function serve(projectRoot) {
    console.log(`Starting Ghost dev server at ${projectRoot}...`);

    const esbuild = await import('esbuild').catch(() => null);
    if (!esbuild) {
        console.error('❌ Error: esbuild is not installed. Please run npm install.');
        process.exit(1);
    }

    const ctx = await esbuild.context({
        entryPoints: {
            bundle: join(projectRoot, 'src/index.js')
        },
        bundle: true,
        outdir: join(projectRoot, 'dist'),
        format: 'esm',
        platform: 'browser',
        sourcemap: 'inline',  // inline source maps in dev for readable stack traces — 2026-04-06
        banner: {
            js: `new EventSource('/esbuild').onmessage = () => location.reload();`,
        },
    });

    await ctx.watch();

    const { host, port } = await ctx.serve({
        servedir: projectRoot,
        port: 3000
    });

    console.log(`Ghost Dev Server: http://${host}:${port}`);
}
