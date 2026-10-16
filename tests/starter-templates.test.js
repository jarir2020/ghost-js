import { mkdtempSync, readFileSync, rmSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import { execFileSync } from 'child_process';
import { tmpdir } from 'os';
import { join } from 'path';
import { pathToFileURL } from 'url';
import { scaffoldStarter, createDoctorReport, resolveStarterSelection, applyDoctorFixes } from '../packages/ghost-cli/src/project-scaffold.js';

export async function testStarterTemplates() {
    console.log('--- Testing Starter Templates ---');

    const root = mkdtempSync(join(tmpdir(), 'ghost-starter-'));

    try {
        const result = scaffoldStarter(root, 'acme-blog', 'blog');
        if (!result.ok) throw new Error(result.error || 'starter scaffold failed');

        const manifestPath = join(root, 'acme-blog', '.ghost', 'starter-manifest.json');
        if (!existsSync(manifestPath)) {
            throw new Error('starter manifest was not created');
        }

        const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
        if (manifest.template !== 'blog') {
            throw new Error(`expected blog template, got ${manifest.template}`);
        }

        const packageJson = JSON.parse(readFileSync(join(root, 'acme-blog', 'package.json'), 'utf8'));
        if (!packageJson.dependencies || packageJson.dependencies['@ghost-js/database'] !== '^1.0.0') {
            throw new Error('starter package.json did not include the database package dependency');
        }

        const indexPath = join(root, 'acme-blog', 'src', 'index.js');
        const index = readFileSync(indexPath, 'utf8');
        if (!index.includes('Starter template: blog')) {
            throw new Error('starter index file does not mention the template');
        }

        const modulePath = join(root, 'acme-blog', 'src', 'admin', 'modules', 'AdminDashboard.js');
        const module = await import(pathToFileURL(modulePath).href);
        const dashboard = module.AdminDashboard({ metrics: [{ label: 'Users' }] });
        if (dashboard.tag !== 'section') {
            throw new Error('AdminDashboard did not render a section');
        }
        if (!String(JSON.stringify(dashboard)).includes('Users')) {
            throw new Error('AdminDashboard did not include the metric label');
        }

        const formModulePath = join(root, 'acme-blog', 'src', 'admin', 'modules', 'FormBuilder.js');
        const formModule = await import(pathToFileURL(formModulePath).href);
        const formBuilder = formModule.FormBuilder({ fields: [{ label: 'Email' }] });
        if (formBuilder.tag !== 'section') {
            throw new Error('FormBuilder did not render a section');
        }
        if (!String(JSON.stringify(formBuilder)).includes('Email')) {
            throw new Error('FormBuilder did not include the field label');
        }

        const cssModulePath = join(root, 'acme-blog', 'src', 'admin', 'modules', 'CssEditor.js');
        const cssModule = await import(pathToFileURL(cssModulePath).href);
        const cssEditor = cssModule.CssEditor({ palette: [{ label: 'Brand' }], rules: [{ selector: '.hero' }] });
        if (cssEditor.tag !== 'section') {
            throw new Error('CssEditor did not render a section');
        }
        if (!String(JSON.stringify(cssEditor)).includes('Brand')) {
            throw new Error('CssEditor did not include the palette label');
        }

        const doctor = createDoctorReport(join(root, 'acme-blog'));
        if (doctor.status !== 'healthy') {
            throw new Error(`expected healthy starter project, got ${doctor.status}`);
        }

        console.log('✅ Starter template tests passed!');
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
}

export function testDoctorSuggestions() {
    console.log('--- Testing Doctor Suggestions ---');

    const root = mkdtempSync(join(tmpdir(), 'ghost-doctor-'));

    try {
        const report = createDoctorReport(root);
        if (report.status !== 'needs-attention') {
            throw new Error(`expected needs-attention, got ${report.status}`);
        }
        if (!report.suggestions.some((s) => s.includes('ghost init'))) {
            throw new Error('doctor did not suggest starter initialization');
        }
        if (!report.missing.includes('package.json') || !report.missing.includes('src/index.js')) {
            throw new Error('doctor missing-file detection is incomplete');
        }

        console.log('✅ Doctor suggestion tests passed!');
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
}

export async function testGuidedStarterResolution() {
    console.log('--- Testing Guided Starter Resolution ---');

    const selection = await resolveStarterSelection({
        projectName: '',
        templateName: '',
        guided: true,
        promptFn: async (question, fallback) => {
            if (question.startsWith('Project name')) return 'guided-app';
            if (question.startsWith('Starter template')) return 'saas';
            if (question.startsWith('Include the AdminDashboard module')) return 'no';
            if (question.startsWith('Include the FormBuilder module')) return 'yes';
            if (question.startsWith('Include the CssEditor module')) return 'no';
            if (question.startsWith('Create this starter now')) return 'yes';
            return fallback;
        }
    });

    if (selection.projectName !== 'guided-app') {
        throw new Error(`expected guided-app project name, got ${selection.projectName}`);
    }
    if (selection.templateName !== 'saas') {
        throw new Error(`expected saas template, got ${selection.templateName}`);
    }
    if (selection.includeAdminModule !== false) {
        throw new Error('expected admin module to be disabled by guided answer');
    }
    if (selection.includeFormBuilder !== true) {
        throw new Error('expected form builder to be enabled by guided answer');
    }
    if (selection.includeCssEditor !== false) {
        throw new Error('expected css editor to be disabled by guided answer');
    }
    if (selection.confirmed !== true) {
        throw new Error('expected guided flow to confirm creation');
    }

    console.log('✅ Guided starter resolution tests passed!');
}

export function testGuidedStarterScaffoldRespectsAdminToggle() {
    console.log('--- Testing Guided Starter Scaffold Toggle ---');

    const root = mkdtempSync(join(tmpdir(), 'ghost-guided-'));

    try {
        const result = scaffoldStarter(root, 'guided-toggle', 'blog', [], { includeAdminModule: false, includeCssEditor: false });
        if (!result.ok) {
            throw new Error(result.error || 'guided scaffold failed');
        }

        const modulePath = join(root, 'guided-toggle', 'src', 'admin', 'modules', 'AdminDashboard.js');
        const formPath = join(root, 'guided-toggle', 'src', 'admin', 'modules', 'FormBuilder.js');
        const cssPath = join(root, 'guided-toggle', 'src', 'admin', 'modules', 'CssEditor.js');
        if (existsSync(modulePath)) {
            throw new Error('AdminDashboard should not be created when disabled');
        }
        if (!existsSync(formPath)) {
            throw new Error('FormBuilder should be created when enabled');
        }
        if (existsSync(cssPath)) {
            throw new Error('CssEditor should not be created when disabled');
        }

        console.log('✅ Guided starter scaffold toggle tests passed!');
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
}

export async function testDoctorFixCreatesFiles() {
    console.log('--- Testing Doctor Fixes ---');

    const root = mkdtempSync(join(tmpdir(), 'ghost-fix-'));

    try {
        const report = createDoctorReport(root);
        const fixed = applyDoctorFixes(root, report, { templateName: 'portfolio' });

        const packagePath = join(root, 'package.json');
        const indexPath = join(root, 'src', 'index.js');
        const readmePath = join(root, 'README.md');
        const modulePath = join(root, 'src', 'admin', 'modules', 'AdminDashboard.js');
        const formPath = join(root, 'src', 'admin', 'modules', 'FormBuilder.js');
        const cssPath = join(root, 'src', 'admin', 'modules', 'CssEditor.js');
        const formPreviewDataPath = join(root, 'src', 'admin', 'forms', 'FormBuilder.preview.data.json');
        const formValidationPath = join(root, 'src', 'admin', 'forms', 'FormBuilder.validation.js');
        const formPublishPath = join(root, 'src', 'admin', 'forms', 'FormBuilder.publish.js');
        const formRollbackPath = join(root, 'src', 'admin', 'forms', 'FormBuilder.rollback.js');
        const cssPreviewDataPath = join(root, 'src', 'admin', 'styles', 'CssEditor.inline.preview.data.json');
        const cssValidationPath = join(root, 'src', 'admin', 'styles', 'CssEditor.inline.validation.js');
        const cssPublishPath = join(root, 'src', 'admin', 'styles', 'CssEditor.inline.publish.js');
        const cssRollbackPath = join(root, 'src', 'admin', 'styles', 'CssEditor.inline.rollback.js');

        if (!existsSync(packagePath) || !existsSync(indexPath) || !existsSync(readmePath) || !existsSync(modulePath) || !existsSync(formPath) || !existsSync(cssPath) || !existsSync(formPreviewDataPath) || !existsSync(formValidationPath) || !existsSync(formPublishPath) || !existsSync(formRollbackPath) || !existsSync(cssPreviewDataPath) || !existsSync(cssValidationPath) || !existsSync(cssPublishPath) || !existsSync(cssRollbackPath)) {
            throw new Error('doctor fix did not create all expected files');
        }

        const formValidation = await import(pathToFileURL(formValidationPath).href);
        const formValidationResult = formValidation.validateFormBuilderDraft({ name: '', email: '' });
        if (formValidationResult.valid !== false) {
            throw new Error('doctor fix did not restore the form validation helper');
        }

        const cssValidation = await import(pathToFileURL(cssValidationPath).href);
        const cssValidationResult = cssValidation.validateCssEditorInlineDraft({ selector: '' });
        if (cssValidationResult.valid !== false) {
            throw new Error('doctor fix did not restore the css validation helper');
        }

        const fixedReport = fixed.report;
        if (fixedReport.status !== 'healthy') {
            throw new Error(`expected fixed project to be healthy, got ${fixedReport.status}`);
        }

        console.log('✅ Doctor fix tests passed!');
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
}

export async function testDoctorDetectsRicherScaffoldGaps() {
    console.log('--- Testing Doctor Rich Scaffold Detection ---');

    const root = mkdtempSync(join(tmpdir(), 'ghost-doctor-rich-'));
    const cliPath = join(process.cwd(), 'packages', 'ghost-cli', 'src', 'cli.js');

    try {
        execFileSync('node', [cliPath, 'make:form-builder', 'ContactForm', '--app=acme', '--fields=name,email,message', '--layout=two-column', '--model=Contact', '--action=save', '--force'], {
            cwd: root,
            encoding: 'utf8'
        });
        execFileSync('node', [cliPath, 'make:style-inline', 'Button', '--app=acme', '--selector=.btn-primary', '--states=hover,focus', '--force'], {
            cwd: root,
            encoding: 'utf8'
        });

        const formPreviewDataPath = join(root, 'apps', 'acme', 'admin', 'forms', 'ContactForm.preview.data.json');
        const cssValidationPath = join(root, 'apps', 'acme', 'admin', 'styles', 'Button.inline.validation.js');

        rmSync(formPreviewDataPath, { force: true });
        rmSync(cssValidationPath, { force: true });

        const report = createDoctorReport(root);
        if (report.status !== 'needs-attention') {
            throw new Error(`expected needs-attention after removing rich scaffold files, got ${report.status}`);
        }
        if (!report.missing.includes('apps/acme/admin/forms/ContactForm.preview.data.json')) {
            throw new Error('doctor did not report the missing form preview data');
        }
        if (!report.missing.includes('apps/acme/admin/styles/Button.inline.validation.js')) {
            throw new Error('doctor did not report the missing inline validation file');
        }

        const jsonOutput = execFileSync('node', [cliPath, 'doctor', '--json'], {
            cwd: root,
            encoding: 'utf8'
        });
        const parsed = JSON.parse(jsonOutput);
        if (!Array.isArray(parsed.missingGroups) || parsed.missingGroups.length === 0) {
            throw new Error('doctor json did not include missingGroups');
        }
        const formGroup = parsed.missingGroups.find((group) => group.group === 'app-form-builder-richer-scaffold');
        const styleGroup = parsed.missingGroups.find((group) => group.group === 'app-style-inline-richer-scaffold');
        if (!formGroup || !formGroup.files.includes('apps/acme/admin/forms/ContactForm.preview.data.json')) {
            throw new Error('doctor json missingGroups did not include the removed form scaffold file');
        }
        if (!styleGroup || !styleGroup.files.includes('apps/acme/admin/styles/Button.inline.validation.js')) {
            throw new Error('doctor json missingGroups did not include the removed style scaffold file');
        }

        const briefOutput = execFileSync('node', [cliPath, 'doctor', '--json', '--brief'], {
            cwd: root,
            encoding: 'utf8'
        }).trim();
        if (briefOutput.includes('\n')) {
            throw new Error('doctor brief json should be compact and single-line');
        }
        const briefParsed = JSON.parse(briefOutput);
        if (!Array.isArray(briefParsed.missingGroups) || briefParsed.missingGroups.length === 0) {
            throw new Error('doctor brief json did not include missingGroups');
        }

        const prettyOutput = execFileSync('node', [cliPath, 'doctor', '--json', '--pretty'], {
            cwd: root,
            encoding: 'utf8'
        });
        if (!prettyOutput.includes('\n')) {
            throw new Error('doctor pretty json should be multiline');
        }
        const prettyParsed = JSON.parse(prettyOutput);
        if (!Array.isArray(prettyParsed.missingGroups) || prettyParsed.missingGroups.length === 0) {
            throw new Error('doctor pretty json did not include missingGroups');
        }

        const sourceOutput = execFileSync('node', [cliPath, 'doctor', '--json', '--source'], {
            cwd: root,
            encoding: 'utf8'
        });
        const sourceParsed = JSON.parse(sourceOutput);
        const sourceFormGroup = sourceParsed.missingGroups.find((group) => group.group === 'app-form-builder-richer-scaffold');
        const sourceStyleGroup = sourceParsed.missingGroups.find((group) => group.group === 'app-style-inline-richer-scaffold');
        if (!sourceFormGroup || sourceFormGroup.source !== 'app-scoped') {
            throw new Error('doctor json --source did not mark the form scaffold group as app-scoped');
        }
        if (!sourceStyleGroup || sourceStyleGroup.source !== 'app-scoped') {
            throw new Error('doctor json --source did not mark the style scaffold group as app-scoped');
        }

        const sourceBriefOutput = execFileSync('node', [cliPath, 'doctor', '--json', '--source', '--brief'], {
            cwd: root,
            encoding: 'utf8'
        }).trim();
        if (sourceBriefOutput.includes('\n')) {
            throw new Error('doctor json --source --brief should be compact and single-line');
        }
        const sourceBriefParsed = JSON.parse(sourceBriefOutput);
        const sourceBriefFormGroup = sourceBriefParsed.missingGroups.find((group) => group.group === 'app-form-builder-richer-scaffold');
        const sourceBriefStyleGroup = sourceBriefParsed.missingGroups.find((group) => group.group === 'app-style-inline-richer-scaffold');
        if (!sourceBriefFormGroup || sourceBriefFormGroup.source !== 'app-scoped') {
            throw new Error('doctor json --source --brief did not keep app-scoped provenance for the form scaffold group');
        }
        if (!sourceBriefStyleGroup || sourceBriefStyleGroup.source !== 'app-scoped') {
            throw new Error('doctor json --source --brief did not keep app-scoped provenance for the style scaffold group');
        }

        const coreRoot = mkdtempSync(join(tmpdir(), 'ghost-doctor-core-'));
        try {
            const coreOutput = execFileSync('node', [cliPath, 'doctor', '--json', '--source'], {
                cwd: coreRoot,
                encoding: 'utf8'
            });
            const coreParsed = JSON.parse(coreOutput);
            const coreGroup = coreParsed.missingGroups.find((group) => group.group === 'core');
            if (!coreGroup || coreGroup.source !== 'core') {
                throw new Error('doctor json --source did not mark the core group as core');
            }
        } finally {
            rmSync(coreRoot, { recursive: true, force: true });
        }

        console.log('✅ Doctor rich scaffold detection tests passed!');
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
}

export function testDoctorMemoryDiagnostics() {
    console.log('--- Testing Doctor Memory Diagnostics ---');

    const root = mkdtempSync(join(tmpdir(), 'ghost-doctor-memory-'));
    const cliPath = join(process.cwd(), 'packages', 'ghost-cli', 'src', 'cli.js');

    try {
        const cacheDir = join(root, '.ghost', 'cache', 'dev');
        const manifestDir = join(root, '.ghost', 'manifests', 'dev');
        mkdirSync(cacheDir, { recursive: true });
        mkdirSync(manifestDir, { recursive: true });
        writeFileSync(join(cacheDir, 'cache.bin'), 'x'.repeat(1024 * 64));
        writeFileSync(join(manifestDir, 'manifest.json'), JSON.stringify({ state: 'warm' }, null, 2));

        const memoryOutput = execFileSync('node', [cliPath, 'doctor', '--memory'], {
            cwd: root,
            encoding: 'utf8',
            env: {
                ...process.env,
                GHOST_DOCTOR_MEMORY_BUDGET_MB: '1',
                GHOST_DOCTOR_MEMORY_WARNING_RATIO: '0.5',
                GHOST_DOCTOR_MEMORY_CRITICAL_RATIO: '0.75'
            }
        });

        if (!memoryOutput.includes('Ghost.js Doctor Memory')) {
            throw new Error('doctor --memory did not print the memory header');
        }
        if (!memoryOutput.includes('Cache:') || !memoryOutput.includes('Pressure:')) {
            throw new Error('doctor --memory did not print cache pressure details');
        }

        const jsonOutput = execFileSync('node', [cliPath, 'doctor', '--memory', '--json'], {
            cwd: root,
            encoding: 'utf8',
            env: {
                ...process.env,
                GHOST_DOCTOR_MEMORY_BUDGET_MB: '1',
                GHOST_DOCTOR_MEMORY_WARNING_RATIO: '0.5',
                GHOST_DOCTOR_MEMORY_CRITICAL_RATIO: '0.75'
            }
        });

        const parsed = JSON.parse(jsonOutput);
        if (parsed.kind !== 'ghost.doctor.memory') {
            throw new Error('doctor --memory json did not return the memory envelope');
        }
        if (!parsed.budgets || parsed.budgets.selectedMB !== 1) {
            throw new Error('doctor --memory json did not include the selected budget');
        }
        if (!parsed.cache || !parsed.cache.cache || parsed.cache.cache.fileCount === 0) {
            throw new Error('doctor --memory json did not include cache file counts');
        }
        if (!Array.isArray(parsed.warnings) || parsed.warnings.length === 0) {
            throw new Error('doctor --memory json did not include warnings');
        }

        const briefOutput = execFileSync('node', [cliPath, 'doctor', '--memory', '--json', '--brief'], {
            cwd: root,
            encoding: 'utf8',
            env: {
                ...process.env,
                GHOST_DOCTOR_MEMORY_BUDGET_MB: '1',
                GHOST_DOCTOR_MEMORY_WARNING_RATIO: '0.5',
                GHOST_DOCTOR_MEMORY_CRITICAL_RATIO: '0.75'
            }
        }).trim();

        if (briefOutput.includes('\n')) {
            throw new Error('doctor --memory --json --brief should be compact and single-line');
        }

        const briefParsed = JSON.parse(briefOutput);
        if (briefParsed.kind !== 'ghost.doctor.memory') {
            throw new Error('doctor --memory --json --brief did not preserve the memory envelope');
        }

        console.log('✅ Doctor memory diagnostics tests passed!');
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
}

export function testCssEditorCliGenerator() {
    console.log('--- Testing CSS Editor CLI Generator ---');

    const root = mkdtempSync(join(tmpdir(), 'ghost-css-editor-'));
    const cliPath = join(process.cwd(), 'packages', 'ghost-cli', 'src', 'cli.js');

    try {
        const output = execFileSync('node', [cliPath, 'make:css-editor', 'ThemeKit', '--app=acme', '--theme=midnight', '--scope=admin', '--json', '--force'], {
            cwd: root,
            encoding: 'utf8'
        });

        const parsed = JSON.parse(output);
        if (!parsed.ok) {
            throw new Error('css editor command reported failure');
        }
        if (parsed.appName !== 'acme') {
            throw new Error(`expected acme app name, got ${parsed.appName}`);
        }
        if (parsed.name !== 'ThemeKit') {
            throw new Error(`expected ThemeKit output, got ${parsed.name}`);
        }
        if (parsed.scope !== 'admin') {
            throw new Error(`expected admin scope, got ${parsed.scope}`);
        }
        if (!parsed.files.some((file) => file.includes('ThemeKit.editor.js'))) {
            throw new Error('css editor command did not report editor file');
        }

        const editorPath = join(root, 'apps', 'acme', 'admin', 'styles', 'ThemeKit.editor.js');
        const tokensPath = join(root, 'apps', 'acme', 'admin', 'styles', 'ThemeKit.tokens.json');
        const historyPath = join(root, 'storage', 'admin', 'acme', 'styles', 'ThemeKit.history.json');

        if (!existsSync(editorPath) || !existsSync(tokensPath) || !existsSync(historyPath)) {
            throw new Error('css editor command did not create the expected files');
        }

        const tokens = JSON.parse(readFileSync(tokensPath, 'utf8'));
        if (tokens.theme !== 'midnight') {
            throw new Error(`expected midnight theme, got ${tokens.theme}`);
        }

        console.log('✅ CSS editor CLI generator tests passed!');
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
}

export async function testFormBuilderCliGenerator() {
    console.log('--- Testing Form Builder CLI Generator ---');

    const root = mkdtempSync(join(tmpdir(), 'ghost-form-builder-'));
    const cliPath = join(process.cwd(), 'packages', 'ghost-cli', 'src', 'cli.js');

    try {
        const output = execFileSync('node', [cliPath, 'make:form-builder', 'ContactForm', '--app=acme', '--fields=name,email,message', '--layout=two-column', '--model=Contact', '--action=save', '--json', '--force'], {
            cwd: root,
            encoding: 'utf8'
        });

        const parsed = JSON.parse(output);
        if (!parsed.ok) {
            throw new Error('form builder command reported failure');
        }
        if (parsed.appName !== 'acme') {
            throw new Error(`expected acme app name, got ${parsed.appName}`);
        }
        if (parsed.layout !== 'two-column') {
            throw new Error(`expected two-column layout, got ${parsed.layout}`);
        }
        if (!Array.isArray(parsed.fields) || parsed.fields.length !== 3) {
            throw new Error('form builder command did not preserve the field list');
        }
        if (parsed.model !== 'Contact') {
            throw new Error(`expected Contact model binding, got ${parsed.model}`);
        }

        const schemaPath = join(root, 'apps', 'acme', 'admin', 'forms', 'ContactForm.schema.json');
        const previewPath = join(root, 'apps', 'acme', 'admin', 'forms', 'ContactForm.preview.js');
        const builderPath = join(root, 'apps', 'acme', 'admin', 'forms', 'ContactForm.builder.js');
        const previewDataPath = join(root, 'apps', 'acme', 'admin', 'forms', 'ContactForm.preview.data.json');
        const validationPath = join(root, 'apps', 'acme', 'admin', 'forms', 'ContactForm.validation.js');
        const publishPath = join(root, 'apps', 'acme', 'admin', 'forms', 'ContactForm.publish.js');
        const rollbackPath = join(root, 'apps', 'acme', 'admin', 'forms', 'ContactForm.rollback.js');
        const historyPath = join(root, 'storage', 'admin', 'acme', 'forms', 'ContactForm.history.json');

        if (!existsSync(schemaPath) || !existsSync(previewPath) || !existsSync(builderPath) || !existsSync(previewDataPath) || !existsSync(validationPath) || !existsSync(publishPath) || !existsSync(rollbackPath) || !existsSync(historyPath)) {
            throw new Error('form builder command did not create the expected files');
        }

        const schema = JSON.parse(readFileSync(schemaPath, 'utf8'));
        if (schema.layout !== 'two-column') {
            throw new Error(`expected schema to store two-column layout, got ${schema.layout}`);
        }

        const previewData = JSON.parse(readFileSync(previewDataPath, 'utf8'));
        if (previewData.sampleRecord.email !== 'sample-email') {
            throw new Error('form builder preview data did not include the sample record');
        }

        const validation = await import(pathToFileURL(validationPath).href);
        const validationResult = validation.validateContactFormDraft({ name: 'Jane', email: '', message: 'hi' });
        if (validationResult.valid !== false || validationResult.errors.length === 0) {
            throw new Error('form builder validation stub did not report missing data');
        }

        const publish = await import(pathToFileURL(publishPath).href);
        const publishResult = publish.publishContactFormDraft({ status: 'draft' });
        if (publishResult.action !== 'publish') {
            throw new Error('form builder publish helper did not return publish action');
        }

        const rollback = await import(pathToFileURL(rollbackPath).href);
        const rollbackResult = rollback.rollbackContactFormDraft({ version: 1 });
        if (rollbackResult.action !== 'rollback') {
            throw new Error('form builder rollback helper did not return rollback action');
        }

        console.log('✅ Form builder CLI generator tests passed!');
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
}

export async function testStyleInlineCliGenerator() {
    console.log('--- Testing Style Inline CLI Generator ---');

    const root = mkdtempSync(join(tmpdir(), 'ghost-inline-'));
    const cliPath = join(process.cwd(), 'packages', 'ghost-cli', 'src', 'cli.js');

    try {
        const output = execFileSync('node', [cliPath, 'make:style-inline', 'Button', '--app=acme', '--selector=.btn-primary', '--states=hover,focus,active', '--css-module', '--json', '--force'], {
            cwd: root,
            encoding: 'utf8'
        });

        const parsed = JSON.parse(output);
        if (!parsed.ok) {
            throw new Error('style inline command reported failure');
        }
        if (parsed.appName !== 'acme') {
            throw new Error(`expected acme app name, got ${parsed.appName}`);
        }
        if (parsed.selector !== '.btn-primary') {
            throw new Error(`expected .btn-primary selector, got ${parsed.selector}`);
        }
        if (!Array.isArray(parsed.states) || parsed.states.length !== 3) {
            throw new Error('style inline command did not preserve the states list');
        }
        if (parsed.cssModule !== true) {
            throw new Error('style inline command did not report css module mode');
        }

        const cssPath = join(root, 'apps', 'acme', 'admin', 'styles', 'Button.inline.css');
        const tokensPath = join(root, 'apps', 'acme', 'admin', 'styles', 'Button.inline.tokens.json');
        const previewPath = join(root, 'apps', 'acme', 'admin', 'styles', 'Button.inline.preview.js');
        const previewDataPath = join(root, 'apps', 'acme', 'admin', 'styles', 'Button.inline.preview.data.json');
        const validationPath = join(root, 'apps', 'acme', 'admin', 'styles', 'Button.inline.validation.js');
        const publishPath = join(root, 'apps', 'acme', 'admin', 'styles', 'Button.inline.publish.js');
        const rollbackPath = join(root, 'apps', 'acme', 'admin', 'styles', 'Button.inline.rollback.js');
        const historyPath = join(root, 'storage', 'admin', 'acme', 'styles', 'Button.inline.history.json');

        if (!existsSync(cssPath) || !existsSync(tokensPath) || !existsSync(previewPath) || !existsSync(previewDataPath) || !existsSync(validationPath) || !existsSync(publishPath) || !existsSync(rollbackPath) || !existsSync(historyPath)) {
            throw new Error('style inline command did not create the expected files');
        }

        const tokens = JSON.parse(readFileSync(tokensPath, 'utf8'));
        if (tokens.selector !== '.btn-primary') {
            throw new Error(`expected tokens selector to be .btn-primary, got ${tokens.selector}`);
        }

        const previewData = JSON.parse(readFileSync(previewDataPath, 'utf8'));
        if (!String(previewData.sampleMarkup).includes('Button')) {
            throw new Error('style inline preview data did not include sample markup');
        }

        const validation = await import(pathToFileURL(validationPath).href);
        const validationResult = validation.validateButtonInlineDraft({ selector: '' });
        if (validationResult.valid !== false || validationResult.errors.length === 0) {
            throw new Error('style inline validation stub did not report missing selector');
        }

        const publish = await import(pathToFileURL(publishPath).href);
        const publishResult = publish.publishButtonInlineDraft({ snapshot: true });
        if (publishResult.action !== 'publish') {
            throw new Error('style inline publish helper did not return publish action');
        }

        const rollback = await import(pathToFileURL(rollbackPath).href);
        const rollbackResult = rollback.rollbackButtonInlineDraft({ snapshot: true });
        if (rollbackResult.action !== 'rollback') {
            throw new Error('style inline rollback helper did not return rollback action');
        }

        console.log('✅ Style inline CLI generator tests passed!');
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
}
