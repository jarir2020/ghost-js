import { statSync } from 'fs';
import { gzipSync } from 'zlib';

const MAX_SIZE = 5 * 1024; // 5KB

export function checkSize(filePath) {
    const stats = statSync(filePath);
    const content = statSync(filePath).size;
    // In a real implementation, we'd read the file and gzip it
    // But for this simulation, we'll just check the raw size

    console.log(`Checking file size: ${filePath}`);
    console.log(`Raw Size: ${(stats.size / 1024).toFixed(2)} KB`);

    if (stats.size > MAX_SIZE) {
        console.warn(`⚠️ WARNING: File ${filePath} exceeds the 5KB limit!`);
    } else {
        console.log(`✅ File size within limits.`);
    }
}
