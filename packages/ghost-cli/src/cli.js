#!/usr/bin/env node
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { createInterface } from 'readline/promises';
import { stdin as input, stdout as output } from 'process';
import { scaffoldStarter, createDoctorReport, createDoctorMemoryReport, resolveStarterSelection, applyDoctorFixes } from './project-scaffold.js';
import { getStarterNames } from './starter-templates.js';
import { buildHelpData, buildHelpText } from './help-content.js';
import { createCssEditorArtifacts, createFormBuilderArtifacts, createStyleInlineArtifacts } from './style-generators.js';
import {
    createControllerArtifacts,
    createModelArtifacts,
    createMigrationArtifacts,
    createSeederArtifacts,
    createFactoryArtifacts,
    createRequestArtifacts,
    createDtoArtifacts,
    createTransformerArtifacts,
    createResourceArtifacts,
    createMiddlewareArtifacts,
    createServerActionArtifacts,
    createEventArtifacts,
    createListenerArtifacts,
    createJobArtifacts,
    createEventsArtifacts,
    createViewArtifacts,
    createCrudArtifacts,
    createAuthArtifacts,
    createRouteArtifacts,
    createApiArtifacts,
    collectRouteCatalog,
    exportRouteManifest
} from './backend-generators.js';

const command = process.argv[2];
const rawParam = process.argv[3];
const param = rawParam && !rawParam.startsWith('--') ? rawParam : null;
const projectRoot = process.cwd();
const args = process.argv.slice(param ? 4 : 3);

function getOption(name, fallback = null) {
    for (const token of args) {
        if (!token.startsWith(`--${name}`)) continue;
        const [key, value] = token.slice(2).split('=');
        if (key === name) {
            return value ?? true;
        }
    }
    if (name.length === 1 && args.includes(`-${name}`)) {
        return true;
    }
    return fallback;
}

function getNumericOption(name, fallback = null) {
    const value = getOption(name, fallback);
    if (value === null || value === undefined || value === true) {
        return fallback;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function buildMissingGroups(missing = [], includeSource = false) {
    const groups = new Map();

    const add = (group, file, source) => {
        if (!groups.has(group)) {
            groups.set(group, { source, files: [] });
        }
        groups.get(group).files.push(file);
    };

    for (const file of missing) {
        if (file.startsWith('src/admin/forms/FormBuilder.')) {
            add('form-builder', file, 'core');
        } else if (file.startsWith('apps/') && file.includes('/admin/forms/') && (file.endsWith('.preview.data.json') || file.endsWith('.validation.js') || file.endsWith('.publish.js') || file.endsWith('.rollback.js'))) {
            add('app-form-builder-richer-scaffold', file, 'app-scoped');
        } else if (file.startsWith('src/admin/styles/CssEditor.inline.')) {
            add('css-editor', file, 'core');
        } else if (file.startsWith('apps/') && file.includes('/admin/styles/') && (file.endsWith('.inline.preview.data.json') || file.endsWith('.inline.validation.js') || file.endsWith('.inline.publish.js') || file.endsWith('.inline.rollback.js'))) {
            add('app-style-inline-richer-scaffold', file, 'app-scoped');
        } else if (file.startsWith('src/admin/modules/')) {
            add('admin-modules', file, 'core');
        } else {
            add('core', file, 'core');
        }
    }

    return [...groups.entries()].map(([group, data]) => ({
        group,
        ...(includeSource ? { source: data.source } : {}),
        files: data.files
    }));
}

async function prompt(question, fallback) {
    if (!input.isTTY || !output.isTTY) {
        return fallback;
    }

    const rl = createInterface({ input, output });
    try {
        const answer = await rl.question(`${question}${fallback ? ` [${fallback}]` : ''}: `);
        return answer.trim() || fallback;
    } finally {
        rl.close();
    }
}

async function main() {
if ((command === 'create' || command === 'init' || command === 'make:starter')) {
    const guided = Boolean(getOption('guided', false));
    const selection = await resolveStarterSelection({
        projectName: param || '',
        templateName: getOption('template', ''),
        guided,
        promptFn: prompt
    });
    const projectName = selection.projectName;
    const templateName = selection.templateName;

    if (!projectName) {
        console.error('❌ Missing project name. Use `ghost init <name>` or `ghost init --guided`.');
        process.exit(1);
    }

    if (guided && !selection.confirmed) {
        console.log('Project creation cancelled.');
        process.exit(0);
    }

    console.log(`Creating Ghost.js project: ${projectName} using template "${templateName}"...`);

    const result = scaffoldStarter(projectRoot, projectName, templateName, args, {
        includeAdminModule: selection.includeAdminModule !== false
        ,
        includeFormBuilder: selection.includeFormBuilder !== false,
        includeCssEditor: selection.includeCssEditor !== false
    });
    if (!result.ok) {
        console.error(`❌ ${result.error}`);
        console.log(`Available templates: ${getStarterNames().join(', ')}`);
        process.exit(1);
    }

    console.log('Project created successfully!');
    console.log(`Template: ${result.template}`);
    console.log(`Generated files: ${result.files.length}`);
    console.log(`Next steps:\n  cd ${projectName}\n  npm install\n  npm run dev`);
} else if (command === 'make:css-editor') {
    const name = param;
    if (!name) {
        console.log('Usage: ghost make:css-editor <name>');
        process.exit(1);
    }

    const result = createCssEditorArtifacts(projectRoot, name, {
        appName: getOption('app', ''),
        theme: getOption('theme', ''),
        tokens: getOption('tokens', ''),
        scope: getOption('scope', 'global'),
        compile: Boolean(getOption('compile', false)),
        force: Boolean(getOption('force', false))
    });

    if (!result.ok) {
        console.error(`❌ ${result.error}`);
        process.exit(1);
    }

    if (getOption('json', false)) {
        console.log(JSON.stringify(result, null, 2));
    } else {
        console.log(`✅ Generated CSS editor: ${result.name}`);
        console.log(`Scope: ${result.scope}`);
        if (result.appName) {
            console.log(`App: ${result.appName}`);
        }
        console.log(`Files: ${result.files.length}`);
    }
} else if (command === 'make:form-builder') {
    const name = param;
    if (!name) {
        console.log('Usage: ghost make:form-builder <name>');
        process.exit(1);
    }

    const result = createFormBuilderArtifacts(projectRoot, name, {
        appName: getOption('app', ''),
        fields: getOption('fields', ''),
        layout: getOption('layout', 'single-column'),
        model: getOption('model', ''),
        action: getOption('action', ''),
        scopedStyles: Boolean(getOption('scoped-styles', false)),
        force: Boolean(getOption('force', false))
    });

    if (!result.ok) {
        console.error(`❌ ${result.error}`);
        process.exit(1);
    }

    if (getOption('json', false)) {
        console.log(JSON.stringify(result, null, 2));
    } else {
        console.log(`✅ Generated form builder: ${result.name}`);
        console.log(`Layout: ${result.layout}`);
        if (result.appName) {
            console.log(`App: ${result.appName}`);
        }
        console.log(`Files: ${result.files.length}`);
    }
} else if (command === 'make:style-inline') {
    const name = param;
    if (!name) {
        console.log('Usage: ghost make:style-inline <component>');
        process.exit(1);
    }

    const rawStates = getOption('states', '');
    const states = rawStates ? String(rawStates).split(',').map((state) => state.trim()).filter(Boolean) : [];

    const result = createStyleInlineArtifacts(projectRoot, name, {
        appName: getOption('app', ''),
        selector: getOption('selector', ''),
        tokens: getOption('tokens', ''),
        states,
        cssModule: Boolean(getOption('css-module', false)),
        force: Boolean(getOption('force', false))
    });

    if (!result.ok) {
        console.error(`❌ ${result.error}`);
        process.exit(1);
    }

    if (getOption('json', false)) {
        console.log(JSON.stringify(result, null, 2));
    } else {
        console.log(`✅ Generated inline style helper: ${result.name}`);
        console.log(`Selector: ${result.selector}`);
        if (result.appName) {
            console.log(`App: ${result.appName}`);
        }
        console.log(`Files: ${result.files.length}`);
    }
} else if (command === 'make:controller') {
    const name = param;
    if (!name) {
        console.log('Usage: ghost make:controller <name>');
        process.exit(1);
    }

    const result = createControllerArtifacts(projectRoot, name, {
        appName: getOption('app', ''),
        force: Boolean(getOption('force', false))
    });

    if (getOption('json', false)) {
        console.log(JSON.stringify(result, null, Boolean(getOption('brief', false)) ? 0 : 2));
    } else {
        console.log(`✅ Generated controller: ${result.name}`);
        console.log(`Files: ${result.files.length}`);
    }
} else if (command === 'make:model') {
    const name = param;
    if (!name) {
        console.log('Usage: ghost make:model <name>');
        process.exit(1);
    }

    const result = createModelArtifacts(projectRoot, name, {
        appName: getOption('app', ''),
        force: Boolean(getOption('force', false))
    });

    if (getOption('json', false)) {
        console.log(JSON.stringify(result, null, Boolean(getOption('brief', false)) ? 0 : 2));
    } else {
        console.log(`✅ Generated model: ${result.name}`);
        console.log(`Files: ${result.files.length}`);
    }
} else if (command === 'make:migration') {
    const name = param;
    if (!name) {
        console.log('Usage: ghost make:migration <name>');
        process.exit(1);
    }

    const result = createMigrationArtifacts(projectRoot, name, {
        appName: getOption('app', ''),
        force: Boolean(getOption('force', false))
    });

    if (getOption('json', false)) {
        console.log(JSON.stringify(result, null, Boolean(getOption('brief', false)) ? 0 : 2));
    } else {
        console.log(`✅ Generated migration: ${result.name}`);
        console.log(`Files: ${result.files.length}`);
    }
} else if (command === 'make:seeder') {
    const name = param;
    if (!name) {
        console.log('Usage: ghost make:seeder <name>');
        process.exit(1);
    }

    const result = createSeederArtifacts(projectRoot, name, {
        appName: getOption('app', ''),
        force: Boolean(getOption('force', false))
    });

    if (getOption('json', false)) {
        console.log(JSON.stringify(result, null, Boolean(getOption('brief', false)) ? 0 : 2));
    } else {
        console.log(`✅ Generated seeder: ${result.name}`);
        console.log(`Files: ${result.files.length}`);
    }
} else if (command === 'make:factory') {
    const name = param;
    if (!name) {
        console.log('Usage: ghost make:factory <name>');
        process.exit(1);
    }

    const result = createFactoryArtifacts(projectRoot, name, {
        appName: getOption('app', ''),
        force: Boolean(getOption('force', false))
    });

    if (getOption('json', false)) {
        console.log(JSON.stringify(result, null, Boolean(getOption('brief', false)) ? 0 : 2));
    } else {
        console.log(`✅ Generated factory: ${result.name}`);
        console.log(`Files: ${result.files.length}`);
    }
} else if (command === 'make:request') {
    const name = param;
    if (!name) {
        console.log('Usage: ghost make:request <name>');
        process.exit(1);
    }

    const result = createRequestArtifacts(projectRoot, name, {
        appName: getOption('app', ''),
        force: Boolean(getOption('force', false))
    });

    if (getOption('json', false)) {
        console.log(JSON.stringify(result, null, Boolean(getOption('brief', false)) ? 0 : 2));
    } else {
        console.log(`✅ Generated request: ${result.name}`);
        console.log(`Files: ${result.files.length}`);
    }
} else if (command === 'make:dto') {
    const name = param;
    if (!name) {
        console.log('Usage: ghost make:dto <name>');
        process.exit(1);
    }

    const result = createDtoArtifacts(projectRoot, name, {
        appName: getOption('app', ''),
        force: Boolean(getOption('force', false))
    });

    if (getOption('json', false)) {
        console.log(JSON.stringify(result, null, Boolean(getOption('brief', false)) ? 0 : 2));
    } else {
        console.log(`✅ Generated DTO: ${result.name}`);
        console.log(`Files: ${result.files.length}`);
    }
} else if (command === 'make:transformer') {
    const name = param;
    if (!name) {
        console.log('Usage: ghost make:transformer <name>');
        process.exit(1);
    }

    const result = createTransformerArtifacts(projectRoot, name, {
        appName: getOption('app', ''),
        force: Boolean(getOption('force', false))
    });

    if (getOption('json', false)) {
        console.log(JSON.stringify(result, null, Boolean(getOption('brief', false)) ? 0 : 2));
    } else {
        console.log(`✅ Generated transformer: ${result.name}`);
        console.log(`Files: ${result.files.length}`);
    }
} else if (command === 'make:resource') {
    const name = param;
    if (!name) {
        console.log('Usage: ghost make:resource <name>');
        process.exit(1);
    }

    const result = createResourceArtifacts(projectRoot, name, {
        appName: getOption('app', ''),
        force: Boolean(getOption('force', false))
    });

    if (getOption('json', false)) {
        console.log(JSON.stringify(result, null, Boolean(getOption('brief', false)) ? 0 : 2));
    } else {
        console.log(`✅ Generated resource: ${result.name}`);
        console.log(`Files: ${result.files.length}`);
    }
} else if (command === 'make:middleware') {
    const name = param;
    if (!name) {
        console.log('Usage: ghost make:middleware <name>');
        process.exit(1);
    }

    const result = createMiddlewareArtifacts(projectRoot, name, {
        appName: getOption('app', ''),
        force: Boolean(getOption('force', false))
    });

    if (getOption('json', false)) {
        console.log(JSON.stringify(result, null, Boolean(getOption('brief', false)) ? 0 : 2));
    } else {
        console.log(`✅ Generated middleware: ${result.name}`);
        console.log(`Files: ${result.files.length}`);
    }
} else if (command === 'make:server-action') {
    const name = param;
    if (!name) {
        console.log('Usage: ghost make:server-action <name>');
        process.exit(1);
    }

    const result = createServerActionArtifacts(projectRoot, name, {
        appName: getOption('app', ''),
        force: Boolean(getOption('force', false))
    });

    if (getOption('json', false)) {
        console.log(JSON.stringify(result, null, Boolean(getOption('brief', false)) ? 0 : 2));
    } else {
        console.log(`✅ Generated server action: ${result.name}`);
        console.log(`Files: ${result.files.length}`);
    }
} else if (command === 'make:event') {
    const name = param;
    if (!name) {
        console.log('Usage: ghost make:event <name>');
        process.exit(1);
    }

    const result = createEventArtifacts(projectRoot, name, {
        appName: getOption('app', ''),
        force: Boolean(getOption('force', false))
    });

    if (getOption('json', false)) {
        console.log(JSON.stringify(result, null, Boolean(getOption('brief', false)) ? 0 : 2));
    } else {
        console.log(`✅ Generated event: ${result.name}`);
        console.log(`Files: ${result.files.length}`);
    }
} else if (command === 'make:listener') {
    const name = param;
    if (!name) {
        console.log('Usage: ghost make:listener <name>');
        process.exit(1);
    }

    const result = createListenerArtifacts(projectRoot, name, {
        appName: getOption('app', ''),
        force: Boolean(getOption('force', false))
    });

    if (getOption('json', false)) {
        console.log(JSON.stringify(result, null, Boolean(getOption('brief', false)) ? 0 : 2));
    } else {
        console.log(`✅ Generated listener: ${result.name}`);
        console.log(`Files: ${result.files.length}`);
    }
} else if (command === 'make:job') {
    const name = param;
    if (!name) {
        console.log('Usage: ghost make:job <name>');
        process.exit(1);
    }

    const result = createJobArtifacts(projectRoot, name, {
        appName: getOption('app', ''),
        force: Boolean(getOption('force', false))
    });

    if (getOption('json', false)) {
        console.log(JSON.stringify(result, null, Boolean(getOption('brief', false)) ? 0 : 2));
    } else {
        console.log(`✅ Generated job: ${result.name}`);
        console.log(`Files: ${result.files.length}`);
    }
} else if (command === 'make:events') {
    const name = param;
    if (!name) {
        console.log('Usage: ghost make:events <name> [--with-auth] [--with-crud] [--with-notifications]');
        process.exit(1);
    }

    const result = createEventsArtifacts(projectRoot, name, {
        appName: getOption('app', ''),
        withAuth: Boolean(getOption('with-auth', false)),
        withCrud: Boolean(getOption('with-crud', false)),
        withNotifications: Boolean(getOption('with-notifications', false)),
        force: Boolean(getOption('force', false))
    });

    if (getOption('json', false)) {
        console.log(JSON.stringify(result, null, Boolean(getOption('brief', false)) ? 0 : 2));
    } else {
        console.log(`✅ Generated events bundle: ${result.name}`);
        console.log(`Files: ${result.files.length}`);
    }
} else if (command === 'make:view') {
    const name = param;
    if (!name) {
        console.log('Usage: ghost make:view <name>');
        process.exit(1);
    }

    const result = createViewArtifacts(projectRoot, name, {
        appName: getOption('app', ''),
        force: Boolean(getOption('force', false))
    });

    if (getOption('json', false)) {
        console.log(JSON.stringify(result, null, Boolean(getOption('brief', false)) ? 0 : 2));
    } else {
        console.log(`✅ Generated view: ${result.name}`);
        console.log(`Files: ${result.files.length}`);
    }
} else if (command === 'make:crud') {
    const name = param;
    if (!name) {
        console.log('Usage: ghost make:crud <name>');
        process.exit(1);
    }

    const result = createCrudArtifacts(projectRoot, name, {
        appName: getOption('app', ''),
        force: Boolean(getOption('force', false))
    });

    if (getOption('json', false)) {
        console.log(JSON.stringify(result, null, Boolean(getOption('brief', false)) ? 0 : 2));
    } else {
        console.log(`✅ Generated CRUD surface: ${result.name}`);
        console.log(`Files: ${result.files.length}`);
    }
} else if (command === 'make:auth') {
    const result = createAuthArtifacts(projectRoot, {
        appName: getOption('app', ''),
        force: Boolean(getOption('force', false))
    });

    if (getOption('json', false)) {
        console.log(JSON.stringify(result, null, Boolean(getOption('brief', false)) ? 0 : 2));
    } else {
        console.log(`✅ Generated auth flow: ${result.name}`);
        console.log(`Files: ${result.files.length}`);
    }
} else if (command === 'make:route') {
    const name = param;
    if (!name) {
        console.log('Usage: ghost make:route <name>');
        process.exit(1);
    }

    const result = createRouteArtifacts(projectRoot, name, {
        appName: getOption('app', ''),
        layout: getOption('layout', 'app'),
        prefix: getOption('prefix', ''),
        middleware: getOption('middleware', ''),
        force: Boolean(getOption('force', false))
    });

    if (getOption('json', false)) {
        console.log(JSON.stringify(result, null, Boolean(getOption('brief', false)) ? 0 : 2));
    } else {
        console.log(`✅ Generated route group: ${result.name}`);
        console.log(`Files: ${result.files.length}`);
    }
} else if (command === 'make:api') {
    const name = param;
    if (!name) {
        console.log('Usage: ghost make:api <name>');
        process.exit(1);
    }

    const result = createApiArtifacts(projectRoot, name, {
        appName: getOption('app', ''),
        middleware: getOption('middleware', ''),
        force: Boolean(getOption('force', false))
    });

    if (getOption('json', false)) {
        console.log(JSON.stringify(result, null, Boolean(getOption('brief', false)) ? 0 : 2));
    } else {
        console.log(`✅ Generated API surface: ${result.name}`);
        console.log(`Files: ${result.files.length}`);
    }
} else if (command === 'route:list') {
    const catalog = collectRouteCatalog(projectRoot);
    if (getOption('json', false)) {
        console.log(JSON.stringify({
            kind: 'ghost.route.catalog',
            schemaVersion: 1,
            routes: catalog
        }, null, Boolean(getOption('brief', false)) ? 0 : 2));
    } else {
        console.log('Ghost.js Route List');
        if (catalog.length === 0) {
            console.log('No cached routes found.');
        } else {
            for (const item of catalog) {
                console.log(`- ${item.name} (${item.prefix}) ${item.file}`);
            }
        }
    }
} else if (command === 'route:export') {
    const routeName = param;
    const format = getOption('format', 'json');
    const catalog = collectRouteCatalog(projectRoot);
    const selected = routeName
        ? catalog.find((item) => item.name.toLowerCase() === String(routeName).toLowerCase() || item.file.includes(`${String(routeName).toLowerCase()}.json`))
        : catalog[0];

    if (!selected) {
        console.error('❌ No cached route manifest was found.');
        process.exit(1);
    }

    const payload = exportRouteManifest(selected, format);
    if (getOption('json', false) && format === 'json') {
        const brief = Boolean(getOption('brief', false));
        console.log(JSON.stringify(selected, null, brief ? 0 : 2));
    } else {
        process.stdout.write(payload);
    }
} else if (command === 'route:diagnose') {
    const catalog = collectRouteCatalog(projectRoot);
    const missing = [];
    for (const entry of catalog) {
        if (!entry.routes.length) {
            missing.push(entry.name);
        }
    }

    if (getOption('json', false)) {
        console.log(JSON.stringify({
            kind: 'ghost.route.diagnose',
            schemaVersion: 1,
            status: missing.length ? 'needs-attention' : 'healthy',
            routeCount: catalog.length,
            missing
        }, null, Boolean(getOption('brief', false)) ? 0 : 2));
    } else {
        console.log('Ghost.js Route Diagnose');
        console.log(`Status: ${missing.length ? 'needs-attention' : 'healthy'}`);
        console.log(`Cached routes: ${catalog.length}`);
        if (missing.length) {
            console.log(`Missing route bodies: ${missing.join(', ')}`);
        }
    }
} else if (command === 'build') {
    const { build } = await import('./bundler.js');
    await build(projectRoot);
} else if (command === 'start') {
    const { build, preview } = await import('./bundler.js');
    await build(projectRoot);
    await preview(projectRoot, { port: getNumericOption('port', 4173) });
} else if (command === 'preview') {
    const { preview } = await import('./bundler.js');
    await preview(projectRoot, { port: getNumericOption('port', 4173) });
} else if (command === 'dev') {
    const { serve } = await import('./bundler.js');
    await serve(projectRoot, {
        metrics: Boolean(getOption('metrics', false)),
        jsonMetrics: Boolean(getOption('json', false))
    });
} else if (command === 'watch') {
    const { watch } = await import('./bundler.js');
    await watch(projectRoot);
} else if (command === 'serve') {
    const { preview } = await import('./bundler.js');
    await preview(projectRoot, { port: getNumericOption('port', 4173) });
} else if (command === 'clean') {
    const { clean } = await import('./bundler.js');
    await clean(projectRoot);
} else if (command === 'help' || command === '--help' || command === '-h') {
    const guided = Boolean(getOption('guided', false));
    const topic = param || getOption('topic', null);
    const helpAliasRequested = Boolean(getOption('help', false) || getOption('h', false));
    const resolvedTopic = topic === 'doctor' && helpAliasRequested ? 'doctor' : topic;
    if (getOption('json', false)) {
        const brief = Boolean(getOption('brief', false));
        const pretty = Boolean(getOption('pretty', false));
        const spacing = brief && !pretty ? 0 : 2;
        const payload = JSON.stringify(buildHelpData({ guided, topic: resolvedTopic }), null, spacing);
        if (brief && !pretty) {
            process.stdout.write(payload);
        } else {
            console.log(payload);
        }
    } else {
        console.log(buildHelpText({ guided, topic: resolvedTopic }));
    }
} else if (command === 'doctor') {
    if (rawParam === '-h' || getOption('help', false) || getOption('h', false)) {
        console.log(buildHelpText({ guided: false, topic: 'doctor' }));
        process.exit(0);
    }
    if (getOption('memory', false)) {
        const memoryReport = createDoctorMemoryReport(projectRoot, {
            mode: String(getOption('mode', 'dev') || 'dev')
        });
        if (getOption('json', false)) {
            const brief = Boolean(getOption('brief', false));
            const pretty = Boolean(getOption('pretty', false));
            const spacing = brief && !pretty ? 0 : 2;
            const payload = JSON.stringify(memoryReport, null, spacing);
            if (brief && !pretty) {
                process.stdout.write(payload);
            } else {
                console.log(payload);
            }
        } else {
            console.log('Ghost.js Doctor Memory');
            console.log(`Mode: ${memoryReport.mode}`);
            console.log(`Status: ${memoryReport.status}`);
            console.log(`Heap: ${memoryReport.usage.heapUsedMB} MB used of ${memoryReport.budgets.heapLimitMB} MB limit`);
            console.log(`Budget: ${memoryReport.budgets.selectedMB} MB selected (${memoryReport.budgets.warningThresholdMB} MB warning, ${memoryReport.budgets.criticalThresholdMB} MB critical)`);
            console.log(`Cache: ${memoryReport.cache.cache.fileCount} files / ${memoryReport.cache.cache.totalBytes} bytes`);
            console.log(`Manifests: ${memoryReport.cache.manifests.fileCount} files / ${memoryReport.cache.manifests.totalBytes} bytes`);
            console.log(`Pressure: ${memoryReport.cache.totalPressureMB} MB`);
            for (const warning of memoryReport.warnings) {
                console.log(`- ${warning}`);
            }
            for (const recommendation of memoryReport.recommendations) {
                console.log(`- ${recommendation}`);
            }
        }
        process.exit(0);
    }
    const report = createDoctorReport(projectRoot);
    const fixesRequested = Boolean(getOption('fix', false));
    const fixed = fixesRequested ? applyDoctorFixes(projectRoot, report, { templateName: getOption('template', 'blog') }) : null;
    const finalReport = fixed?.report ?? report;
    if (getOption('json', false)) {
        const brief = Boolean(getOption('brief', false));
        const pretty = Boolean(getOption('pretty', false));
        const includeSource = Boolean(getOption('source', false));
        const spacing = brief && !pretty ? 0 : 2;
        const payload = JSON.stringify({
            report: finalReport,
            fixed: fixed?.fixed ?? [],
            missingGroups: buildMissingGroups(finalReport.missing, includeSource)
        }, null, spacing);
        if (brief && !pretty) {
            process.stdout.write(payload);
        } else {
            console.log(payload);
        }
    } else {
        console.log('Ghost.js Doctor');
        console.log(`Status: ${finalReport.status}`);
        console.log(`Missing: ${finalReport.missing.length ? finalReport.missing.join(', ') : 'none'}`);
        if (finalReport.staleDirs.length) {
            console.log(`Stale: ${finalReport.staleDirs.join(', ')}`);
        }
        for (const suggestion of finalReport.suggestions) {
            console.log(`- ${suggestion}`);
        }
        if (fixed?.fixed?.length) {
            console.log(`Fixed: ${fixed.fixed.join(', ')}`);
        }
    }
} else if (command === 'generate' && param) {
    const type = param; // component or view
    const name = process.argv[4];
    if (!name) {
        console.log('Usage: ghost generate <component|view> <name>');
        process.exit(1);
    }

    const dir = type === 'view' ? 'src/views' : 'src/components';
    const filePath = join(projectRoot, dir, `${name}.js`);

    try {
        mkdirSync(join(projectRoot, dir), { recursive: true });
        const content = type === 'view'
            ? `export const ${name} = () => ({ tag: 'div', props: {}, children: ['View: ${name}'] });`
            : `export const ${name} = () => ({ tag: 'div', props: {}, children: ['Component: ${name}'] });`;

        writeFileSync(filePath, content);
        console.log(`✅ Generated ${type}: ${filePath}`);
    } catch (e) {
        console.error(`❌ Failed to generate ${type}:`, e.message);
    }
} else {
    console.log(buildHelpText({ guided: false, topic: 'commands' }));
}
}

main().catch((error) => {
    console.error(`❌ ${error.message}`);
    process.exit(1);
});
