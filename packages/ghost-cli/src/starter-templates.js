const basePackageJson = (projectName) => ({
    name: projectName,
    version: '1.0.0',
    type: 'module',
    dependencies: {
        '@ghost-js/core': '^1.0.0',
        '@ghost-js/events': '^1.0.0',
        '@ghost-js/database': '^1.0.0',
        '@ghost-js/paradigms': '^1.0.0',
        '@ghost-js/router': '^1.0.0',
        '@ghost-js/cli': '^1.0.2'
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

const stackViewModule = (projectName, template, stack, componentName) => `
export const ${componentName}View = {
    stack: '${stack}',
    template: '${template}',
    title: '${projectName}',
    description: '${projectName} starter for the ${stack} stack'
};

export default ${componentName}View;
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
    <script type="module" data-ghost-runtime-loader>
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

function createExampleStarterTemplate(spec) {
    const routeFile = spec.routeFile || 'home';
    const routeConst = spec.routeConst || `${routeFile.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())}Route`;
    const schemaFields = spec.schemaFields || ['title', 'slug', 'description'];

    return {
        description: spec.description,
        packageJson: basePackageJson,
        files: {
            'src/index.js': (projectName) => baseIndex(projectName, spec.name),
            [`src/routes/${routeFile}.js`]: () => `export const ${routeConst} = { path: '${spec.routePath || `/${routeFile}`}', component: '${spec.componentName || `${spec.name}-page`}' };`,
            'src/admin/modules/AdminDashboard.js': (projectName) => adminDashboardModule(projectName, spec.name),
            'src/admin/modules/FormBuilder.js': (projectName) => formBuilderModule(projectName, spec.name),
            'src/admin/modules/CssEditor.js': (projectName) => cssEditorModule(projectName, spec.name),
            [`src/admin/forms/${spec.schemaId || spec.name}.schema.json`]: () => JSON.stringify({
                id: spec.schemaId || spec.name,
                name: spec.schemaName || spec.name,
                version: 1,
                fields: schemaFields,
                layout: spec.layout || 'single-column',
                actions: spec.actions || ['save', 'publish']
            }, null, 2)
        }
    };
}

function createFrontendStackStarterTemplate(spec) {
    const routeFile = spec.routeFile || 'home';
    const routeConst = spec.routeConst || `${routeFile.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())}Route`;
    const schemaFields = spec.schemaFields || ['title', 'slug', 'description'];
    const stack = spec.stack || 'frontend';
    const componentName = spec.componentName || `${spec.name.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())}Page`;

    return {
        description: spec.description,
        stack,
        packageJson: basePackageJson,
        files: {
            'src/index.js': (projectName) => baseIndex(projectName, spec.name),
            [`src/routes/${routeFile}.js`]: () => `export const ${routeConst} = { path: '${spec.routePath || `/${routeFile}`}', component: '${componentName}' };`,
            [`src/views/${stack}/index.js`]: (projectName) => stackViewModule(projectName, spec.name, stack, componentName),
            'src/admin/modules/AdminDashboard.js': (projectName) => adminDashboardModule(projectName, spec.name),
            'src/admin/modules/FormBuilder.js': (projectName) => formBuilderModule(projectName, spec.name),
            'src/admin/modules/CssEditor.js': (projectName) => cssEditorModule(projectName, spec.name),
            [`src/admin/forms/${spec.schemaId || spec.name}.schema.json`]: () => JSON.stringify({
                id: spec.schemaId || spec.name,
                name: spec.schemaName || spec.name,
                version: 1,
                fields: schemaFields,
                layout: spec.layout || 'single-column',
                actions: spec.actions || ['save', 'publish']
            }, null, 2)
        }
    };
}

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
    },
    ...Object.fromEntries([
        {
            name: 'react-dashboard',
            description: 'React dashboard skeleton with KPI cards, sidebar nav, and settings pages.',
            stack: 'react',
            routeFile: 'dashboard',
            routePath: '/dashboard',
            componentName: 'ReactDashboard',
            schemaId: 'react-dashboard',
            schemaName: 'ReactDashboard',
            schemaFields: ['metric', 'card', 'sidebar'],
            layout: 'two-column'
        },
        {
            name: 'react-commerce',
            description: 'React commerce skeleton with products, cart, checkout, and account pages.',
            stack: 'react',
            routeFile: 'store',
            routePath: '/store',
            componentName: 'ReactCommerce',
            schemaId: 'react-commerce',
            schemaName: 'ReactCommerce',
            schemaFields: ['product', 'cart', 'checkout'],
            layout: 'two-column'
        },
        {
            name: 'vue-admin',
            description: 'Vue admin skeleton with dashboards, tables, and reusable panel shells.',
            stack: 'vue',
            routeFile: 'admin',
            routePath: '/admin',
            componentName: 'VueAdmin',
            schemaId: 'vue-admin',
            schemaName: 'VueAdmin',
            schemaFields: ['users', 'roles', 'table'],
            layout: 'two-column'
        },
        {
            name: 'vue-marketing',
            description: 'Vue marketing skeleton with hero blocks, lead forms, and CTA sections.',
            stack: 'vue',
            routeFile: 'marketing',
            routePath: '/',
            componentName: 'VueMarketing',
            schemaId: 'vue-marketing',
            schemaName: 'VueMarketing',
            schemaFields: ['hero', 'cta', 'lead'],
            layout: 'single-column'
        },
        {
            name: 'next-docs',
            description: 'Next.js docs skeleton with nested navigation, versioning, and changelog pages.',
            stack: 'next',
            routeFile: 'docs',
            routePath: '/docs',
            componentName: 'NextDocs',
            schemaId: 'next-docs',
            schemaName: 'NextDocs',
            schemaFields: ['doc', 'version', 'section'],
            layout: 'single-column'
        },
        {
            name: 'next-ssr',
            description: 'Next.js server-rendered app skeleton with landing, auth, and dashboard pages.',
            stack: 'next',
            routeFile: 'app',
            routePath: '/',
            componentName: 'NextSsr',
            schemaId: 'next-ssr',
            schemaName: 'NextSsr',
            schemaFields: ['page', 'auth', 'dashboard'],
            layout: 'two-column'
        },
        {
            name: 'nuxt-portal',
            description: 'Nuxt portal skeleton with login, profile, and settings views.',
            stack: 'nuxt',
            routeFile: 'portal',
            routePath: '/portal',
            componentName: 'NuxtPortal',
            schemaId: 'nuxt-portal',
            schemaName: 'NuxtPortal',
            schemaFields: ['login', 'profile', 'settings'],
            layout: 'two-column'
        },
        {
            name: 'svelte-studio',
            description: 'Svelte studio skeleton with responsive panels, editor tools, and previews.',
            stack: 'svelte',
            routeFile: 'studio',
            routePath: '/studio',
            componentName: 'SvelteStudio',
            schemaId: 'svelte-studio',
            schemaName: 'SvelteStudio',
            schemaFields: ['editor', 'preview', 'panel'],
            layout: 'two-column'
        },
        {
            name: 'angular-enterprise',
            description: 'Angular enterprise skeleton with shells, guards, and feature modules.',
            stack: 'angular',
            routeFile: 'enterprise',
            routePath: '/enterprise',
            componentName: 'AngularEnterprise',
            schemaId: 'angular-enterprise',
            schemaName: 'AngularEnterprise',
            schemaFields: ['module', 'guard', 'shell'],
            layout: 'two-column'
        },
        {
            name: 'alpine-minimal',
            description: 'Alpine.js minimal skeleton for quick interactivity and simple shells.',
            stack: 'alpine',
            routeFile: 'minimal',
            routePath: '/',
            componentName: 'AlpineMinimal',
            schemaId: 'alpine-minimal',
            schemaName: 'AlpineMinimal',
            schemaFields: ['toggle', 'drawer', 'toast'],
            layout: 'single-column'
        },
        {
            name: 'preact-lite',
            description: 'Preact lightweight skeleton with fast UI updates and tiny bundles.',
            stack: 'preact',
            routeFile: 'lite',
            routePath: '/lite',
            componentName: 'PreactLite',
            schemaId: 'preact-lite',
            schemaName: 'PreactLite',
            schemaFields: ['card', 'list', 'form'],
            layout: 'single-column'
        },
        {
            name: 'lit-ui',
            description: 'Lit element skeleton with web components, design tokens, and slots.',
            stack: 'lit',
            routeFile: 'ui',
            routePath: '/ui',
            componentName: 'LitUi',
            schemaId: 'lit-ui',
            schemaName: 'LitUi',
            schemaFields: ['element', 'slot', 'theme'],
            layout: 'single-column'
        }
    ].map((spec) => [spec.name, createFrontendStackStarterTemplate(spec)])),
    ...Object.fromEntries([
        {
            name: 'marketing-site',
            description: 'Homepage, pricing, testimonials, lead capture, and CTA sections.',
            routeFile: 'landing',
            routePath: '/',
            componentName: 'MarketingLanding',
            schemaId: 'marketing',
            schemaName: 'Marketing',
            schemaFields: ['headline', 'subheadline', 'cta', 'email'],
            layout: 'single-column'
        },
        {
            name: 'startup-launch',
            description: 'Hero, waitlist form, feature grid, and launch countdown.',
            routeFile: 'launch',
            routePath: '/',
            componentName: 'StartupLaunch',
            schemaId: 'launch',
            schemaName: 'Launch',
            schemaFields: ['hero', 'waitlist', 'announcement'],
            layout: 'single-column'
        },
        {
            name: 'app-shell',
            description: 'Sidebar shell, topbar, dashboard cards, and settings surfaces.',
            routeFile: 'dashboard',
            routePath: '/dashboard',
            componentName: 'AppShell',
            schemaId: 'shell',
            schemaName: 'Shell',
            schemaFields: ['name', 'theme', 'layout'],
            layout: 'two-column'
        },
        {
            name: 'dashboard-lite',
            description: 'Charts, quick actions, recent activity, and a clean KPI grid.',
            routeFile: 'dashboard',
            routePath: '/dashboard',
            componentName: 'DashboardLite',
            schemaId: 'dashboard',
            schemaName: 'Dashboard',
            schemaFields: ['kpi', 'activity', 'alerts'],
            layout: 'two-column'
        },
        {
            name: 'analytics-board',
            description: 'Metrics tiles, trend charts, filters, and reporting blocks.',
            routeFile: 'analytics',
            routePath: '/analytics',
            componentName: 'AnalyticsBoard',
            schemaId: 'analytics',
            schemaName: 'Analytics',
            schemaFields: ['metric', 'range', 'comparison'],
            layout: 'two-column'
        },
        {
            name: 'admin-lite',
            description: 'Users, roles, audit trails, and operational action panels.',
            routeFile: 'admin',
            routePath: '/admin',
            componentName: 'AdminLite',
            schemaId: 'admin',
            schemaName: 'Admin',
            schemaFields: ['users', 'roles', 'audit'],
            layout: 'two-column'
        },
        {
            name: 'ops-center',
            description: 'Incident queue, service health, deploy status, and alert review.',
            routeFile: 'ops',
            routePath: '/ops',
            componentName: 'OpsCenter',
            schemaId: 'ops',
            schemaName: 'Operations',
            schemaFields: ['incident', 'service', 'priority'],
            layout: 'two-column'
        },
        {
            name: 'support-center',
            description: 'Help desk ticketing, SLA tracking, canned replies, and search.',
            routeFile: 'support',
            routePath: '/support',
            componentName: 'SupportCenter',
            schemaId: 'support',
            schemaName: 'Support',
            schemaFields: ['ticket', 'priority', 'assignee'],
            layout: 'single-column'
        },
        {
            name: 'knowledge-base',
            description: 'Article cards, sidebar navigation, search, and versioned docs.',
            routeFile: 'knowledge',
            routePath: '/knowledge',
            componentName: 'KnowledgeBase',
            schemaId: 'knowledge',
            schemaName: 'Knowledge',
            schemaFields: ['title', 'section', 'version'],
            layout: 'single-column'
        },
        {
            name: 'documentation-site',
            description: 'Left nav docs layout with code blocks, examples, and changelog.',
            routeFile: 'docs',
            routePath: '/docs',
            componentName: 'DocumentationSite',
            schemaId: 'documentation',
            schemaName: 'Documentation',
            schemaFields: ['title', 'slug', 'content'],
            layout: 'single-column'
        },
        {
            name: 'blog-magazine',
            description: 'Hero stories, category feeds, author cards, and newsletter capture.',
            routeFile: 'blog',
            routePath: '/blog',
            componentName: 'BlogMagazine',
            schemaId: 'magazine',
            schemaName: 'Magazine',
            schemaFields: ['title', 'author', 'excerpt'],
            layout: 'single-column'
        },
        {
            name: 'podcast-show',
            description: 'Episode list, host cards, embedded players, and subscriber CTA.',
            routeFile: 'podcast',
            routePath: '/podcast',
            componentName: 'PodcastShow',
            schemaId: 'podcast',
            schemaName: 'Podcast',
            schemaFields: ['episode', 'host', 'description'],
            layout: 'single-column'
        },
        {
            name: 'newsletter',
            description: 'Signup hero, archive grid, preferences form, and sponsor block.',
            routeFile: 'newsletter',
            routePath: '/newsletter',
            componentName: 'Newsletter',
            schemaId: 'newsletter',
            schemaName: 'Newsletter',
            schemaFields: ['email', 'frequency', 'topics'],
            layout: 'single-column'
        },
        {
            name: 'course-platform',
            description: 'Curriculum cards, lesson list, progress tracker, and enrollment form.',
            routeFile: 'courses',
            routePath: '/courses',
            componentName: 'CoursePlatform',
            schemaId: 'course',
            schemaName: 'Course',
            schemaFields: ['lesson', 'progress', 'quiz'],
            layout: 'two-column'
        },
        {
            name: 'school-portal',
            description: 'Classroom dashboard, assignments, schedule, and notices.',
            routeFile: 'school',
            routePath: '/school',
            componentName: 'SchoolPortal',
            schemaId: 'school',
            schemaName: 'School',
            schemaFields: ['course', 'teacher', 'deadline'],
            layout: 'two-column'
        },
        {
            name: 'forum-hub',
            description: 'Threads, replies, moderation panel, and community guidelines.',
            routeFile: 'forum',
            routePath: '/forum',
            componentName: 'ForumHub',
            schemaId: 'forum',
            schemaName: 'Forum',
            schemaFields: ['thread', 'reply', 'tag'],
            layout: 'single-column'
        },
        {
            name: 'community-hub',
            description: 'Members, events, groups, and discussion widgets.',
            routeFile: 'community',
            routePath: '/community',
            componentName: 'CommunityHub',
            schemaId: 'community',
            schemaName: 'Community',
            schemaFields: ['member', 'group', 'event'],
            layout: 'two-column'
        },
        {
            name: 'social-feed',
            description: 'Post stream, reactions, composer, and profile cards.',
            routeFile: 'feed',
            routePath: '/feed',
            componentName: 'SocialFeed',
            schemaId: 'feed',
            schemaName: 'Feed',
            schemaFields: ['post', 'reaction', 'comment'],
            layout: 'single-column'
        },
        {
            name: 'marketplace',
            description: 'Listings, filters, seller cards, checkout, and saved items.',
            routeFile: 'marketplace',
            routePath: '/marketplace',
            componentName: 'Marketplace',
            schemaId: 'marketplace',
            schemaName: 'Marketplace',
            schemaFields: ['listing', 'seller', 'price'],
            layout: 'two-column'
        },
        {
            name: 'storefront',
            description: 'Category browse, product tiles, cart preview, and checkout steps.',
            routeFile: 'store',
            routePath: '/store',
            componentName: 'Storefront',
            schemaId: 'storefront',
            schemaName: 'Storefront',
            schemaFields: ['product', 'cart', 'checkout'],
            layout: 'two-column'
        },
        {
            name: 'booking-app',
            description: 'Calendar picker, availability cards, payment step, and confirmation.',
            routeFile: 'booking',
            routePath: '/booking',
            componentName: 'BookingApp',
            schemaId: 'booking',
            schemaName: 'Booking',
            schemaFields: ['date', 'time', 'guest'],
            layout: 'wizard'
        },
        {
            name: 'event-site',
            description: 'Schedule, speakers, tickets, venue map, and registration.',
            routeFile: 'event',
            routePath: '/event',
            componentName: 'EventSite',
            schemaId: 'event',
            schemaName: 'Event',
            schemaFields: ['speaker', 'session', 'ticket'],
            layout: 'single-column'
        },
        {
            name: 'restaurant-site',
            description: 'Menu cards, reservation form, chef spotlight, and hours.',
            routeFile: 'restaurant',
            routePath: '/restaurant',
            componentName: 'RestaurantSite',
            schemaId: 'restaurant',
            schemaName: 'Restaurant',
            schemaFields: ['dish', 'reservation', 'hour'],
            layout: 'single-column'
        },
        {
            name: 'travel-guide',
            description: 'Destination cards, itinerary planner, booking CTA, and maps.',
            routeFile: 'travel',
            routePath: '/travel',
            componentName: 'TravelGuide',
            schemaId: 'travel',
            schemaName: 'Travel',
            schemaFields: ['destination', 'date', 'passenger'],
            layout: 'two-column'
        },
        {
            name: 'real-estate',
            description: 'Property search, listing cards, contact agent, and map view.',
            routeFile: 'real-estate',
            routePath: '/properties',
            componentName: 'RealEstate',
            schemaId: 'property',
            schemaName: 'Property',
            schemaFields: ['address', 'price', 'bedrooms'],
            layout: 'two-column'
        },
        {
            name: 'fitness-tracker',
            description: 'Workout cards, progress charts, goal form, and habit streaks.',
            routeFile: 'fitness',
            routePath: '/fitness',
            componentName: 'FitnessTracker',
            schemaId: 'fitness',
            schemaName: 'Fitness',
            schemaFields: ['goal', 'workout', 'streak'],
            layout: 'two-column'
        },
        {
            name: 'music-studio',
            description: 'Track list, waveform placeholders, upload form, and release notes.',
            routeFile: 'music',
            routePath: '/music',
            componentName: 'MusicStudio',
            schemaId: 'music',
            schemaName: 'Music',
            schemaFields: ['track', 'release', 'artist'],
            layout: 'single-column'
        },
        {
            name: 'photo-gallery',
            description: 'Masonry gallery, tag filters, upload form, and image details.',
            routeFile: 'gallery',
            routePath: '/gallery',
            componentName: 'PhotoGallery',
            schemaId: 'gallery',
            schemaName: 'Gallery',
            schemaFields: ['image', 'caption', 'album'],
            layout: 'single-column'
        },
        {
            name: 'video-channel',
            description: 'Video cards, playlist sidebar, upload flow, and channel stats.',
            routeFile: 'video',
            routePath: '/video',
            componentName: 'VideoChannel',
            schemaId: 'video',
            schemaName: 'Video',
            schemaFields: ['video', 'playlist', 'channel'],
            layout: 'two-column'
        },
        {
            name: 'jobs-board',
            description: 'Open roles, filters, application form, and candidate pipeline.',
            routeFile: 'jobs',
            routePath: '/jobs',
            componentName: 'JobsBoard',
            schemaId: 'jobs',
            schemaName: 'Jobs',
            schemaFields: ['role', 'location', 'seniority'],
            layout: 'two-column'
        },
        {
            name: 'finance-dashboard',
            description: 'Revenue cards, subscription metrics, trend charts, and invoices.',
            routeFile: 'finance',
            routePath: '/finance',
            componentName: 'FinanceDashboard',
            schemaId: 'finance',
            schemaName: 'Finance',
            schemaFields: ['revenue', 'currency', 'forecast'],
            layout: 'two-column'
        },
        {
            name: 'healthcare-portal',
            description: 'Patient dashboard, appointments, records, and secure forms.',
            routeFile: 'healthcare',
            routePath: '/healthcare',
            componentName: 'HealthcarePortal',
            schemaId: 'healthcare',
            schemaName: 'Healthcare',
            schemaFields: ['patient', 'appointment', 'record'],
            layout: 'two-column'
        },
        {
            name: 'portfolio-modern',
            description: 'Case studies, testimonials, contact form, and visual hero blocks.',
            routeFile: 'portfolio',
            routePath: '/',
            componentName: 'PortfolioModern',
            schemaId: 'portfolio-modern',
            schemaName: 'Portfolio Modern',
            schemaFields: ['project', 'testimonial', 'contact'],
            layout: 'single-column'
        }
    ].map((spec) => [spec.name, createExampleStarterTemplate(spec)]))
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
