import assert from 'node:assert/strict';
import { buildStarterCatalogData, buildHelpData } from './src/help-content.js';
import { getStarterNames, getStarterTemplate } from './src/starter-templates.js';

const requiredTemplates = [
    'blog',
    'admin-panel',
    'marketing-site',
    'app-shell',
    'finance-dashboard',
    'portfolio-modern',
    'react-dashboard',
    'vue-admin',
    'next-docs',
    'nuxt-portal',
    'svelte-studio',
    'angular-enterprise',
    'alpine-minimal',
    'preact-lite',
    'lit-ui'
];

function runStarterGalleryChecks() {
    const names = getStarterNames();

    assert.ok(names.length >= 40, `Expected at least 40 starter templates, found ${names.length}`);
    for (const name of requiredTemplates) {
        assert.ok(names.includes(name), `Missing starter template: ${name}`);
        const template = getStarterTemplate(name);
        assert.ok(template, `Starter template data missing for ${name}`);
        assert.ok(Object.keys(template.files ?? {}).length > 0, `Starter template ${name} has no files`);
    }

    const catalog = buildStarterCatalogData();
    assert.equal(catalog.source, 'starter-templates.js');
    assert.equal(catalog.templates.length, names.length);
    assert.ok(catalog.stacks.length >= 5, `Expected grouped starter stacks, found ${catalog.stacks.length}`);

    const help = buildHelpData({ topic: 'starter' });
    assert.equal(help.topic, 'starter');
    assert.ok(help.sections.some((section) => section.title === 'Starter templates'));

    const starterHelp = buildHelpData({ topic: 'starters' });
    assert.equal(starterHelp.topic, 'starters');
    assert.ok(starterHelp.sections.some((section) => section.title === 'Starter stacks'));
    assert.ok(starterHelp.catalog.stacks.some((stack) => stack.stack === 'react'));
}

try {
    runStarterGalleryChecks();
    console.log(`✅ Ghost CLI starter gallery checks passed (${getStarterNames().length} templates).`);
} catch (error) {
    console.error('❌ Ghost CLI starter gallery checks failed:', error.message);
    process.exit(1);
}
