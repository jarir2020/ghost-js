const basePackageJson = (projectName) => ({
    name: projectName,
    version: '1.0.0',
    type: 'module',
    dependencies: {
        '@ghost-js/core': '0.2.0',
        '@ghost-js/events': '0.2.0',
        '@ghost-js/database': '0.2.0',
        '@ghost-js/paradigms': '0.2.0',
        '@ghost-js/router': '0.2.0',
        '@ghost-js/cli': '0.2.1'
    },
    scripts: {
        dev: 'ghost dev',
        build: 'ghost build',
        doctor: 'ghost doctor'
    }
});

const baseIndex = (projectName, template) => `
import { mount, initDevTools } from '@ghost-js/core';
import { signal } from '@ghost-js/core';

initDevTools();

const count = signal(0);

const App = () => ({
    tag: 'main',
    props: { class: '${template}-starter' },
    children: [
        { tag: 'h1', props: {}, children: ['${projectName}'] },
        { tag: 'p', props: {}, children: ['Starter template: ${template}'] },
        {
            tag: 'button',
            props: { onclick: () => count.set(count.get() + 1) },
            children: [() => \`Clicks: \${count.get()}\`]
        }
    ]
});

mount(App(), document.body);
`.trim();

const adminDashboardModule = (projectName, template) => `
export function AdminDashboard(props = {}) {
    const metrics = props.metrics ?? [];

    return {
        tag: 'section',
        props: { class: 'admin-dashboard', 'data-template': '${template}' },
        children: [
            { tag: 'h2', props: {}, children: ['${projectName} Admin Dashboard'] },
            { tag: 'p', props: {}, children: ['Project summary, recent changes, and health checks.'] },
            {
                tag: 'ul',
                props: {},
                children: metrics.length
                    ? metrics.map((metric) => ({
                        tag: 'li',
                        props: {},
                        children: [String(metric.label ?? metric)]
                    }))
                    : [
                        { tag: 'li', props: {}, children: ['No metrics yet'] }
                    ]
            }
        ]
    };
}

export const adminDashboardMeta = {
    name: 'AdminDashboard',
    description: 'Project summaries, recent changes, and health checks.'
};

export default AdminDashboard;
`.trim();

const formBuilderModule = (projectName, template) => `
export function FormBuilder(props = {}) {
    const fields = props.fields ?? [];
    const layout = props.layout ?? 'single-column';

    return {
        tag: 'section',
        props: { class: 'form-builder', 'data-template': '${template}' },
        children: [
            { tag: 'h2', props: {}, children: ['${projectName} Form Builder'] },
            { tag: 'p', props: {}, children: ['Drag-and-drop fields, validation rules, and bindings.'] },
            {
                tag: 'div',
                props: { class: 'form-layout', 'data-layout': layout },
                children: fields.length
                    ? fields.map((field) => ({
                        tag: 'div',
                        props: { class: 'form-field' },
                        children: [String(field.label ?? field)]
                    }))
                    : [{ tag: 'div', props: {}, children: ['No fields yet'] }]
            }
        ]
    };
}

export const formBuilderMeta = {
    name: 'FormBuilder',
    description: 'Field layout, validation, and binding design.'
};

export default FormBuilder;
`.trim();

const cssEditorModule = (projectName, template) => `
export function CssEditor(props = {}) {
    const rules = props.rules ?? [];
    const palette = props.palette ?? [];

    return {
        tag: 'section',
        props: { class: 'css-editor', 'data-template': '${template}' },
        children: [
            { tag: 'h2', props: {}, children: ['${projectName} CSS Editor'] },
            { tag: 'p', props: {}, children: ['Global tokens, theme overrides, and reusable style blocks.'] },
            {
                tag: 'div',
                props: { class: 'css-editor-palette' },
                children: palette.length
                    ? palette.map((item) => ({
                        tag: 'button',
                        props: { type: 'button' },
                        children: [String(item.label ?? item)]
                    }))
                    : [{ tag: 'div', props: {}, children: ['No palette presets yet'] }]
            },
            {
                tag: 'pre',
                props: { class: 'css-editor-rules' },
                children: [rules.length ? rules.map((rule) => String(rule.selector ?? rule)).join('\\n') : '/* No rules yet */']
            }
        ]
    };
}

export const cssEditorMeta = {
    name: 'CssEditor',
    description: 'Global CSS tokens, overrides, and reusable style blocks.'
};

export default CssEditor;
`.trim();

const sharedHtml = (projectName) => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${projectName}</title>
</head>
<body>
    <script type="module">
        const candidates = ['/dist/dev/bundle.js', '/dist/build/bundle.js'];
        for (const source of candidates) {
            try {
                await import(source);
                break;
            } catch {
                // Try the next isolated output directory.
            }
        }
    </script>
</body>
</html>
`.trim();

export const starterTemplates = {
    blog: {
        description: 'Posts, categories, auth shell, admin layout, and SEO defaults.',
        packageJson: basePackageJson,
        files: {
            'src/index.js': (projectName) => baseIndex(projectName, 'blog'),
            'src/routes/home.js': () => `export const homeRoute = { path: '/', component: 'BlogHome' };`,
            'src/layouts/admin.js': () => `export const adminLayout = { name: 'AdminLayout' };`,
            'src/admin/modules/AdminDashboard.js': (projectName) => adminDashboardModule(projectName, 'blog'),
            'src/admin/modules/FormBuilder.js': (projectName) => formBuilderModule(projectName, 'blog'),
            'src/admin/modules/CssEditor.js': (projectName) => cssEditorModule(projectName, 'blog'),
            'src/admin/forms/post.schema.json': () => JSON.stringify({
                id: 'post',
                name: 'Post',
                version: 1,
                fields: ['title', 'slug', 'body'],
                layout: 'single-column',
                actions: ['save-draft', 'publish']
            }, null, 2)
        }
    },
    'admin-panel': {
        description: 'Users, roles, permissions, tables, forms, and sidebar navigation.',
        packageJson: basePackageJson,
        files: {
            'src/index.js': (projectName) => baseIndex(projectName, 'admin-panel'),
            'src/admin/dashboard.js': () => `export const adminDashboard = { title: 'Dashboard' };`,
            'src/admin/modules/AdminDashboard.js': (projectName) => adminDashboardModule(projectName, 'admin-panel'),
            'src/admin/modules/FormBuilder.js': (projectName) => formBuilderModule(projectName, 'admin-panel'),
            'src/admin/modules/CssEditor.js': (projectName) => cssEditorModule(projectName, 'admin-panel'),
            'src/admin/forms/user.schema.json': () => JSON.stringify({
                id: 'user',
                name: 'User',
                version: 1,
                fields: ['name', 'email', 'role'],
                layout: 'two-column',
                actions: ['save', 'reset']
            }, null, 2)
        }
    },
    saas: {
        description: 'Auth, billing shell, dashboard, plans, subscriptions, and onboarding.',
        packageJson: basePackageJson,
        files: {
            'src/index.js': (projectName) => baseIndex(projectName, 'saas'),
            'src/routes/dashboard.js': () => `export const dashboardRoute = { path: '/dashboard', component: 'SaasDashboard' };`,
            'src/admin/modules/AdminDashboard.js': (projectName) => adminDashboardModule(projectName, 'saas'),
            'src/admin/modules/FormBuilder.js': (projectName) => formBuilderModule(projectName, 'saas'),
            'src/admin/modules/CssEditor.js': (projectName) => cssEditorModule(projectName, 'saas'),
            'src/admin/forms/billing.schema.json': () => JSON.stringify({
                id: 'billing',
                name: 'Billing',
                version: 1,
                fields: ['plan', 'card', 'renewal'],
                layout: 'wizard',
                actions: ['subscribe', 'cancel']
            }, null, 2)
        }
    },
    crm: {
        description: 'Contacts, companies, pipelines, notes, activity feeds, and filters.',
        packageJson: basePackageJson,
        files: {
            'src/index.js': (projectName) => baseIndex(projectName, 'crm'),
            'src/routes/pipeline.js': () => `export const pipelineRoute = { path: '/pipeline', component: 'CrmPipeline' };`,
            'src/admin/modules/AdminDashboard.js': (projectName) => adminDashboardModule(projectName, 'crm'),
            'src/admin/modules/FormBuilder.js': (projectName) => formBuilderModule(projectName, 'crm'),
            'src/admin/modules/CssEditor.js': (projectName) => cssEditorModule(projectName, 'crm'),
            'src/admin/forms/contact.schema.json': () => JSON.stringify({
                id: 'contact',
                name: 'Contact',
                version: 1,
                fields: ['first_name', 'last_name', 'company', 'email'],
                layout: 'two-column',
                actions: ['save', 'archive']
            }, null, 2)
        }
    },
    'landing-page': {
        description: 'Hero, feature sections, CTA blocks, lead form, and analytics hooks.',
        packageJson: basePackageJson,
        files: {
            'src/index.js': (projectName) => baseIndex(projectName, 'landing-page'),
            'src/routes/index.js': () => `export const landingRoute = { path: '/', component: 'LandingPage' };`,
            'src/admin/modules/AdminDashboard.js': (projectName) => adminDashboardModule(projectName, 'landing-page'),
            'src/admin/modules/FormBuilder.js': (projectName) => formBuilderModule(projectName, 'landing-page'),
            'src/admin/modules/CssEditor.js': (projectName) => cssEditorModule(projectName, 'landing-page'),
            'src/admin/forms/lead.schema.json': () => JSON.stringify({
                id: 'lead',
                name: 'Lead',
                version: 1,
                fields: ['name', 'email', 'message'],
                layout: 'single-column',
                actions: ['submit']
            }, null, 2)
        }
    },
    ecommerce: {
        description: 'Products, cart, checkout shell, orders, and customer account pages.',
        packageJson: basePackageJson,
        files: {
            'src/index.js': (projectName) => baseIndex(projectName, 'ecommerce'),
            'src/routes/store.js': () => `export const storeRoute = { path: '/store', component: 'Storefront' };`,
            'src/admin/modules/AdminDashboard.js': (projectName) => adminDashboardModule(projectName, 'ecommerce'),
            'src/admin/modules/FormBuilder.js': (projectName) => formBuilderModule(projectName, 'ecommerce'),
            'src/admin/modules/CssEditor.js': (projectName) => cssEditorModule(projectName, 'ecommerce'),
            'src/admin/forms/product.schema.json': () => JSON.stringify({
                id: 'product',
                name: 'Product',
                version: 1,
                fields: ['name', 'price', 'inventory'],
                layout: 'two-column',
                actions: ['save', 'publish']
            }, null, 2)
        }
    },
    docs: {
        description: 'Sidebar docs layout, search, changelog, code blocks, and versioning.',
        packageJson: basePackageJson,
        files: {
            'src/index.js': (projectName) => baseIndex(projectName, 'docs'),
            'src/routes/docs.js': () => `export const docsRoute = { path: '/docs', component: 'DocsPage' };`,
            'src/admin/modules/AdminDashboard.js': (projectName) => adminDashboardModule(projectName, 'docs'),
            'src/admin/modules/FormBuilder.js': (projectName) => formBuilderModule(projectName, 'docs'),
            'src/admin/modules/CssEditor.js': (projectName) => cssEditorModule(projectName, 'docs'),
            'src/admin/forms/article.schema.json': () => JSON.stringify({
                id: 'article',
                name: 'Article',
                version: 1,
                fields: ['title', 'slug', 'content'],
                layout: 'single-column',
                actions: ['save', 'publish']
            }, null, 2)
        }
    },
    portfolio: {
        description: 'Sections, projects, contact form, theme controls, and SEO defaults.',
        packageJson: basePackageJson,
        files: {
            'src/index.js': (projectName) => baseIndex(projectName, 'portfolio'),
            'src/routes/home.js': () => `export const portfolioRoute = { path: '/', component: 'PortfolioHome' };`,
            'src/admin/modules/AdminDashboard.js': (projectName) => adminDashboardModule(projectName, 'portfolio'),
            'src/admin/modules/FormBuilder.js': (projectName) => formBuilderModule(projectName, 'portfolio'),
            'src/admin/modules/CssEditor.js': (projectName) => cssEditorModule(projectName, 'portfolio'),
            'src/admin/forms/contact.schema.json': () => JSON.stringify({
                id: 'contact',
                name: 'Contact',
                version: 1,
                fields: ['name', 'email', 'message'],
                layout: 'single-column',
                actions: ['send']
            }, null, 2)
        }
    }
};

export function getStarterNames() {
    return Object.keys(starterTemplates);
}

export function getStarterTemplate(name) {
    return starterTemplates[name] ?? null;
}

export function createStarterManifest(projectName, templateName) {
    const template = getStarterTemplate(templateName);
    if (!template) {
        return null;
    }

    const manifest = {
        projectName,
        template: templateName,
        description: template.description,
        files: Object.keys(template.files)
    };

    return manifest;
}

export function createStarterFiles(projectName, templateName, options = {}) {
    const template = getStarterTemplate(templateName);
    if (!template) {
        return null;
    }

    const includeAdminModule = options.includeAdminModule !== false;
    const includeFormBuilder = options.includeFormBuilder !== false;
    const includeCssEditor = options.includeCssEditor !== false;

    const files = {
        'package.json': JSON.stringify(template.packageJson(projectName), null, 2),
        'README.md': `# ${projectName}\n\nStarter template: ${templateName}\n`,
        'index.html': sharedHtml(projectName),
    };

    for (const [path, factory] of Object.entries(template.files)) {
        if (!includeAdminModule && path.includes('src/admin/modules/AdminDashboard.js')) {
            continue;
        }
        if (!includeFormBuilder && path.includes('src/admin/modules/FormBuilder.js')) {
            continue;
        }
        if (!includeCssEditor && path.includes('src/admin/modules/CssEditor.js')) {
            continue;
        }
        files[path] = factory(projectName, templateName);
    }

    return files;
}
