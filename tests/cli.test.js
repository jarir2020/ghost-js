import { checkSize } from '../packages/ghost-cli/src/size-monitor.js';
import { ghostAssetPlugin } from '../packages/ghost-cli/src/asset-pipeline.js';
import { writeFileSync, unlinkSync } from 'fs';

export function testCLI() {
    console.log('--- Testing CLI Infrastructure ---');

    // 1. Size Monitor
    const testFile = 'size-test.txt';
    writeFileSync(testFile, 'Ghost'.repeat(1000)); // ~5KB

    console.log('Verifying size monitor (should pass or warn)...');
    checkSize(testFile);
    unlinkSync(testFile);

    // 2. Asset Pipeline
    const plugin = ghostAssetPlugin();
    if (plugin.name !== 'ghost-assets') {
        throw new Error('Asset plugin identification failed');
    }

    console.log('✅ CLI infrastructure tests passed!');
}
