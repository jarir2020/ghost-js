import { mkdirSync, writeFileSync, existsSync, readdirSync, rmSync, statSync } from 'fs';
import { dirname, join } from 'path';
import { getHeapStatistics } from 'v8';
import { createStarterFiles, createStarterManifest, getStarterNames } from './starter-templates.js';

function parseOptions(argv) {
    const options = {};

    for (const token of argv) {
        if (!token.startsWith('--')) continue;
        const [key, rawValue] = token.slice(2).split('=');
        if (rawValue === undefined) {
            options[key] = true;
        } else {
            options[key] = rawValue;
        }
    }

    return options;
}

export function scaffoldStarter(projectRoot, projectName, templateName = 'blog', argv = [], scaffoldOptions = {}) {
    const options = parseOptions(argv);
    const template = templateName || 'blog';
    const files = createStarterFiles(projectName, template, scaffoldOptions);

    if (!files) {
        return {
            ok: false,
            error: `Unknown starter template: ${template}`,
            templates: getStarterNames()
        };
    }

    const targetRoot = join(projectRoot, projectName);
    if (existsSync(targetRoot) && !options.force) {
        return {
            ok: false,
            error: `Project already exists: ${projectName}. Use --force to overwrite.`,
            templates: getStarterNames()
        };
    }

    mkdirSync(targetRoot, { recursive: true });

    for (const [relativePath, content] of Object.entries(files)) {
        const filePath = join(targetRoot, relativePath);
        mkdirSync(dirname(filePath), { recursive: true });
        writeFileSync(filePath, content);
    }

    const manifest = createStarterManifest(projectName, template);
    if (manifest) {
        mkdirSync(join(targetRoot, '.ghost'), { recursive: true });
        writeFileSync(join(targetRoot, '.ghost', 'starter-manifest.json'), JSON.stringify(manifest, null, 2));
    }

    return {
        ok: true,
        projectRoot: targetRoot,
        template,
        files: Object.keys(files),
        manifest
    };
}

export async function resolveStarterSelection({ projectName = '', templateName = '', guided = false, promptFn = null } = {}) {
    const templates = getStarterNames();
    if (!guided) {
        return {
            projectName: projectName || '',
            templateName: templateName || 'blog',
            includeAdminModule: true,
            includeFormBuilder: true,
            includeCssEditor: true,
            confirmed: true
        };
    }

    const ask = typeof promptFn === 'function'
        ? promptFn
        : async (question, fallback) => fallback;

    const resolvedProjectName = projectName || await ask('Project name', 'ghost-app');
    const resolvedTemplateName = templateName || await ask(`Starter template (${templates.join(', ')})`, 'blog');
    const includeAdminModuleAnswer = await ask('Include the AdminDashboard module? (yes/no)', 'yes');
    const includeFormBuilderAnswer = await ask('Include the FormBuilder module? (yes/no)', 'yes');
    const includeCssEditorAnswer = await ask('Include the CssEditor module? (yes/no)', 'yes');
    const confirmAnswer = await ask('Create this starter now? (yes/no)', 'yes');

    return {
        projectName: resolvedProjectName || 'ghost-app',
        templateName: templates.includes(resolvedTemplateName) ? resolvedTemplateName : 'blog',
        includeAdminModule: !['no', 'n', 'false', '0'].includes(String(includeAdminModuleAnswer).toLowerCase()),
        includeFormBuilder: !['no', 'n', 'false', '0'].includes(String(includeFormBuilderAnswer).toLowerCase()),
        includeCssEditor: !['no', 'n', 'false', '0'].includes(String(includeCssEditorAnswer).toLowerCase()),
        confirmed: !['no', 'n', 'false', '0'].includes(String(confirmAnswer).toLowerCase())
    };
}

export function createDoctorReport(projectRoot) {
    const missing = [];
    const suggestions = [];
    const checks = [
        { file: 'package.json', fix: 'Run `ghost init <name>` or create a starter project.' },
        { file: 'src/index.js', fix: 'Create `src/index.js` from a starter template or scaffold a new app.' },
        { file: 'index.html', fix: 'Add a root `index.html` so the dev server has an entry point.' },
        { file: 'README.md', fix: 'Create a project README so the starter can guide new users.' },
        { file: 'src/admin/modules/AdminDashboard.js', fix: 'Restore the AdminDashboard module from the starter scaffold.' },
        { file: 'src/admin/modules/FormBuilder.js', fix: 'Restore the FormBuilder module from the starter scaffold.' },
        { file: 'src/admin/modules/CssEditor.js', fix: 'Restore the CssEditor module from the starter scaffold.' }
    ];

    for (const check of checks) {
        if (!existsSync(join(projectRoot, check.file))) {
            missing.push(check.file);
            suggestions.push(check.fix);
        }
    }

    const formBuilderFiles = [
        'src/admin/forms/FormBuilder.preview.data.json',
        'src/admin/forms/FormBuilder.validation.js',
        'src/admin/forms/FormBuilder.publish.js',
        'src/admin/forms/FormBuilder.rollback.js',
        'src/admin/forms/FormBuilder.schema.json',
        'src/admin/forms/FormBuilder.preview.js',
        'src/admin/forms/FormBuilder.builder.js',
        'src/admin/forms/FormBuilder.styles.css',
        'src/admin/forms/FormBuilder.test.js'
    ];
    const formBuilderFamilyActive = formBuilderFiles.some((relative) => existsSync(join(projectRoot, relative)));
    if (formBuilderFamilyActive) {
        const formBuilderRichFiles = [
            { file: 'src/admin/forms/FormBuilder.preview.data.json', fix: 'Restore the FormBuilder preview data scaffold.' },
            { file: 'src/admin/forms/FormBuilder.validation.js', fix: 'Restore the FormBuilder validation scaffold.' },
            { file: 'src/admin/forms/FormBuilder.publish.js', fix: 'Restore the FormBuilder publish helper scaffold.' },
            { file: 'src/admin/forms/FormBuilder.rollback.js', fix: 'Restore the FormBuilder rollback helper scaffold.' }
        ];
        for (const check of formBuilderRichFiles) {
            if (!existsSync(join(projectRoot, check.file))) {
                missing.push(check.file);
                suggestions.push(check.fix);
            }
        }
    }

    const appsRoot = join(projectRoot, 'apps');
    if (existsSync(appsRoot)) {
        for (const appName of readdirSync(appsRoot, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name)) {
            const appFormDir = join('apps', appName, 'admin', 'forms');
            const appStyleDir = join('apps', appName, 'admin', 'styles');

            const appFormDirExists = existsSync(join(projectRoot, appFormDir));
            const appStyleDirExists = existsSync(join(projectRoot, appStyleDir));

            if (appFormDirExists) {
                const formEntries = readdirSync(join(projectRoot, appFormDir));
                const bases = formEntries.filter((entry) => entry.endsWith('.schema.json')).map((entry) => entry.replace(/\.schema\.json$/, ''));
                for (const base of bases) {
                    const formRichFiles = [
                        { file: join(appFormDir, `${base}.preview.data.json`), fix: `Restore the ${base} preview data scaffold.` },
                        { file: join(appFormDir, `${base}.validation.js`), fix: `Restore the ${base} validation scaffold.` },
                        { file: join(appFormDir, `${base}.publish.js`), fix: `Restore the ${base} publish helper scaffold.` },
                        { file: join(appFormDir, `${base}.rollback.js`), fix: `Restore the ${base} rollback helper scaffold.` }
                    ];
                    for (const check of formRichFiles) {
                        if (!existsSync(join(projectRoot, check.file))) {
                            missing.push(check.file);
                            suggestions.push(check.fix);
                        }
                    }
                }
            }

            if (appStyleDirExists) {
                const styleEntries = readdirSync(join(projectRoot, appStyleDir));
                const bases = styleEntries.filter((entry) => entry.endsWith('.inline.css')).map((entry) => entry.replace(/\.inline\.css$/, ''));
                for (const base of bases) {
                    const styleRichFiles = [
                        { file: join(appStyleDir, `${base}.inline.preview.data.json`), fix: `Restore the ${base} inline preview data scaffold.` },
                        { file: join(appStyleDir, `${base}.inline.validation.js`), fix: `Restore the ${base} inline validation scaffold.` },
                        { file: join(appStyleDir, `${base}.inline.publish.js`), fix: `Restore the ${base} inline publish helper scaffold.` },
                        { file: join(appStyleDir, `${base}.inline.rollback.js`), fix: `Restore the ${base} inline rollback helper scaffold.` }
                    ];
                    for (const check of styleRichFiles) {
                        if (!existsSync(join(projectRoot, check.file))) {
                            missing.push(check.file);
                            suggestions.push(check.fix);
                        }
                    }
                }
            }
        }
    }

    const cssEditorFiles = [
        'src/admin/styles/CssEditor.inline.preview.data.json',
        'src/admin/styles/CssEditor.inline.validation.js',
        'src/admin/styles/CssEditor.inline.publish.js',
        'src/admin/styles/CssEditor.inline.rollback.js',
        'src/admin/styles/CssEditor.inline.css',
        'src/admin/styles/CssEditor.inline.tokens.json',
        'src/admin/styles/CssEditor.inline.preview.js',
        'src/admin/styles/CssEditor.inline.test.js'
    ];
    const cssEditorFamilyActive = cssEditorFiles.some((relative) => existsSync(join(projectRoot, relative)));
    if (cssEditorFamilyActive) {
        const cssEditorRichFiles = [
            { file: 'src/admin/styles/CssEditor.inline.preview.data.json', fix: 'Restore the CssEditor inline preview data scaffold.' },
            { file: 'src/admin/styles/CssEditor.inline.validation.js', fix: 'Restore the CssEditor inline validation scaffold.' },
            { file: 'src/admin/styles/CssEditor.inline.publish.js', fix: 'Restore the CssEditor inline publish helper scaffold.' },
            { file: 'src/admin/styles/CssEditor.inline.rollback.js', fix: 'Restore the CssEditor inline rollback helper scaffold.' }
        ];
        for (const check of cssEditorRichFiles) {
            if (!existsSync(join(projectRoot, check.file))) {
                missing.push(check.file);
                suggestions.push(check.fix);
            }
        }
    }

    const staleDirs = [
        '.ghost/cache/dev',
        '.ghost/cache/watch',
        '.ghost/manifests/dev',
        '.ghost/manifests/watch'
    ].filter((relative) => existsSync(join(projectRoot, relative)));

    if (staleDirs.length > 0) {
        suggestions.push('Clear stale caches and manifests with `ghost doctor --fix` or remove `.ghost/cache/*` and `.ghost/manifests/*`.');
    }

    if (missing.length === 0) {
        suggestions.push('The project looks healthy. Try `ghost dev` or `ghost build` next.');
    }

    return {
        ok: true,
        projectRoot,
        status: missing.length === 0 ? 'healthy' : 'needs-attention',
        missing,
        staleDirs,
        suggestions
    };
}

function scanDirectoryStats(rootPath, relativeDir) {
    const absoluteDir = join(rootPath, relativeDir);
    if (!existsSync(absoluteDir)) {
        return {
            path: relativeDir,
            fileCount: 0,
            totalBytes: 0
        };
    }

    let fileCount = 0;
    let totalBytes = 0;
    const stack = [absoluteDir];

    while (stack.length > 0) {
        const current = stack.pop();
        for (const entry of readdirSync(current, { withFileTypes: true })) {
            const entryPath = join(current, entry.name);
            if (entry.isDirectory()) {
                stack.push(entryPath);
            } else if (entry.isFile()) {
                fileCount += 1;
                totalBytes += statSync(entryPath).size;
            }
        }
    }

    return {
        path: relativeDir,
        fileCount,
        totalBytes
    };
}

function toMB(bytes) {
    return Number((bytes / 1024 / 1024).toFixed(2));
}

function getMemoryBudgetsMB(projectRoot) {
    const envBudget = Number(process.env.GHOST_DOCTOR_MEMORY_BUDGET_MB);
    const defaultBudget = Number.isFinite(envBudget) && envBudget > 0 ? envBudget : 384;
    const warningRatio = Number(process.env.GHOST_DOCTOR_MEMORY_WARNING_RATIO ?? 0.75);
    const criticalRatio = Number(process.env.GHOST_DOCTOR_MEMORY_CRITICAL_RATIO ?? 0.9);

    return {
        build: Number(process.env.GHOST_DOCTOR_MEMORY_BUILD_MB ?? defaultBudget),
        dev: Number(process.env.GHOST_DOCTOR_MEMORY_DEV_MB ?? defaultBudget),
        watch: Number(process.env.GHOST_DOCTOR_MEMORY_WATCH_MB ?? Math.max(256, defaultBudget - 64)),
        warningRatio: Number.isFinite(warningRatio) ? warningRatio : 0.75,
        criticalRatio: Number.isFinite(criticalRatio) ? criticalRatio : 0.9,
        projectRoot
    };
}

export function createDoctorMemoryReport(projectRoot, { mode = 'dev' } = {}) {
    const usage = process.memoryUsage();
    const heapStats = getHeapStatistics();
    const budgets = getMemoryBudgetsMB(projectRoot);
    const selectedBudget = budgets[mode] ?? budgets.dev;
    const cacheStats = scanDirectoryStats(projectRoot, '.ghost/cache');
    const manifestStats = scanDirectoryStats(projectRoot, '.ghost/manifests');
    const cachePressureMB = toMB(cacheStats.totalBytes + manifestStats.totalBytes);
    const heapUsedMB = toMB(usage.heapUsed);
    const rssMB = toMB(usage.rss);
    const heapLimitMB = toMB(heapStats.heap_size_limit);
    const warningThresholdMB = Number((selectedBudget * budgets.warningRatio).toFixed(2));
    const criticalThresholdMB = Number((selectedBudget * budgets.criticalRatio).toFixed(2));
    let status = 'healthy';
    if (heapUsedMB >= criticalThresholdMB) {
        status = 'critical';
    } else if (heapUsedMB >= warningThresholdMB) {
        status = 'warning';
    }

    const warnings = [];
    if (status !== 'healthy') {
        warnings.push(`Heap usage is ${heapUsedMB} MB against a ${selectedBudget} MB ${mode} budget.`);
    }
    if (cachePressureMB > selectedBudget * 0.25) {
        warnings.push(`Cache pressure is ${cachePressureMB} MB across .ghost/cache and .ghost/manifests.`);
    }
    if (cacheStats.fileCount === 0 && manifestStats.fileCount === 0) {
        warnings.push('No runtime cache or manifest files were found.');
    }

    return {
        kind: 'ghost.doctor.memory',
        schemaVersion: 1,
        title: 'Ghost.js Doctor Memory',
        projectRoot,
        mode,
        status,
        budgets: {
            buildMB: budgets.build,
            devMB: budgets.dev,
            watchMB: budgets.watch,
            selectedMB: selectedBudget,
            warningThresholdMB,
            criticalThresholdMB,
            heapLimitMB
        },
        usage: {
            rssMB,
            heapUsedMB,
            heapTotalMB: toMB(usage.heapTotal),
            externalMB: toMB(usage.external),
            arrayBuffersMB: toMB(usage.arrayBuffers || 0)
        },
        cache: {
            cache: cacheStats,
            manifests: manifestStats,
            totalPressureMB: cachePressureMB
        },
        warnings,
        recommendations: status === 'healthy'
            ? ['Memory usage is within the configured budget.']
            : [
                'Run `ghost doctor --fix` to clear stale caches and manifests.',
                'Reduce watched paths or restart the dev server if the pressure keeps growing.'
            ]
    };
}

export function applyDoctorFixes(projectRoot, report = null, { templateName = 'blog' } = {}) {
    const doctorReport = report ?? createDoctorReport(projectRoot);
    const fixes = [];

    const starterFiles = createStarterFiles('ghost-app', templateName);
    const baselineFiles = starterFiles ?? {};

    const repairFile = (relativePath, content) => {
        const target = join(projectRoot, relativePath);
        if (existsSync(target)) return false;
        mkdirSync(dirname(target), { recursive: true });
        writeFileSync(target, content);
        fixes.push(relativePath);
        return true;
    };

    const buildFormValidation = (name, fields) => `export function validate${name}Draft(data = {}) {\n    const errors = [];\n    const requiredFields = ${JSON.stringify(fields)};\n\n    for (const field of requiredFields) {\n        if (data[field] == null || data[field] === '') {\n            errors.push({ field, message: 'This field is required.' });\n        }\n    }\n\n    return { valid: errors.length === 0, errors };\n}\n\nexport default validate${name}Draft;\n`;

    const buildFormPublish = (name, id) => `export function publish${name}Draft(draft = {}) {\n    return {\n        ok: true,\n        action: 'publish',\n        id: '${id}',\n        draft\n    };\n}\n\nexport default publish${name}Draft;\n`;

    const buildFormRollback = (name, id) => `export function rollback${name}Draft(snapshot = {}) {\n    return {\n        ok: true,\n        action: 'rollback',\n        id: '${id}',\n        snapshot\n    };\n}\n\nexport default rollback${name}Draft;\n`;

    const buildInlineValidation = (name, selector) => `export function validate${name}InlineDraft(data = {}) {\n    const errors = [];\n\n    if (typeof data.selector !== 'string' || !data.selector.trim()) {\n        errors.push({ field: 'selector', message: 'Selector is required.' });\n    }\n\n    return { valid: errors.length === 0, errors };\n}\n\nexport default validate${name}InlineDraft;\n`;

    const buildInlinePublish = (name, selector) => `export function publish${name}InlineDraft(snapshot = {}) {\n    return {\n        ok: true,\n        action: 'publish',\n        selector: '${selector}',\n        snapshot\n    };\n}\n\nexport default publish${name}InlineDraft;\n`;

    const buildInlineRollback = (name, selector) => `export function rollback${name}InlineDraft(snapshot = {}) {\n    return {\n        ok: true,\n        action: 'rollback',\n        selector: '${selector}',\n        snapshot\n    };\n}\n\nexport default rollback${name}InlineDraft;\n`;

    if (doctorReport.missing.includes('package.json')) {
        repairFile('package.json', baselineFiles['package.json'] ?? JSON.stringify({
            name: 'ghost-app',
            version: '1.0.0',
            type: 'module',
            dependencies: {
                '@ghost-js/core': '^1.0.0',
                '@ghost-js/cli': '^1.0.2'
            },
            scripts: {
                dev: 'ghost dev',
                build: 'ghost build',
                doctor: 'ghost doctor'
            }
        }, null, 2));
    }

    if (doctorReport.missing.includes('src/index.js')) {
        repairFile('src/index.js', baselineFiles['src/index.js'] ?? `import { mount } from '@ghost-js/core';\n\nmount({ tag: 'div', props: {}, children: ['Ghost.js'] }, document.body);\n`);
    }

    if (doctorReport.missing.includes('index.html')) {
        repairFile('index.html', baselineFiles['index.html'] ?? `<!DOCTYPE html>\n<html lang="en">\n<head>\n    <meta charset="UTF-8">\n    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n    <title>Ghost.js App</title>\n</head>\n<body>\n    <script type="module" data-ghost-runtime-loader>\n        const candidates = ['/dist/dev/bundle.js', '/dist/build/bundle.js'];\n        for (const source of candidates) {\n            try {\n                await import(source);\n                break;\n            } catch {\n                // Try the next isolated output directory.\n            }\n        }\n    </script>\n</body>\n</html>\n`);
    }

    if (doctorReport.missing.includes('README.md')) {
        repairFile('README.md', baselineFiles['README.md'] ?? `# Ghost.js App\n\nGenerated with Ghost.js.\n`);
    }

    const adminModulePath = 'src/admin/modules/AdminDashboard.js';
    if (!existsSync(join(projectRoot, adminModulePath))) {
        repairFile(adminModulePath, baselineFiles[adminModulePath] ?? `export function AdminDashboard() { return { tag: 'section', props: {}, children: ['Admin Dashboard'] }; }\nexport default AdminDashboard;\n`);
    }

    const formBuilderPath = 'src/admin/modules/FormBuilder.js';
    if (!existsSync(join(projectRoot, formBuilderPath))) {
        repairFile(formBuilderPath, baselineFiles[formBuilderPath] ?? `export function FormBuilder() { return { tag: 'section', props: {}, children: ['Form Builder'] }; }\nexport default FormBuilder;\n`);
    }

    const formPreviewDataPath = 'src/admin/forms/FormBuilder.preview.data.json';
    if (!existsSync(join(projectRoot, formPreviewDataPath))) {
        repairFile(formPreviewDataPath, JSON.stringify({
            id: 'formbuilder',
            name: 'FormBuilder',
            layout: 'single-column',
            sampleRecord: {
                name: 'sample-name',
                email: 'sample-email'
            },
            validation: {
                required: ['name', 'email'],
                mode: 'draft'
            }
        }, null, 2));
    }

    const formValidationPath = 'src/admin/forms/FormBuilder.validation.js';
    if (!existsSync(join(projectRoot, formValidationPath))) {
        repairFile(formValidationPath, buildFormValidation('FormBuilder', ['name', 'email']));
    }

    const formPublishPath = 'src/admin/forms/FormBuilder.publish.js';
    if (!existsSync(join(projectRoot, formPublishPath))) {
        repairFile(formPublishPath, buildFormPublish('FormBuilder', 'formbuilder'));
    }

    const formRollbackPath = 'src/admin/forms/FormBuilder.rollback.js';
    if (!existsSync(join(projectRoot, formRollbackPath))) {
        repairFile(formRollbackPath, buildFormRollback('FormBuilder', 'formbuilder'));
    }

    const cssEditorPath = 'src/admin/modules/CssEditor.js';
    if (!existsSync(join(projectRoot, cssEditorPath))) {
        repairFile(cssEditorPath, baselineFiles[cssEditorPath] ?? `export function CssEditor() { return { tag: 'section', props: {}, children: ['CSS Editor'] }; }\nexport default CssEditor;\n`);
    }

    const cssPreviewDataPath = 'src/admin/styles/CssEditor.inline.preview.data.json';
    if (!existsSync(join(projectRoot, cssPreviewDataPath))) {
        repairFile(cssPreviewDataPath, JSON.stringify({
            id: 'csseditor',
            name: 'CssEditor',
            selector: '.csseditor',
            states: ['hover', 'focus'],
            sampleMarkup: '<button class="csseditor">Preview</button>',
            tokens: {
                colors: { accent: '#2563eb' },
                spacing: { md: '1rem' }
            }
        }, null, 2));
    }

    const cssValidationPath = 'src/admin/styles/CssEditor.inline.validation.js';
    if (!existsSync(join(projectRoot, cssValidationPath))) {
        repairFile(cssValidationPath, buildInlineValidation('CssEditor', '.csseditor'));
    }

    const cssPublishPath = 'src/admin/styles/CssEditor.inline.publish.js';
    if (!existsSync(join(projectRoot, cssPublishPath))) {
        repairFile(cssPublishPath, buildInlinePublish('CssEditor', '.csseditor'));
    }

    const cssRollbackPath = 'src/admin/styles/CssEditor.inline.rollback.js';
    if (!existsSync(join(projectRoot, cssRollbackPath))) {
        repairFile(cssRollbackPath, buildInlineRollback('CssEditor', '.csseditor'));
    }

    for (const relative of doctorReport.staleDirs) {
        rmSync(join(projectRoot, relative), { recursive: true, force: true });
        fixes.push(`removed:${relative}`);
    }

    return {
        ok: true,
        fixed: fixes,
        projectRoot,
        report: createDoctorReport(projectRoot)
    };
}
