// Ghost Size Monitor — updated 2026-04-06
// Uses actual gzip compression to verify the 5KB ceiling, not raw bytes.
import { readFileSync } from 'fs';
import { gzipSync } from 'zlib';

const MAX_GZIP_SIZE = 5 * 1024; // 5 KB gzipped — the hard ceiling

export function checkSize(filePath) {
    const content = readFileSync(filePath);
    const gzipped = gzipSync(content);
    const rawKB   = (content.length  / 1024).toFixed(2);
    const gzipKB  = (gzipped.length  / 1024).toFixed(2);

    console.log(`[Ghost Size Monitor] ${filePath}`);
    console.log(`  Raw:    ${rawKB} KB`);
    console.log(`  Gzip:   ${gzipKB} KB  (limit: 5.00 KB)`);

    if (gzipped.length > MAX_GZIP_SIZE) {
        const over = ((gzipped.length - MAX_GZIP_SIZE) / 1024).toFixed(2);
        console.warn(`  ⚠️  OVER LIMIT by ${over} KB — Ghost must stay under 5 KB gzipped!`);
        return false;
    }

    console.log(`  ✅ Within the 5 KB gzip ceiling.`);
    return true;
}
