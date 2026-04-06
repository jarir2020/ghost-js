#!/usr/bin/env node
// Ghost Bundle Size Checker — 2026-04-06
// Builds the Ghost core bundle with esbuild and verifies it stays under 5 KB gzipped.
// Run: node scripts/check-bundle-size.js

import { build } from 'esbuild';
import { gzipSync } from 'zlib';
import { readFileSync, rmSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = join(__dirname, '..');
const OUTFILE   = join(ROOT, '.size-check', 'core.bundle.js');
const MAX_BYTES = 5 * 1024; // 5 KB

// Ensure output dir
mkdirSync(join(ROOT, '.size-check'), { recursive: true });

console.log('🔨 Building Ghost core for size check...');

try {
    await build({
        entryPoints: [join(ROOT, 'packages/core/src/index.js')],
        bundle:    true,
        minify:    true,
        format:    'esm',
        platform:  'browser',
        outfile:   OUTFILE,
        // Stub browser globals so tree-shaking works cleanly
        define: { 'window': 'globalThis', 'document': 'globalThis' },
        logLevel: 'silent',
    });
} catch (e) {
    console.error('❌ Build failed:', e.message);
    process.exit(1);
}

const raw    = readFileSync(OUTFILE);
const zipped = gzipSync(raw);

const rawKB  = (raw.length    / 1024).toFixed(2);
const zipKB  = (zipped.length / 1024).toFixed(2);

console.log(`\n📦 Ghost Core Bundle`);
console.log(`   Raw:    ${rawKB} KB`);
console.log(`   Gzipped: ${zipKB} KB  (limit: 5.00 KB)`);

// Cleanup
rmSync(join(ROOT, '.size-check'), { recursive: true, force: true });

if (zipped.length > MAX_BYTES) {
    const over = ((zipped.length - MAX_BYTES) / 1024).toFixed(2);
    console.error(`\n❌ OVER LIMIT by ${over} KB — Ghost core must stay under 5 KB gzipped!`);
    process.exit(1);
}

console.log(`\n✅ Within the 5 KB gzip ceiling. Ghost stays invisible.`);
