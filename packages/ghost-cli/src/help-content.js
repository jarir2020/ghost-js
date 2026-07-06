import { getStarterNames, getStarterTemplate } from './starter-templates.js';

export const HELP_SCHEMA_SUMMARY = 'Shared schema: `kind`, `schemaVersion`, `title`, `topic`, `guided`, `sections`, `catalog`';

const commandCatalog = [
    {
        name: 'ghost init',
        purpose: 'create a new project',
        category: 'project',
        outputs: ['apps/<name>/', 'storage/', 'index.html']
    },
    {
        name: 'ghost init --guided',
        purpose: 'answer prompts for a starter',
        category: 'project',
        outputs: ['apps/<name>/', 'storage/', 'index.html']
    },
    {
        name: 'ghost make:starter <name>',
        purpose: 'scaffold a starter template',
        category: 'starter',
        outputs: ['apps/<name>/']
    },
    {
        name: 'ghost doctor',
        purpose: 'inspect a project',
        category: 'diagnostics',
        outputs: ['report only']
    },
    {
        name: 'ghost doctor --fix',
        purpose: 'repair missing starter files',
        category: 'diagnostics',
        outputs: ['project files', 'storage manifests']
    },
    {
        name: 'ghost doctor --memory',
        purpose: 'inspect heap and cache pressure',
        category: 'diagnostics',
        outputs: ['memory report', '.ghost/cache/', '.ghost/manifests/']
    },
    {
        name: 'ghost help',
        purpose: 'show the main help screen',
        category: 'help',
        outputs: ['help text']
    },
    {
        name: 'ghost help <topic>',
        purpose: 'show a topic-specific help page',
        category: 'help',
        outputs: ['help text', 'structured help JSON']
    },
    {
        name: 'ghost help starters',
        purpose: 'browse the starter gallery by stack',
        category: 'help',
        outputs: ['help text', 'structured starter catalog']
    },
    {
        name: 'ghost make:form-builder <name>',
        purpose: 'scaffold a form builder workspace',
        category: 'visual-builder',
        outputs: ['apps/<name>/admin/forms/']
    },
    {
        name: 'ghost make:css-editor <name>',
        purpose: 'scaffold a CSS editor workspace',
        category: 'visual-builder',
        outputs: ['apps/<name>/admin/styles/']
    },
    {
        name: 'ghost make:style-inline <component>',
        purpose: 'scaffold inline style helpers',
        category: 'visual-builder',
        outputs: ['apps/<name>/admin/styles/']
    },
    {
        name: 'ghost make:controller <name>',
        purpose: 'scaffold a backend controller',
        category: 'backend',
        outputs: ['server/controllers/']
    },
    {
        name: 'ghost make:model <name>',
        purpose: 'scaffold a backend model',
        category: 'backend',
        outputs: ['database/models/']
    },
    {
        name: 'ghost make:migration <name>',
        purpose: 'scaffold a database migration',
        category: 'backend',
        outputs: ['database/migrations/']
    },
    {
        name: 'ghost make:seeder <name>',
        purpose: 'scaffold a database seeder',
        category: 'backend',
        outputs: ['database/seeders/']
    },
    {
        name: 'ghost make:factory <name>',
        purpose: 'scaffold a database factory',
        category: 'backend',
        outputs: ['database/factories/']
    },
    {
        name: 'ghost make:middleware <name>',
        purpose: 'scaffold a middleware',
        category: 'backend',
        outputs: ['server/middleware/']
    },
    {
        name: 'ghost make:request <name>',
        purpose: 'scaffold a request validator',
        category: 'backend',
        outputs: ['requests/']
    },
    {
        name: 'ghost make:dto <name>',
        purpose: 'scaffold a DTO',
        category: 'backend',
        outputs: ['dto/']
    },
    {
        name: 'ghost make:transformer <name>',
        purpose: 'scaffold a transformer',
        category: 'backend',
        outputs: ['transformers/']
    },
    {
        name: 'ghost make:resource <name>',
        purpose: 'scaffold an API resource',
        category: 'backend',
        outputs: ['api/resources/']
    },
    {
        name: 'ghost make:view <name>',
        purpose: 'scaffold a page view',
        category: 'backend',
        outputs: ['pages/']
    },
    {
        name: 'ghost make:server-action <name>',
        purpose: 'scaffold a server action',
        category: 'backend',
        outputs: ['server/actions/']
    },
    {
        name: 'ghost make:event <name>',
        purpose: 'scaffold an event record',
        category: 'backend',
        outputs: ['events/']
    },
    {
        name: 'ghost make:listener <name>',
        purpose: 'scaffold an event listener',
        category: 'backend',
        outputs: ['listeners/']
    },
    {
        name: 'ghost make:job <name>',
        purpose: 'scaffold a queued job',
        category: 'backend',
        outputs: ['jobs/']
    },
    {
        name: 'ghost make:events <name> [--with-auth] [--with-crud] [--with-notifications]',
        purpose: 'scaffold a full event bundle with optional auth/crud integration',
        category: 'backend',
        outputs: ['events/', 'listeners/', 'jobs/']
    },
    {
        name: 'ghost make:crud <name>',
        purpose: 'scaffold a CRUD backend surface',
        category: 'backend',
        outputs: ['events/', 'jobs/', 'listeners/', 'server/', 'database/', 'requests/', 'dto/', 'transformers/', 'api/', 'pages/', 'routes/']
    },
    {
        name: 'ghost make:auth',
        purpose: 'scaffold login/logout and request flow',
        category: 'backend',
        outputs: ['events/', 'jobs/', 'listeners/', 'server/auth/', 'server/actions/', 'server/middleware/', 'requests/', 'dto/', 'transformers/', 'routes/', 'pages/']
    },
    {
        name: 'ghost make:api <name>',
        purpose: 'scaffold an API surface',
        category: 'backend',
        outputs: ['api/controllers/', 'api/resources/', 'api/routes/', 'api/tests/', 'storage/api/']
    },
    {
        name: 'ghost make:route <name>',
        purpose: 'scaffold a route group and cache export',
        category: 'backend',
        outputs: ['routes/', 'storage/routes/cache/', 'storage/routes/exports/']
    },
    {
        name: 'ghost route:list',
        purpose: 'list cached backend routes',
        category: 'backend',
        outputs: ['storage/routes/cache/']
    },
    {
        name: 'ghost route:export <name>',
        purpose: 'export a cached backend route manifest',
        category: 'backend',
        outputs: ['storage/routes/exports/']
    },
    {
        name: 'ghost route:diagnose',
        purpose: 'inspect backend route cache health',
        category: 'backend',
        outputs: ['report only']
    },
    {
        name: 'ghost build',
        purpose: 'compile the project',
        category: 'runtime',
        outputs: ['dist/build/']
    },
    {
        name: 'ghost start',
        purpose: 'build and serve the production output',
        category: 'runtime',
        outputs: ['dist/build/']
    },
    {
        name: 'ghost preview',
        purpose: 'preview the built project from dist/build/',
        category: 'runtime',
        outputs: ['dist/build/']
    },
    {
        name: 'ghost serve',
        purpose: 'serve the built project from dist/build/',
        category: 'runtime',
        outputs: ['dist/build/']
    },
    {
        name: 'ghost clean',
        purpose: 'remove isolated runtime outputs and caches',
        category: 'runtime',
        outputs: ['dist/build/', 'dist/dev/', 'dist/watch/', '.ghost/cache/', '.ghost/manifests/']
    },
    {
        name: 'ghost dev',
        purpose: 'run the dev server',
        category: 'runtime',
        outputs: ['dist/dev/']
    },
    {
        name: 'ghost watch',
        purpose: 'watch source files and rebuild in isolation',
        category: 'runtime',
        outputs: ['dist/watch/']
    },
    {
        name: 'ghost generate <component|view> <name>',
        purpose: 'make a quick component or view',
        category: 'scaffold',
        outputs: ['source files']
    }
];

const workspaceScriptsCatalog = [
    { name: 'npm run dev', purpose: 'development server', outputDir: 'dist/dev/' },
    { name: 'npm run build', purpose: 'production build', outputDir: 'dist/build/' },
    { name: 'npm run start', purpose: 'run the production build', outputDir: 'dist/build/' },
    { name: 'npm run watch', purpose: 'watch files for changes', outputDir: 'dist/watch/' },
    { name: 'npm run test', purpose: 'run tests' },
    { name: 'npm run lint', purpose: 'check code quality' },
    { name: 'npm run lint:fix', purpose: 'automatically fix lint issues' },
    { name: 'npm run format', purpose: 'format code' },
    { name: 'npm run format:check', purpose: 'check formatting' },
    { name: 'npm run preview', purpose: 'preview the production build locally' },
    { name: 'npm run serve', purpose: 'serve the application' },
    { name: 'npm run clean', purpose: 'remove build artifacts' },
    { name: 'npm run typecheck', purpose: 'check TypeScript types' },
    { name: 'npm run docs', purpose: 'generate documentation' },
    { name: 'npm run storybook', purpose: 'launch Storybook' },
    { name: 'npm run analyze', purpose: 'analyze bundle size' },
    { name: 'npm run e2e', purpose: 'run end-to-end tests' },
    { name: 'npm run coverage', purpose: 'generate test coverage' },
    { name: 'npm run prepare', purpose: 'run setup before install or publish' },
    { name: 'npm run postinstall', purpose: 'execute after npm install' },
    { name: 'npm run prebuild', purpose: 'execute before build' },
    { name: 'npm run postbuild', purpose: 'execute after build' },
    { name: 'npm run predev', purpose: 'execute before dev' },
    { name: 'npm run postdev', purpose: 'execute after dev' },
    { name: 'npm run deploy', purpose: 'deploy the app' },
    { name: 'npm run db:migrate', purpose: 'run database migrations' },
    { name: 'npm run seed', purpose: 'seed the database' }
];

function guidedIntro() {
    return [
        'Ghost.js Guided Help',
        '--------------------',
        'Ghost.js can help you build apps with three starting styles:',
        '- Begin with `ghost init --guided` if you want a full starter project.',
        '- Begin with `ghost make:starter <name>` if you already know the template you want.',
        '- Begin with `ghost doctor` if you want to check or repair a project.',
        '',
    ].join('\n');
}

function starterHelpData() {
    const templates = getStarterNames();
    return {
        title: 'Starter templates',
        items: [
            `${templates.length} starter templates available.`,
            'Browse the gallery with `ghost help starters` to see grouped stacks and template names.',
            'Recommended starters:',
            '- blog: content sites and CMS-style apps',
            '- admin-panel: internal dashboards and management tools',
            '- saas: subscription products and customer portals',
            '- crm: pipeline and contact management',
            '- landing-page: marketing sites and lead capture',
            '- ecommerce: stores and checkout flows',
            '- docs: documentation sites and knowledge bases',
            '- portfolio: personal or agency showcase sites',
            HELP_SCHEMA_SUMMARY
        ]
    };
}

function starterStackGalleryData() {
    const grouped = new Map();

    for (const name of getStarterNames()) {
        const template = getStarterTemplate(name);
        const stack = template?.stack || 'ghost-native';
        if (!grouped.has(stack)) {
            grouped.set(stack, []);
        }
        grouped.get(stack).push(name);
    }

    return {
        title: 'Starter stacks',
        items: [...grouped.entries()]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([stack, names]) => `- ${stack}: ${names.join(', ')} (${names.length})`)
    };
}

export function buildStarterCatalogData() {
    const templates = getStarterNames().map((name) => {
        const template = getStarterTemplate(name);
        return {
            name,
            description: template?.description ?? '',
            stack: template?.stack ?? 'ghost-native',
            files: Object.keys(template?.files ?? {}),
            adminModules: Object.keys(template?.files ?? {}).filter((file) => file.includes('src/admin/modules/'))
        };
    });

    const stacks = templates.reduce((acc, template) => {
        const stack = template.stack || 'ghost-native';
        const bucket = acc.get(stack) || [];
        bucket.push(template.name);
        acc.set(stack, bucket);
        return acc;
    }, new Map());

    return {
        source: 'starter-templates.js',
        templates,
        stacks: [...stacks.entries()]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([stack, names]) => ({
                stack,
                count: names.length,
                templates: names
            }))
    };
}

export function buildCommandsCatalogData() {
    return {
        source: 'commands.txt',
        commands: commandCatalog,
        workspaceScripts: workspaceScriptsCatalog
    };
}

export function buildNextCatalogData() {
    return {
        source: 'help-content.js',
        nextSteps: [
            {
                command: 'ghost init --guided',
                purpose: 'start a new app with prompts',
                category: 'onboarding'
            },
            {
                command: 'ghost doctor --fix',
                purpose: 'repair an incomplete project',
                category: 'diagnostics'
            },
            {
                command: 'ghost make:starter saas',
                purpose: 'scaffold a subscription product starter',
                category: 'starter'
            },
            {
                command: 'ghost make:form-builder ContactForm',
                purpose: 'generate admin form tooling',
                category: 'visual-builder'
            },
            {
                command: 'ghost make:css-editor ThemeEditor',
                purpose: 'generate global style control tooling',
                category: 'visual-builder'
            },
            {
                command: 'ghost make:style-inline Button',
                purpose: 'generate scoped component style tooling',
                category: 'visual-builder'
            },
            {
                command: 'ghost make:event OrderCreated',
                purpose: 'generate an event record',
                category: 'backend'
            },
            {
                command: 'ghost make:listener OrderCreated',
                purpose: 'generate an event listener',
                category: 'backend'
            },
            {
                command: 'ghost make:job SendWelcomeEmail',
                purpose: 'generate a queued job',
                category: 'backend'
            },
            {
                command: 'ghost make:events Order',
                purpose: 'generate a complete event bundle',
                category: 'backend'
            },
            {
                command: 'ghost make:events Order --with-auth',
                purpose: 'generate a complete event bundle plus auth scaffolds',
                category: 'backend'
            },
            {
                command: 'ghost make:events Order --with-crud',
                purpose: 'generate a complete event bundle plus CRUD scaffolds',
                category: 'backend'
            },
            {
                command: 'ghost make:events Order --with-notifications',
                purpose: 'generate a complete event bundle plus notification hooks',
                category: 'backend'
            },
            {
                command: 'ghost make:crud User',
                purpose: 'generate a backend CRUD surface',
                category: 'backend'
            },
            {
                command: 'ghost make:view dashboard',
                purpose: 'generate a backend page view',
                category: 'backend'
            },
            {
                command: 'ghost make:auth',
                purpose: 'generate the auth and request flow',
                category: 'backend'
            },
            {
                command: 'ghost make:route User',
                purpose: 'generate a route group and export cache',
                category: 'backend'
            },
            {
                command: 'ghost make:api User',
                purpose: 'generate a JSON API surface',
                category: 'backend'
            },
            {
                command: 'ghost route:list',
                purpose: 'inspect cached backend route manifests',
                category: 'backend'
            },
            {
                command: 'ghost route:export User',
                purpose: 'export a cached backend route manifest',
                category: 'backend'
            },
            {
                command: 'ghost route:diagnose',
                purpose: 'inspect backend route cache health',
                category: 'backend'
            }
        ]
    };
}

export function buildDoctorCatalogData() {
    return {
        source: 'help-content.js',
        doctorExamples: [
            {
                command: 'ghost doctor --json',
                mode: 'structured',
                schema: 'ghost.help'
            },
            {
                command: 'ghost doctor --json --brief',
                mode: 'compact',
                schema: 'ghost.help'
            },
            {
                command: 'ghost doctor --json --pretty',
                mode: 'pretty',
                schema: 'ghost.help'
            },
            {
                command: 'ghost doctor --json --source',
                mode: 'provenance',
                schema: 'ghost.help'
            },
            {
                command: 'ghost doctor --json --source --brief',
                mode: 'provenance-compact',
                schema: 'ghost.help'
            },
            {
                command: 'ghost doctor --json --source --pretty',
                mode: 'provenance-pretty',
                schema: 'ghost.help'
            }
        ]
    };
}

export function resolveHelpTopic(topic = null) {
    if (!topic) {
        return {
            sections: [
                commandSummaryData(),
                workspaceScriptsData(),
                starterHelpData(),
                nextStepsData(),
                doctorJsonExamplesData()
            ],
            catalog: null
        };
    }

    if (topic === 'commands') {
        return {
            sections: [commandSummaryData(), workspaceScriptsData()],
            catalog: buildCommandsCatalogData()
        };
    }

    if (topic === 'starters') {
        return {
            sections: [starterStackGalleryData(), starterHelpData()],
            catalog: buildStarterCatalogData()
        };
    }

    if (topic === 'next') {
        return {
            sections: [nextStepsData()],
            catalog: buildNextCatalogData()
        };
    }

    if (topic === 'doctor') {
        return {
            sections: [doctorJsonExamplesData()],
            catalog: buildDoctorCatalogData()
        };
    }

    return {
        sections: [
            { title: `Unknown help topic: ${topic}`, items: [] },
            commandSummaryData(),
            workspaceScriptsData(),
            starterHelpData(),
            nextStepsData(),
            doctorJsonExamplesData()
        ],
        catalog: null
    };
}

function commandSummaryData() {
    return {
        title: 'Core commands',
        items: [
            ...commandCatalog.map((command) => `\`${command.name}\` ${command.purpose}`),
            HELP_SCHEMA_SUMMARY
        ]
    };
}

function workspaceScriptsData() {
    return {
        title: 'Workspace scripts',
        items: workspaceScriptsCatalog.map((script) => {
            const suffix = script.outputDir ? ` -> ${script.outputDir}` : '';
            return `\`${script.name}\` ${script.purpose}${suffix}`;
        })
    };
}

function nextStepsData() {
    return {
        title: 'Suggested next steps',
        items: [
            '1. `ghost init --guided` for a new app.',
            '2. `ghost doctor --fix` if the app is incomplete.',
            '3. `ghost make:starter saas` for a subscription product.',
            '4. `ghost make:form-builder ContactForm` for admin tooling.',
            '5. `ghost make:css-editor ThemeEditor` for global style control.',
            '6. `ghost make:style-inline Button` for scoped component styles.',
            '7. `ghost make:event OrderCreated` for event records.',
            '8. `ghost make:listener OrderCreated` for event listeners.',
            '9. `ghost make:job SendWelcomeEmail` for queued work.',
            '10. `ghost make:events Order` for a complete event bundle.',
            '11. `ghost make:events Order --with-auth` for auth integration.',
            '12. `ghost make:events Order --with-crud` for CRUD integration.',
            '13. `ghost make:events Order --with-notifications` for notification hooks.',
            HELP_SCHEMA_SUMMARY
        ]
    };
}

function doctorJsonExamplesData() {
    return {
        title: 'Doctor JSON examples',
        items: [
            '`ghost doctor --json` print the structured report using the shared `ghost.help` envelope',
            '`ghost doctor --json --brief` print the same envelope as a compact single-line payload',
            '`ghost doctor --json --pretty` print the same envelope as a multiline payload with `kind`, `schemaVersion`, `title`, `topic`, `guided`, `sections`, and `catalog`',
            '`ghost doctor --json --source` include missing-group provenance',
            '`ghost doctor --json --source --brief` include provenance in compact form',
            '`ghost doctor --json --source --pretty` include provenance in pretty form',
            '`ghost doctor --memory` print heap usage, cache pressure, and budget status',
            '`ghost doctor --memory --json --brief` print the memory snapshot as compact JSON',
            HELP_SCHEMA_SUMMARY
        ]
    };
}

export function buildHelpEnvelope({ guided = false, topic = null, sections = [], catalog = null } = {}) {
    return {
        kind: 'ghost.help',
        schemaVersion: 1,
        title: guided ? 'Ghost.js Guided Help' : 'Ghost.js CLI Help',
        topic,
        guided,
        sections,
        catalog
    };
}

function renderSection(section) {
    return [section.title + ':', ...section.items, ''].join('\n');
}

export function renderHelpText({ guided = false, sections = [] } = {}) {
    const lines = [];

    if (guided) {
        lines.push(guidedIntro());
    } else {
        lines.push('Ghost.js CLI Help', '-----------------');
    }

    for (const section of sections) {
        lines.push(renderSection(section));
    }

    return lines.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';
}

export function buildHelpData({ guided = false, topic = null } = {}) {
    const resolved = resolveHelpTopic(topic);
    return buildHelpEnvelope({ guided, topic, sections: resolved.sections, catalog: resolved.catalog });
}

export function buildHelpText({ guided = false, topic = null } = {}) {
    return renderHelpText(buildHelpData({ guided, topic }));
}
