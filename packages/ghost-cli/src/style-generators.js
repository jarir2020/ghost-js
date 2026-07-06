import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

function normalizeName(name) {
    return String(name || 'theme').trim().replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'theme';
}

function buildTokenData(name, theme, scope, tokenSource) {
    return {
        id: normalizeName(name),
        name,
        theme,
        scope,
        tokens: tokenSource ? { source: tokenSource } : {
            colors: {
                background: '#ffffff',
                text: '#111827',
                accent: '#2563eb'
            },
            spacing: {
                xs: '0.25rem',
                sm: '0.5rem',
                md: '1rem',
                lg: '1.5rem'
            },
            typography: {
                fontFamily: 'system-ui, sans-serif',
                fontSize: '16px',
                lineHeight: 1.5
            }
        },
        generatedAt: new Date().toISOString()
    };
}

function buildDraftCss(tokenData) {
    const colors = tokenData.tokens?.colors ?? {};
    const spacing = tokenData.tokens?.spacing ?? {};
    const typography = tokenData.tokens?.typography ?? {};

    return `/* ${tokenData.name} draft styles */\n:root {\n    --ghost-bg: ${colors.background ?? '#ffffff'};\n    --ghost-text: ${colors.text ?? '#111827'};\n    --ghost-accent: ${colors.accent ?? '#2563eb'};\n    --ghost-space-sm: ${spacing.sm ?? '0.5rem'};\n    --ghost-space-md: ${spacing.md ?? '1rem'};\n    --ghost-font-family: ${typography.fontFamily ?? 'system-ui, sans-serif'};\n    --ghost-font-size: ${typography.fontSize ?? '16px'};\n}\n\n.${tokenData.id} {\n    background: var(--ghost-bg);\n    color: var(--ghost-text);\n    font-family: var(--ghost-font-family);\n    font-size: var(--ghost-font-size);\n    padding: var(--ghost-space-md);\n}\n`;
}

function buildCompiledCss(tokenData) {
    return `/* compiled ${tokenData.name} styles */\n${buildDraftCss(tokenData)}\n`;
}

function buildEditorModule(name, scope) {
    return `export function CssEditor() {\n    return {\n        tag: 'section',\n        props: { class: 'css-editor', 'data-scope': '${scope}' },\n        children: [\n            { tag: 'h2', props: {}, children: ['${name}'] },\n            { tag: 'p', props: {}, children: ['Theme tokens, draft CSS, and compile output live here.'] }\n        ]\n    };\n}\n\nexport default CssEditor;\n`;
}

function buildTestModule(name) {
    return `import { CssEditor } from './${name}.editor.js';\n\nconst ui = CssEditor();\nif (ui.tag !== 'section') {\n    throw new Error('CssEditor stub did not render a section');\n}\n`;
}

function buildFormBuilderSchema(name, fields, layout, model, action) {
    return {
        id: normalizeName(name),
        name,
        version: 1,
        fields: fields.length ? fields : ['name', 'email'],
        layout,
        bindings: {
            model: model || null,
            action: action || null
        }
    };
}

function buildFormBuilderPreview(name, schema) {
    return `export function ${name}Preview() {\n    return {\n        tag: 'section',\n        props: { class: 'form-preview' },\n        children: [\n            { tag: 'h2', props: {}, children: ['${schema.name} Preview'] },\n            { tag: 'p', props: {}, children: ['Layout: ${schema.layout}'] }\n        ]\n    };\n}\n\nexport default ${name}Preview;\n`;
}

function buildFormBuilderPreviewData(schema) {
    return JSON.stringify({
        id: schema.id,
        name: schema.name,
        layout: schema.layout,
        sampleRecord: Object.fromEntries((schema.fields || []).map((field) => [field, `sample-${field}`])),
        validation: {
            required: schema.fields || [],
            mode: 'draft'
        }
    }, null, 2);
}

function buildFormBuilderController(name, schema) {
    return `export function ${name}Builder() {\n    return {\n        schema: ${JSON.stringify(schema, null, 2)}\n    };\n}\n\nexport default ${name}Builder;\n`;
}

function buildFormBuilderValidation(name, schema) {
    return `export function validate${name}Draft(data = {}) {\n    const errors = [];\n    const requiredFields = ${JSON.stringify(schema.fields || [])};\n\n    for (const field of requiredFields) {\n        if (data[field] == null || data[field] === '') {\n            errors.push({ field, message: 'This field is required.' });\n        }\n    }\n\n    return { valid: errors.length === 0, errors };\n}\n\nexport default validate${name}Draft;\n`;
}

function buildFormBuilderPublishHelper(name, schema) {
    return `export function publish${name}Draft(draft = {}) {\n    return {\n        ok: true,\n        action: 'publish',\n        id: '${schema.id}',\n        draft\n    };\n}\n\nexport default publish${name}Draft;\n`;
}

function buildFormBuilderRollbackHelper(name, schema) {
    return `export function rollback${name}Draft(snapshot = {}) {\n    return {\n        ok: true,\n        action: 'rollback',\n        id: '${schema.id}',\n        snapshot\n    };\n}\n\nexport default rollback${name}Draft;\n`;
}

function buildFormBuilderStyles(name) {
    return `.${normalizeName(name)}-form {\n    display: grid;\n    gap: 1rem;\n}\n`;
}

function buildFormBuilderTest(name) {
    return `import { ${name}Preview } from './${name}.preview.js';\n\nconst ui = ${name}Preview();\nif (ui.tag !== 'section') {\n    throw new Error('FormBuilder preview stub did not render a section');\n}\n`;
}

function buildStyleInlineArtifacts(name, options) {
    const selector = options.selector || `.${normalizeName(name)}`;
    const states = Array.isArray(options.states) && options.states.length ? options.states : ['hover', 'focus'];
    const tokens = options.tokens || null;
    const cssModule = options.cssModule === true;
    const fileBase = normalizeName(name);

    const inlineTokens = {
        id: fileBase,
        name,
        selector,
        states,
        cssModule,
        tokens: tokens ? { source: tokens } : { colors: { accent: '#2563eb' }, spacing: { md: '1rem' } },
        generatedAt: new Date().toISOString()
    };

    const inlineCss = `/* ${name} inline styles */\n${selector} {\n    display: block;\n}\n${states.map((state) => `${selector}:${state} {\n    outline: 1px solid var(--ghost-accent, #2563eb);\n}`).join('\n')}\n`;

    return {
        inlineTokens,
        inlineCss,
        previewData: JSON.stringify({
            id: fileBase,
            name,
            selector,
            states,
            sampleMarkup: `<button class="${fileBase}">Preview</button>`,
            tokens: inlineTokens.tokens
        }, null, 2),
        preview: `export function ${name}InlinePreview() {\n    return {\n        tag: 'div',\n        props: { class: 'inline-preview' },\n        children: ['${name} inline style preview']\n    };\n}\n\nexport default ${name}InlinePreview;\n`,
        validation: `export function validate${name}InlineDraft(data = {}) {\n    const errors = [];\n\n    if (typeof data.selector !== 'string' || !data.selector.trim()) {\n        errors.push({ field: 'selector', message: 'Selector is required.' });\n    }\n\n    return { valid: errors.length === 0, errors };\n}\n\nexport default validate${name}InlineDraft;\n`,
        publish: `export function publish${name}InlineDraft(snapshot = {}) {\n    return {\n        ok: true,\n        action: 'publish',\n        selector: '${selector}',\n        snapshot\n    };\n}\n\nexport default publish${name}InlineDraft;\n`,
        rollback: `export function rollback${name}InlineDraft(snapshot = {}) {\n    return {\n        ok: true,\n        action: 'rollback',\n        selector: '${selector}',\n        snapshot\n    };\n}\n\nexport default rollback${name}InlineDraft;\n`,
        test: `import { ${name}InlinePreview } from './${name}.inline.preview.js';\n\nconst ui = ${name}InlinePreview();\nif (ui.tag !== 'div') {\n    throw new Error('Inline style preview stub did not render a div');\n}\n`
    };
}

export function createCssEditorArtifacts(projectRoot, name, options = {}) {
    const appName = options.appName || '';
    const theme = options.theme || normalizeName(name);
    const scope = options.scope || 'global';
    const tokenSource = options.tokens || '';
    const force = options.force === true;
    const compiled = options.compile !== false;

    const appRoot = appName ? join(projectRoot, 'apps', appName) : projectRoot;
    const styleDir = join(appRoot, 'admin', 'styles');
    const storageDir = appName
        ? join(projectRoot, 'storage', 'admin', appName, 'styles')
        : join(projectRoot, 'storage', 'admin', 'styles');
    const fileBase = normalizeName(name);

    const outputFiles = {
        [`admin/styles/${fileBase}.tokens.json`]: JSON.stringify(buildTokenData(fileBase, theme, scope, tokenSource), null, 2),
        [`admin/styles/${fileBase}.draft.css`]: buildDraftCss(buildTokenData(fileBase, theme, scope, tokenSource)),
        [`admin/styles/${fileBase}.compiled.css`]: buildCompiledCss(buildTokenData(fileBase, theme, scope, tokenSource)),
        [`admin/styles/${fileBase}.editor.js`]: buildEditorModule(fileBase, scope),
        [`admin/styles/${fileBase}.test.js`]: buildTestModule(fileBase),
        [`storage/admin/styles/${fileBase}.history.json`]: JSON.stringify({
            name: fileBase,
            appName: appName || null,
            scope,
            theme,
            revisions: [
                {
                    version: 1,
                    draft: `${fileBase}.draft.css`,
                    compiled: `${fileBase}.compiled.css`,
                    compiledEnabled: compiled,
                    createdAt: new Date().toISOString()
                }
            ]
        }, null, 2)
    };

    const absolutePaths = Object.keys(outputFiles).map((relativePath) => {
        if (relativePath.startsWith('storage/')) {
            return join(storageDir, `${fileBase}.history.json`);
        }
        return join(styleDir, `${relativePath.split('/').pop()}`);
    });

    for (const filePath of absolutePaths) {
        if (existsSync(filePath) && !force) {
            return {
                ok: false,
                error: `Target already exists: ${filePath}. Use --force to overwrite.`
            };
        }
    }

    mkdirSync(styleDir, { recursive: true });
    mkdirSync(storageDir, { recursive: true });

    for (const [relativePath, content] of Object.entries(outputFiles)) {
        const filePath = relativePath.startsWith('storage/')
            ? join(storageDir, `${fileBase}.history.json`)
            : join(styleDir, `${relativePath.split('/').pop()}`);
        writeFileSync(filePath, content);
    }

    return {
        ok: true,
        appName: appName || null,
        name: fileBase,
        scope,
        theme,
        compiled,
        files: Object.keys(outputFiles).map((relativePath) => {
            return relativePath.startsWith('storage/')
                ? join(storageDir, `${fileBase}.history.json`)
                : join(styleDir, `${relativePath.split('/').pop()}`);
        })
    };
}

export function createFormBuilderArtifacts(projectRoot, name, options = {}) {
    const appName = options.appName || '';
    const layout = options.layout || 'single-column';
    const model = options.model || '';
    const action = options.action || '';
    const force = options.force === true;
    const fields = String(options.fields || '')
        .split(',')
        .map((field) => field.trim())
        .filter(Boolean);
    const fileBase = normalizeName(name);

    const appRoot = appName ? join(projectRoot, 'apps', appName) : projectRoot;
    const formsDir = join(appRoot, 'admin', 'forms');
    const storageDir = appName
        ? join(projectRoot, 'storage', 'admin', appName, 'forms')
        : join(projectRoot, 'storage', 'admin', 'forms');

    const schema = buildFormBuilderSchema(fileBase, fields, layout, model, action);
    const outputFiles = {
        [`admin/forms/${fileBase}.schema.json`]: JSON.stringify(schema, null, 2),
        [`admin/forms/${fileBase}.preview.js`]: buildFormBuilderPreview(fileBase, schema),
        [`admin/forms/${fileBase}.builder.js`]: buildFormBuilderController(fileBase, schema),
        [`admin/forms/${fileBase}.preview.data.json`]: buildFormBuilderPreviewData(schema),
        [`admin/forms/${fileBase}.validation.js`]: buildFormBuilderValidation(fileBase, schema),
        [`admin/forms/${fileBase}.publish.js`]: buildFormBuilderPublishHelper(fileBase, schema),
        [`admin/forms/${fileBase}.rollback.js`]: buildFormBuilderRollbackHelper(fileBase, schema),
        [`admin/forms/${fileBase}.styles.css`]: buildFormBuilderStyles(fileBase),
        [`admin/forms/${fileBase}.test.js`]: buildFormBuilderTest(fileBase),
        [`storage/admin/forms/${fileBase}.history.json`]: JSON.stringify({
            id: schema.id,
            name: schema.name,
            appName: appName || null,
            layout,
            hasPreviewData: true,
            hasValidation: true,
            hasPublishHelper: true,
            hasRollbackHelper: true,
            revisions: [
                {
                    version: 1,
                    schema: `${fileBase}.schema.json`,
                    createdAt: new Date().toISOString()
                }
            ]
        }, null, 2)
    };

    const absolutePaths = Object.keys(outputFiles).map((relativePath) => {
        if (relativePath.startsWith('storage/')) {
            return join(storageDir, `${fileBase}.history.json`);
        }
        return join(formsDir, `${relativePath.split('/').pop()}`);
    });

    for (const filePath of absolutePaths) {
        if (existsSync(filePath) && !force) {
            return {
                ok: false,
                error: `Target already exists: ${filePath}. Use --force to overwrite.`
            };
        }
    }

    mkdirSync(formsDir, { recursive: true });
    mkdirSync(storageDir, { recursive: true });

    for (const [relativePath, content] of Object.entries(outputFiles)) {
        const filePath = relativePath.startsWith('storage/')
            ? join(storageDir, `${fileBase}.history.json`)
            : join(formsDir, `${relativePath.split('/').pop()}`);
        writeFileSync(filePath, content);
    }

    return {
        ok: true,
        appName: appName || null,
        name: fileBase,
        layout,
        fields,
        model: model || null,
        action: action || null,
        files: Object.keys(outputFiles).map((relativePath) => {
            return relativePath.startsWith('storage/')
                ? join(storageDir, `${fileBase}.history.json`)
                : join(formsDir, `${relativePath.split('/').pop()}`);
        })
    };
}

export function createStyleInlineArtifacts(projectRoot, name, options = {}) {
    const appName = options.appName || '';
    const force = options.force === true;
    const fileBase = normalizeName(name);

    const appRoot = appName ? join(projectRoot, 'apps', appName) : projectRoot;
    const styleDir = join(appRoot, 'admin', 'styles');
    const storageDir = appName
        ? join(projectRoot, 'storage', 'admin', appName, 'styles')
        : join(projectRoot, 'storage', 'admin', 'styles');

    const artifacts = buildStyleInlineArtifacts(fileBase, options);
    const outputFiles = {
        [`admin/styles/${fileBase}.inline.css`]: artifacts.inlineCss,
        [`admin/styles/${fileBase}.inline.tokens.json`]: JSON.stringify(artifacts.inlineTokens, null, 2),
        [`admin/styles/${fileBase}.inline.preview.js`]: artifacts.preview,
        [`admin/styles/${fileBase}.inline.preview.data.json`]: artifacts.previewData,
        [`admin/styles/${fileBase}.inline.validation.js`]: artifacts.validation,
        [`admin/styles/${fileBase}.inline.publish.js`]: artifacts.publish,
        [`admin/styles/${fileBase}.inline.rollback.js`]: artifacts.rollback,
        [`admin/styles/${fileBase}.inline.test.js`]: artifacts.test,
        [`storage/admin/styles/${fileBase}.inline.history.json`]: JSON.stringify({
            id: fileBase,
            name: fileBase,
            appName: appName || null,
            hasPreviewData: true,
            hasValidation: true,
            hasPublishHelper: true,
            hasRollbackHelper: true,
            revisions: [
                {
                    version: 1,
                    css: `${fileBase}.inline.css`,
                    createdAt: new Date().toISOString()
                }
            ]
        }, null, 2)
    };

    const absolutePaths = Object.keys(outputFiles).map((relativePath) => {
        if (relativePath.startsWith('storage/')) {
            return join(storageDir, `${fileBase}.inline.history.json`);
        }
        return join(styleDir, `${relativePath.split('/').pop()}`);
    });

    for (const filePath of absolutePaths) {
        if (existsSync(filePath) && !force) {
            return {
                ok: false,
                error: `Target already exists: ${filePath}. Use --force to overwrite.`
            };
        }
    }

    mkdirSync(styleDir, { recursive: true });
    mkdirSync(storageDir, { recursive: true });

    for (const [relativePath, content] of Object.entries(outputFiles)) {
        const filePath = relativePath.startsWith('storage/')
            ? join(storageDir, `${fileBase}.inline.history.json`)
            : join(styleDir, `${relativePath.split('/').pop()}`);
        writeFileSync(filePath, content);
    }

    return {
        ok: true,
        appName: appName || null,
        name: fileBase,
        selector: artifacts.inlineTokens.selector,
        states: artifacts.inlineTokens.states,
        cssModule: artifacts.inlineTokens.cssModule,
        files: Object.keys(outputFiles).map((relativePath) => {
            return relativePath.startsWith('storage/')
                ? join(storageDir, `${fileBase}.inline.history.json`)
                : join(styleDir, `${relativePath.split('/').pop()}`);
        })
    };
}
