import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';

function parseOptions(argv = []) {
    const options = {};
    for (const token of argv) {
        if (!token.startsWith('--')) continue;
        const [key, rawValue] = token.slice(2).split('=');
        options[key] = rawValue === undefined ? true : rawValue;
    }
    return options;
}

function splitName(value) {
    return String(value || '')
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .replace(/[-_/]+/g, ' ')
        .trim()
        .split(/\s+/)
        .filter(Boolean);
}

function toPascalCase(value) {
    return splitName(value).map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()).join('');
}

function toCamelCase(value) {
    const pascal = toPascalCase(value);
    return pascal ? pascal.charAt(0).toLowerCase() + pascal.slice(1) : '';
}

function toKebabCase(value) {
    return splitName(value).map((part) => part.toLowerCase()).join('-');
}

function pluralize(value) {
    const word = toKebabCase(value);
    if (/[^aeiou]y$/.test(word)) return word.replace(/y$/, 'ies');
    if (/(s|x|z|ch|sh)$/.test(word)) return `${word}es`;
    return `${word}s`;
}

function singularize(value) {
    const word = toKebabCase(value);
    if (/(ches|shes|xes|zes|ses)$/.test(word)) return word.replace(/es$/, '');
    if (/ies$/.test(word)) return word.replace(/ies$/, 'y');
    if (/s$/.test(word) && !/ss$/.test(word)) return word.replace(/s$/, '');
    return word;
}

function resolveWorkspaceRoot(projectRoot, appName) {
    return appName ? join(projectRoot, 'apps', appName) : projectRoot;
}

function ensureWrite(projectRoot, relativePath, content, force = false) {
    const target = join(projectRoot, relativePath);
    if (existsSync(target) && !force) {
        return { path: relativePath, skipped: true };
    }
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, content);
    return { path: relativePath, skipped: false };
}

function json(content) {
    return JSON.stringify(content, null, 2);
}

function buildController(name, appName) {
    const entity = toPascalCase(name);
    const slug = toKebabCase(name);
    return `
export function ${entity}Controller() {
    return {
        index() {
            return { ok: true, view: '${slug}/index', entity: '${entity}' };
        },
        show(id) {
            return { ok: true, view: '${slug}/show', entity: '${entity}', id };
        },
        store(request = {}) {
            return { ok: true, action: 'store', entity: '${entity}', request };
        }
    };
}

export const ${toCamelCase(entity)}ControllerMeta = {
    name: '${entity}Controller',
    app: ${appName ? `'${appName}'` : 'null'},
    entity: '${entity}',
    routes: ['index', 'show', 'store', 'update', 'destroy']
};

export default ${entity}Controller;
`.trim();
}

function buildModel(name) {
    const entity = toPascalCase(name);
    const table = pluralize(entity);
    return `
import { defineModel, hasMany, belongsTo } from '@ghost-js/database';

export const ${entity} = defineModel({
    name: '${entity}',
    table: '${table}',
    fillable: ['name', 'email'],
    relations: {
        related: hasMany('${entity}', '${toKebabCase(name)}_id'),
        owner: belongsTo('${entity}', '${toKebabCase(name)}_id')
    },
    scopes: {
        active(query) {
            return query.where('active', true);
        }
    }
});

export default ${entity};
`.trim();
}

function buildMigration(name) {
    const entity = toPascalCase(name);
    const table = pluralize(entity);
    return `
export function up() {
    return {
        table: '${table}',
        columns: [
            { name: 'id', type: 'uuid', primary: true },
            { name: 'created_at', type: 'timestamp' },
            { name: 'updated_at', type: 'timestamp' }
        ]
    };
}

export function down() {
    return { dropTable: '${table}' };
}

export default { up, down };
`.trim();
}

function buildSeeder(name) {
    const entity = toPascalCase(name);
    return `
export function seed${entity}() {
    return [
        { id: 'seed-${toKebabCase(name)}-1', name: '${entity} seed record' }
    ];
}

export default seed${entity};
`.trim();
}

function buildFactory(name) {
    const entity = toPascalCase(name);
    return `
export function make${entity}Factory(overrides = {}) {
    return {
        id: overrides.id ?? 'factory-${toKebabCase(name)}',
        name: overrides.name ?? '${entity} Factory',
        ...overrides
    };
}

export default make${entity}Factory;
`.trim();
}

function buildRequest(name) {
    const entity = toPascalCase(name);
    return `
export function validate${entity}Request(data = {}) {
    const errors = [];

    if (!data || typeof data !== 'object') {
        errors.push({ field: 'request', message: 'Request data must be an object.' });
    }

    return { valid: errors.length === 0, errors, data };
}

export default validate${entity}Request;
`.trim();
}

function buildDto(name) {
    const entity = toPascalCase(name);
    return `
export function ${toCamelCase(entity)}Data(input = {}) {
    return {
        id: input.id ?? null,
        name: input.name ?? '${entity}',
        ...input
    };
}

export default ${toCamelCase(entity)}Data;
`.trim();
}

function buildTransformer(name) {
    const entity = toPascalCase(name);
    return `
export function ${entity}Transformer(record = {}) {
    return {
        id: record.id ?? null,
        name: record.name ?? '${entity}',
        summary: record.summary ?? ''
    };
}

export default ${entity}Transformer;
`.trim();
}

function buildResource(name) {
    const entity = toPascalCase(name);
    const slug = pluralize(name);
    return `
export function ${entity}Resource(record = {}) {
    return {
        data: {
            id: record.id ?? null,
            name: record.name ?? '${entity}'
        },
        links: {
            self: record.id ? \`/api/${slug}/\${record.id}\` : '/api/${slug}'
        }
    };
}

export default ${entity}Resource;
`.trim();
}

function buildApiController(name) {
    const entity = toPascalCase(name);
    const slug = pluralize(name);
    return `
import { createApiResponse, createResourceEnvelope } from '@ghost-js/database';
import { ${entity}Resource } from '../resources/${entity}Resource.js';

export function ${entity}ApiController() {
    return {
        index(records = []) {
            const data = records.map((record) => ${entity}Resource(record));
            return createApiResponse(createResourceEnvelope(data, { resource: '${slug}' }), {
                status: 200,
                message: 'OK'
            });
        },
        show(record = {}) {
            return createApiResponse(createResourceEnvelope(${entity}Resource(record), { resource: '${slug}' }), {
                status: 200,
                message: 'OK'
            });
        },
        store(payload = {}) {
            return createApiResponse(${entity}Resource(payload), {
                status: 201,
                message: 'Created'
            });
        }
    };
}

export default ${entity}ApiController;
`.trim();
}

function buildApiRoute(name, entity, options = {}) {
    const slug = pluralize(name);
    const middleware = Array.isArray(options.middleware) && options.middleware.length ? options.middleware : ['api'];
    return `
export const ${toCamelCase(entity)}ApiRoutes = [
    { method: 'GET', path: '/api/${slug}', handler: '${entity}ApiController.index', middleware: ${json(middleware)} },
    { method: 'GET', path: '/api/${slug}/:id', handler: '${entity}ApiController.show', middleware: ${json(middleware)} },
    { method: 'POST', path: '/api/${slug}', handler: '${entity}ApiController.store', middleware: ${json([...middleware, 'csrf'])} }
];

export default ${toCamelCase(entity)}ApiRoutes;
`.trim();
}

function buildMiddleware(name) {
    const middleware = toCamelCase(name);
    return `
export function ${middleware}Middleware(context = {}, next = null) {
    if (typeof next === 'function') {
        return next(context);
    }

    return { ok: true, context };
}

export default ${middleware}Middleware;
`.trim();
}

function buildServerAction(name) {
    const action = toCamelCase(name);
    return `
export async function ${action}Action(request = {}) {
    return {
        ok: true,
        action: '${action}',
        request,
        redirect: request.redirect ?? '/dashboard'
    };
}

export default ${action}Action;
`.trim();
}

function buildDomainEventBus() {
    return `
import { createEventBus, createQueuedWork } from '@ghost-js/events';

export const eventBus = createEventBus();
export const workQueue = createQueuedWork({ bus: eventBus });

export function dispatchDomainEvent(name, payload = {}, meta = {}) {
    return eventBus.emit(name, payload, meta);
}

export function queueDomainJob(name, handler, payload = {}, meta = {}) {
    return workQueue.enqueue(name, handler, payload, meta);
}

export default eventBus;
`.trim();
}

function buildCrudEventHelpers(name) {
    const entity = toPascalCase(name);
    const slug = toKebabCase(name).replace(/-/g, '.');
    const camel = toCamelCase(entity);
    return `
import { dispatchDomainEvent } from './bus.js';

export const ${camel}Events = {
    created: '${slug}.created',
    updated: '${slug}.updated',
    deleted: '${slug}.deleted'
};

export function emit${entity}Created(payload = {}) {
    return dispatchDomainEvent('${slug}.created', {
        entity: '${entity}',
        action: 'created',
        ...payload
    }, { entity: '${entity}', action: 'created' });
}

export function emit${entity}Updated(payload = {}) {
    return dispatchDomainEvent('${slug}.updated', {
        entity: '${entity}',
        action: 'updated',
        ...payload
    }, { entity: '${entity}', action: 'updated' });
}

export function emit${entity}Deleted(payload = {}) {
    return dispatchDomainEvent('${slug}.deleted', {
        entity: '${entity}',
        action: 'deleted',
        ...payload
    }, { entity: '${entity}', action: 'deleted' });
}

export default ${camel}Events;
`.trim();
}

function buildCrudJob(name, action) {
    const entity = toPascalCase(name);
    const slug = toKebabCase(name).replace(/-/g, '.');
    const jobName = `${entity}${toPascalCase(action)}Job`;
    return `
import { createJobRecord } from '@ghost-js/events';

export function ${jobName}(payload = {}) {
    return {
        ...createJobRecord('${jobName}', payload, {
            queue: 'default',
            attempts: 3,
            topic: '${slug}.${action}'
        }),
        queue: 'default',
        attempts: 3,
        handle(context = {}) {
            return {
                ok: true,
                job: '${jobName}',
                topic: '${slug}.${action}',
                payload: {
                    ...payload,
                    ...context
                }
            };
        }
    };
}

export default ${jobName};
`.trim();
}

function buildCrudListener(name, action) {
    const entity = toPascalCase(name);
    const slug = toKebabCase(name).replace(/-/g, '.');
    const listenerName = `${entity}${toPascalCase(action)}Listener`;
    const jobName = `${entity}${toPascalCase(action)}Job`;
    return `
import { eventBus, workQueue } from '../events/bus.js';
import { ${jobName} } from '../jobs/${jobName}.js';

export function ${listenerName}(handler = null) {
    return eventBus.on('${slug}.${action}', async (event) => {
        const payload = {
            entity: '${entity}',
            action: '${action}',
            event
        };
        workQueue.enqueue('${slug}.${action}.notify', ${jobName}, payload, { entity: '${entity}', action: '${action}' });
        if (typeof handler === 'function') {
            return handler(event);
        }
        return {
            ok: true,
            listener: '${listenerName}',
            topic: '${slug}.${action}'
        };
    });
}

export const ${toCamelCase(entity)}${toPascalCase(action)}ListenerMeta = {
    name: '${listenerName}',
    topic: '${slug}.${action}'
};

export default ${listenerName};
`.trim();
}

function buildAuthListener(action) {
    const topic = `auth.${action}`;
    const listenerName = `Auth${toPascalCase(action)}Listener`;
    return `
import { eventBus, workQueue } from '../events/bus.js';
import { AuthAuditJob } from '../jobs/AuthAuditJob.js';

export function ${listenerName}(handler = null) {
    return eventBus.on('${topic}', async (event) => {
        workQueue.enqueue('${topic}.audit', AuthAuditJob, event, { topic: '${topic}' });
        if (typeof handler === 'function') {
            return handler(event);
        }
        return {
            ok: true,
            listener: '${listenerName}',
            topic: '${topic}'
        };
    });
}

export const ${listenerName.charAt(0).toLowerCase() + listenerName.slice(1)}Meta = {
    name: '${listenerName}',
    topic: '${topic}'
};

export default ${listenerName};
`.trim();
}

function buildCrudListenersBootstrap(name) {
    const entity = toPascalCase(name);
    const camel = toCamelCase(entity);
    const topicBase = toKebabCase(name).replace(/-/g, '.');
    return `
import { ${entity}CreatedListener } from './${entity}CreatedListener.js';
import { ${entity}UpdatedListener } from './${entity}UpdatedListener.js';
import { ${entity}DeletedListener } from './${entity}DeletedListener.js';

export function register${entity}Listeners() {
    return [
        ${entity}CreatedListener(),
        ${entity}UpdatedListener(),
        ${entity}DeletedListener()
    ];
}

export const ${camel}ListenersMeta = {
    name: '${entity}Listeners',
    topics: ['${topicBase}.created', '${topicBase}.updated', '${topicBase}.deleted']
};

export default register${entity}Listeners;
`.trim();
}

function buildCrudController(name, appName) {
    const entity = toPascalCase(name);
    const slug = toKebabCase(name).replace(/-/g, '.');
    const baseEventImport = `../../events/${entity}Events.js`;
    return `
import { eventBus } from '../../events/bus.js';
import {
    emit${entity}Created,
    emit${entity}Updated,
    emit${entity}Deleted
} from '${baseEventImport}';
import { register${entity}Listeners } from '../../listeners/${entity}Listeners.js';

register${entity}Listeners();

export function ${entity}Controller() {
    return {
        index() {
            return { ok: true, view: '${slug}/index', entity: '${entity}', events: eventBus.history().length };
        },
        show(id) {
            return { ok: true, view: '${slug}/show', entity: '${entity}', id };
        },
        async store(request = {}) {
            const record = { ...request, entity: '${entity}' };
            await emit${entity}Created(record);
            return { ok: true, action: 'store', entity: '${entity}', request };
        },
        async update(id, request = {}) {
            const record = { id, ...request, entity: '${entity}' };
            await emit${entity}Updated(record);
            return { ok: true, action: 'update', entity: '${entity}', id, request };
        },
        async destroy(id) {
            const record = { id, entity: '${entity}' };
            await emit${entity}Deleted(record);
            return { ok: true, action: 'destroy', entity: '${entity}', id };
        }
    };
}

export const ${toCamelCase(entity)}ControllerMeta = {
    name: '${entity}Controller',
    app: ${appName ? `'${appName}'` : 'null'},
    entity: '${entity}',
    routes: ['index', 'show', 'store', 'update', 'destroy']
};

export default ${entity}Controller;
`.trim();
}

function buildEvent(name) {
    const entity = toPascalCase(name);
    const topic = toKebabCase(name).replace(/-/g, '.');
    return `
import { createEventRecord } from '@ghost-js/events';

export function ${entity}Event(payload = {}) {
    return createEventRecord('${topic}', payload, {
        source: 'ghost.event',
        title: '${entity}Event'
    });
}

export const ${toCamelCase(entity)}EventMeta = {
    name: '${entity}Event',
    topic: '${topic}'
};

export default ${entity}Event;
`.trim();
}

function buildListener(name) {
    const entity = toPascalCase(name);
    const topic = toKebabCase(name).replace(/-/g, '.');
    return `
import { createEventBus } from '@ghost-js/events';

export function ${entity}Listener(bus = createEventBus()) {
    return {
        topic: '${topic}',
        register(handler = null) {
            return bus.on('${topic}', async (event) => {
                if (typeof handler === 'function') {
                    return handler(event);
                }

                return {
                    ok: true,
                    listener: '${entity}Listener',
                    event
                };
            });
        }
    };
}

export const ${toCamelCase(entity)}ListenerMeta = {
    name: '${entity}Listener',
    topic: '${topic}'
};

export default ${entity}Listener;
`.trim();
}

function buildJob(name) {
    const entity = toPascalCase(name);
    const topic = toKebabCase(name).replace(/-/g, '.');
    return `
import { createJobRecord } from '@ghost-js/events';

export function ${entity}Job(payload = {}) {
    return {
        ...createJobRecord('${entity}Job', payload, {
            queue: 'default',
            attempts: 3,
            topic: '${topic}'
        }),
        queue: 'default',
        attempts: 3,
        handle(context = {}) {
            return {
                ok: true,
                job: '${entity}Job',
                topic: '${topic}',
                payload: {
                    ...payload,
                    ...context
                }
            };
        }
    };
}

export const ${toCamelCase(entity)}JobMeta = {
    name: '${entity}Job',
    topic: '${topic}',
    queue: 'default'
};

export default ${entity}Job;
`.trim();
}

function buildAuthService(appName) {
    return `
import { emitAuthLoggedIn, emitAuthLoggedOut } from '../../events/AuthEvents.js';
import { registerAuthListeners } from '../../listeners/AuthListeners.js';

registerAuthListeners();

export class AuthService {
    constructor({ session = null, user = null } = {}) {
        this.session = session;
        this.user = user;
    }

    async login(credentials = {}) {
        const session = {
            ok: true,
            authenticated: true,
            user: credentials.email ? { email: credentials.email, role: 'user' } : null,
            redirect: '/dashboard'
        };
        await emitAuthLoggedIn(session);
        return session;
    }

    async logout() {
        const session = { ok: true, authenticated: false, redirect: '/login' };
        await emitAuthLoggedOut(session);
        return session;
    }
}

export const authServiceMeta = {
    name: 'AuthService',
    app: ${appName ? `'${appName}'` : 'null'}
};

export default AuthService;
`.trim();
}

function buildLoginRequest() {
    return `
export function validateLoginRequest(data = {}) {
    const errors = [];

    if (typeof data.email !== 'string' || !data.email.trim()) {
        errors.push({ field: 'email', message: 'Email is required.' });
    }

    if (typeof data.password !== 'string' || !data.password.trim()) {
        errors.push({ field: 'password', message: 'Password is required.' });
    }

    return { valid: errors.length === 0, errors, data };
}

export default validateLoginRequest;
`.trim();
}

function buildSessionDto() {
    return `
export function authSessionData(input = {}) {
    return {
        id: input.id ?? null,
        email: input.email ?? null,
        role: input.role ?? 'guest',
        authenticated: Boolean(input.authenticated)
    };
}

export default authSessionData;
`.trim();
}

function buildSessionTransformer() {
    return `
export function authSessionTransformer(session = {}) {
    return {
        id: session.id ?? null,
        email: session.email ?? null,
        role: session.role ?? 'guest',
        authenticated: Boolean(session.authenticated)
    };
}

export default authSessionTransformer;
`.trim();
}

function buildLoginAction() {
    return `
import { validateLoginRequest } from '../../requests/LoginRequest.js';
import { AuthService } from '../auth/AuthService.js';

export async function loginAction(request = {}) {
    const validation = validateLoginRequest(request);
    if (!validation.valid) {
        return { ok: false, status: 422, errors: validation.errors };
    }

    const auth = new AuthService();
    return auth.login(validation.data);
}

export default loginAction;
`.trim();
}

function buildLogoutAction() {
    return `
import { AuthService } from '../auth/AuthService.js';

export async function logoutAction() {
    const auth = new AuthService();
    return auth.logout();
}

export default logoutAction;
`.trim();
}

function buildAuthEventHelpers() {
    return `
import { dispatchDomainEvent } from './bus.js';

export const authEvents = {
    loggedIn: 'auth.logged-in',
    loggedOut: 'auth.logged-out'
};

export function emitAuthLoggedIn(payload = {}) {
    return dispatchDomainEvent('auth.logged-in', {
        entity: 'Auth',
        action: 'logged-in',
        ...payload
    }, { entity: 'Auth', action: 'logged-in' });
}

export function emitAuthLoggedOut(payload = {}) {
    return dispatchDomainEvent('auth.logged-out', {
        entity: 'Auth',
        action: 'logged-out',
        ...payload
    }, { entity: 'Auth', action: 'logged-out' });
}

export default authEvents;
`.trim();
}

function buildAuthJob() {
    return `
import { createJobRecord } from '@ghost-js/events';

export function AuthAuditJob(payload = {}) {
    return {
        ...createJobRecord('AuthAuditJob', payload, {
            queue: 'default',
            attempts: 1,
            topic: 'auth.audit'
        }),
        queue: 'default',
        attempts: 1,
        handle(context = {}) {
            return {
                ok: true,
                job: 'AuthAuditJob',
                topic: 'auth.audit',
                payload: {
                    ...payload,
                    ...context
                }
            };
        }
    };
}

export default AuthAuditJob;
`.trim();
}

function buildAuthListenersBootstrap() {
    return `
import { AuthLoggedInListener } from './AuthLoggedInListener.js';
import { AuthLoggedOutListener } from './AuthLoggedOutListener.js';

export function registerAuthListeners() {
    return [AuthLoggedInListener(), AuthLoggedOutListener()];
}

export const authListenersMeta = {
    name: 'AuthListeners',
    topics: ['auth.logged-in', 'auth.logged-out']
};

export default registerAuthListeners;
`.trim();
}

function buildNotificationEventHelpers() {
    return `
import { dispatchDomainEvent } from './bus.js';

export const notificationEvents = {
    queued: 'notifications.queued',
    sent: 'notifications.sent',
    failed: 'notifications.failed'
};

export function emitNotificationQueued(payload = {}) {
    return dispatchDomainEvent('notifications.queued', {
        entity: 'Notification',
        action: 'queued',
        ...payload
    }, { entity: 'Notification', action: 'queued' });
}

export function emitNotificationSent(payload = {}) {
    return dispatchDomainEvent('notifications.sent', {
        entity: 'Notification',
        action: 'sent',
        ...payload
    }, { entity: 'Notification', action: 'sent' });
}

export function emitNotificationFailed(payload = {}) {
    return dispatchDomainEvent('notifications.failed', {
        entity: 'Notification',
        action: 'failed',
        ...payload
    }, { entity: 'Notification', action: 'failed' });
}

export default notificationEvents;
`.trim();
}

function buildNotificationJob(action) {
    const title = toPascalCase(`Notification${action}`);
    return `
import { createJobRecord } from '@ghost-js/events';

export function ${title}Job(payload = {}) {
    return {
        ...createJobRecord('${title}Job', payload, {
            queue: 'notifications',
            attempts: 3,
            topic: 'notifications.${action}'
        }),
        queue: 'notifications',
        attempts: 3,
        handle(context = {}) {
            return {
                ok: true,
                job: '${title}Job',
                topic: 'notifications.${action}',
                payload: {
                    ...payload,
                    ...context
                }
            };
        }
    };
}

export default ${title}Job;
`.trim();
}

function buildNotificationListener(action) {
    const title = toPascalCase(`Notification${action}`);
    return `
import { eventBus, workQueue } from '../events/bus.js';
import { ${title}Job } from '../jobs/${title}Job.js';

export function ${title}Listener(handler = null) {
    return eventBus.on('notifications.${action}', async (event) => {
        workQueue.enqueue('notifications.${action}.hook', ${title}Job, event, { topic: 'notifications.${action}' });
        if (typeof handler === 'function') {
            return handler(event);
        }
        return {
            ok: true,
            listener: '${title}Listener',
            topic: 'notifications.${action}'
        };
    });
}

export const ${toCamelCase(title)}Meta = {
    name: '${title}Listener',
    topic: 'notifications.${action}'
};

export default ${title}Listener;
`.trim();
}

function buildNotificationListenersBootstrap() {
    return `
import { NotificationQueuedListener } from './NotificationQueuedListener.js';
import { NotificationSentListener } from './NotificationSentListener.js';
import { NotificationFailedListener } from './NotificationFailedListener.js';

export function registerNotificationListeners() {
    return [
        NotificationQueuedListener(),
        NotificationSentListener(),
        NotificationFailedListener()
    ];
}

export const notificationListenersMeta = {
    name: 'NotificationListeners',
    topics: ['notifications.queued', 'notifications.sent', 'notifications.failed']
};

export default registerNotificationListeners;
`.trim();
}

function buildAuthMiddleware(kind) {
    const middlewareName = kind === 'guest' ? 'guestMiddleware' : 'authMiddleware';
    const allow = kind === 'guest' ? 'false' : 'Boolean(context.user?.authenticated)';
    return `
export function ${middlewareName}(context = {}, next = null) {
    const allowed = ${allow};
    if (!allowed) {
        return {
            ok: false,
            redirect: '${kind === 'guest' ? '/dashboard' : '/login'}',
            middleware: '${kind}'
        };
    }

    if (typeof next === 'function') {
        return next(context);
    }

    return { ok: true, middleware: '${kind}', context };
}

export default ${middlewareName};
`.trim();
}

function buildAuthRouteGroup(appName) {
    return `
export const authRouteGroup = {
    name: 'auth',
    prefix: '/auth',
    middleware: ['guest'],
    layout: 'auth',
    views: ['login', 'logout'],
    app: ${appName ? `'${appName}'` : 'null'}
};

export default authRouteGroup;
`.trim();
}

function buildAuthRoutes() {
    return `
export const authRoutes = [
    { method: 'GET', path: '/login', handler: 'AuthController.showLogin', middleware: ['guest'] },
    { method: 'POST', path: '/login', handler: 'AuthController.login', middleware: ['guest', 'csrf'] },
    { method: 'POST', path: '/logout', handler: 'AuthController.logout', middleware: ['auth', 'csrf'] },
    { method: 'GET', path: '/dashboard', handler: 'DashboardController.index', middleware: ['auth'] }
];

export default authRoutes;
`.trim();
}

function buildLoginView() {
    return `
export function LoginView() {
    return {
        tag: 'main',
        props: { class: 'auth-page auth-login' },
        children: [
            { tag: 'h1', props: {}, children: ['Login'] },
            { tag: 'form', props: { method: 'POST', action: '/login' }, children: [] }
        ]
    };
}

export default LoginView;
`.trim();
}

function buildDashboardView() {
    return `
export function DashboardView() {
    return {
        tag: 'main',
        props: { class: 'auth-dashboard' },
        children: [
            { tag: 'h1', props: {}, children: ['Dashboard'] },
            { tag: 'a', props: { href: '/logout' }, children: ['Logout'] }
        ]
    };
}

export default DashboardView;
`.trim();
}

function buildRouteManifest(name, appName, options = {}) {
    const entity = toPascalCase(name);
    const routeName = pluralize(name);
    const layout = options.layout || 'app';
    const middleware = Array.isArray(options.middleware) && options.middleware.length
        ? options.middleware
        : ['web'];
    const prefix = options.prefix || `/${routeName}`;

    return {
        name: entity,
        app: appName || null,
        prefix,
        layout,
        middleware,
        routes: [
            { method: 'GET', path: prefix, handler: `${entity}Controller.index`, middleware },
            { method: 'POST', path: prefix, handler: `${entity}Controller.store`, middleware: [...middleware, 'csrf'] },
            { method: 'GET', path: `${prefix}/:id`, handler: `${entity}Controller.show`, middleware },
            { method: 'PUT', path: `${prefix}/:id`, handler: `${entity}Controller.update`, middleware: [...middleware, 'csrf'] },
            { method: 'DELETE', path: `${prefix}/:id`, handler: `${entity}Controller.destroy`, middleware: [...middleware, 'csrf'] }
        ]
    };
}

function buildRouteSource(name, manifest) {
    const entity = toPascalCase(name);
    return `
export const ${toCamelCase(entity)}RouteGroup = ${json({
        name: manifest.name,
        app: manifest.app,
        prefix: manifest.prefix,
        layout: manifest.layout,
        middleware: manifest.middleware
    })};

export const ${toCamelCase(entity)}Routes = ${json(manifest.routes)};

export default ${toCamelCase(entity)}Routes;
`.trim();
}

function buildRouteCache(manifest) {
    return json({
        kind: 'ghost.route.cache',
        schemaVersion: 1,
        ...manifest
    });
}

function buildRouteExportPhp(manifest) {
    const routes = manifest.routes.map((route) => {
        const middleware = route.middleware.map((item) => `'${item}'`).join(', ');
        return `    ['method' => '${route.method}', 'path' => '${route.path}', 'handler' => '${route.handler}', 'middleware' => [${middleware}]]`;
    }).join(",\n");
    return `<?php\nreturn [\n    'kind' => 'ghost.route.cache',\n    'schemaVersion' => 1,\n    'name' => '${manifest.name}',\n    'app' => ${manifest.app ? `'${manifest.app}'` : 'null'},\n    'prefix' => '${manifest.prefix}',\n    'layout' => '${manifest.layout}',\n    'middleware' => [${manifest.middleware.map((item) => `'${item}'`).join(', ')}],\n    'routes' => [\n${routes}\n    ]\n];\n`;
}

function buildRouteExportYaml(manifest) {
    const middleware = manifest.middleware.map((item) => `  - ${item}`).join('\n');
    const routes = manifest.routes.map((route) => [
        `  - method: ${route.method}`,
        `    path: ${route.path}`,
        `    handler: ${route.handler}`,
        `    middleware:`,
        ...route.middleware.map((item) => `      - ${item}`)
    ].join('\n')).join('\n');

    return [
        'kind: ghost.route.cache',
        'schemaVersion: 1',
        `name: ${manifest.name}`,
        `app: ${manifest.app ?? 'null'}`,
        `prefix: ${manifest.prefix}`,
        `layout: ${manifest.layout}`,
        'middleware:',
        middleware || '  - web',
        'routes:',
        routes
    ].join('\n');
}

function buildRouteExportText(manifest) {
    return [
        `Route group: ${manifest.name}`,
        `Prefix: ${manifest.prefix}`,
        `Layout: ${manifest.layout}`,
        `Middleware: ${manifest.middleware.join(', ')}`,
        'Routes:',
        ...manifest.routes.map((route) => `- ${route.method} ${route.path} -> ${route.handler}`)
    ].join('\n');
}

function listFilesRecursive(rootDir, relativeDir, predicate) {
    const targetDir = join(rootDir, relativeDir);
    if (!existsSync(targetDir)) {
        return [];
    }

    const results = [];
    const stack = [targetDir];

    while (stack.length > 0) {
        const current = stack.pop();
        for (const entry of readdirSync(current, { withFileTypes: true })) {
            const entryPath = join(current, entry.name);
            if (entry.isDirectory()) {
                stack.push(entryPath);
            } else if (!predicate || predicate(entryPath)) {
                results.push(entryPath);
            }
        }
    }

    return results;
}

export function collectRouteCatalog(projectRoot) {
    const manifestFiles = [
        ...listFilesRecursive(projectRoot, 'storage/routes/cache', (filePath) => filePath.endsWith('.json')),
        ...listFilesRecursive(projectRoot, 'apps', (filePath) => filePath.endsWith('.json') && filePath.includes('/storage/routes/cache/'))
    ];

    return manifestFiles.map((filePath) => {
        const manifest = JSON.parse(readFileSync(filePath, 'utf8'));
        return {
            file: filePath,
            kind: manifest.kind ?? 'ghost.route.cache',
            schemaVersion: manifest.schemaVersion ?? 1,
            name: manifest.name ?? '',
            app: manifest.app ?? null,
            prefix: manifest.prefix ?? '',
            layout: manifest.layout ?? 'app',
            middleware: Array.isArray(manifest.middleware) ? manifest.middleware : [],
            routes: Array.isArray(manifest.routes) ? manifest.routes : []
        };
    });
}

export function exportRouteManifest(manifest, format = 'json') {
    const normalizedFormat = String(format || 'json').toLowerCase();
    if (normalizedFormat === 'php') {
        return buildRouteExportPhp(manifest);
    }
    if (normalizedFormat === 'yaml' || normalizedFormat === 'yml') {
        return buildRouteExportYaml(manifest);
    }
    if (normalizedFormat === 'text' || normalizedFormat === 'plain') {
        return buildRouteExportText(manifest);
    }

    return buildRouteCache(manifest);
}

function buildPolicy(name) {
    const entity = toPascalCase(name);
    return `
export function ${entity}Policy(user = {}, resource = {}) {
    return {
        view: Boolean(user.id),
        create: Boolean(user.id),
        update: Boolean(user.id),
        delete: Boolean(user.role === 'admin'),
        resource
    };
}

export default ${entity}Policy;
`.trim();
}

function buildView(name) {
    const segments = String(name).split('/').filter(Boolean);
    const pageName = segments.pop() || name;
    const viewName = toPascalCase(pageName);
    return `
export function ${viewName}View(props = {}) {
    return {
        tag: 'main',
        props: { class: 'page-view', 'data-view': '${toKebabCase(pageName)}' },
        children: [
            { tag: 'h1', props: {}, children: ['${viewName}'] },
            { tag: 'pre', props: {}, children: [JSON.stringify(props, null, 2)] }
        ]
    };
}

export default ${viewName}View;
`.trim();
}

function buildRouteFile(name, entity) {
    const slug = pluralize(name);
    return `
export const ${toCamelCase(entity)}Routes = [
    { method: 'GET', path: '/${slug}', handler: '${entity}Controller.index', middleware: ['web'] },
    { method: 'POST', path: '/${slug}', handler: '${entity}Controller.store', middleware: ['web', 'csrf'] },
    { method: 'GET', path: '/${slug}/:id', handler: '${entity}Controller.show', middleware: ['web'] },
    { method: 'PUT', path: '/${slug}/:id', handler: '${entity}Controller.update', middleware: ['web', 'csrf'] },
    { method: 'DELETE', path: '/${slug}/:id', handler: '${entity}Controller.destroy', middleware: ['web', 'csrf'] }
];

export default ${toCamelCase(entity)}Routes;
`.trim();
}

function backendBase(appName) {
    return appName ? join('apps', appName) : '';
}

function prefixPath(base, relativePath) {
    return base ? join(base, relativePath) : relativePath;
}

function createFileSet(projectRoot, entries, force) {
    const files = [];
    for (const [relativePath, content] of Object.entries(entries)) {
        const result = ensureWrite(projectRoot, relativePath, content, force);
        files.push(result.path);
    }
    return files;
}

function createScaffold(projectRoot, name, options = {}, generators = {}) {
    const parsed = parseOptions(options.argv ?? []);
    const appName = options.appName || parsed.app || '';
    const force = Boolean(options.force ?? parsed.force);
    const base = backendBase(appName);
    const entity = toPascalCase(name);

    const entries = generators({ entity, appName, base });
    const files = createFileSet(projectRoot, entries, force);

    return {
        ok: true,
        name: entity,
        appName: appName || null,
        basePath: base || null,
        files,
        fileCount: files.length
    };
}

export function createControllerArtifacts(projectRoot, name, options = {}) {
    return createScaffold(projectRoot, name, options, ({ entity, appName, base }) => ({
        [prefixPath(base, `server/controllers/${entity}Controller.js`)]: buildController(entity, appName),
        [prefixPath(base, `server/controllers/${entity}Controller.test.js`)]: `import { ${entity}Controller } from './${entity}Controller.js';\n\nexport function test${entity}Controller() {\n    return ${entity}Controller();\n}\n`
    }));
}

export function createModelArtifacts(projectRoot, name, options = {}) {
    return createScaffold(projectRoot, name, options, ({ entity, base }) => ({
        [prefixPath(base, `database/models/${entity}.js`)]: buildModel(entity),
        [prefixPath(base, `database/models/${entity}.test.js`)]: `import { ${entity} } from './${entity}.js';\n\nexport function test${entity}Model() {\n    return ${entity}.make({ name: '${entity}' });\n}\n`
    }));
}

export function createMigrationArtifacts(projectRoot, name, options = {}) {
    const migrationName = options.migrationName || `create-${pluralize(name)}-table`;
    return createScaffold(projectRoot, migrationName, options, ({ base }) => ({
        [prefixPath(base, `database/migrations/${toKebabCase(migrationName)}.js`)]: buildMigration(name)
    }));
}

export function createSeederArtifacts(projectRoot, name, options = {}) {
    return createScaffold(projectRoot, name, options, ({ entity, base }) => ({
        [prefixPath(base, `database/seeders/${entity}Seeder.js`)]: buildSeeder(entity)
    }));
}

export function createFactoryArtifacts(projectRoot, name, options = {}) {
    return createScaffold(projectRoot, name, options, ({ entity, base }) => ({
        [prefixPath(base, `database/factories/${entity}Factory.js`)]: buildFactory(entity)
    }));
}

export function createRequestArtifacts(projectRoot, name, options = {}) {
    return createScaffold(projectRoot, name, options, ({ entity, base }) => ({
        [prefixPath(base, `requests/${entity}Request.js`)]: buildRequest(entity)
    }));
}

export function createDtoArtifacts(projectRoot, name, options = {}) {
    return createScaffold(projectRoot, name, options, ({ entity, base }) => ({
        [prefixPath(base, `dto/${entity}Data.js`)]: buildDto(entity)
    }));
}

export function createTransformerArtifacts(projectRoot, name, options = {}) {
    return createScaffold(projectRoot, name, options, ({ entity, base }) => ({
        [prefixPath(base, `transformers/${entity}Transformer.js`)]: buildTransformer(entity)
    }));
}

export function createResourceArtifacts(projectRoot, name, options = {}) {
    return createScaffold(projectRoot, name, options, ({ entity, base }) => ({
        [prefixPath(base, `api/resources/${entity}Resource.js`)]: buildResource(entity)
    }));
}

export function createMiddlewareArtifacts(projectRoot, name, options = {}) {
    return createScaffold(projectRoot, name, options, ({ base }) => ({
        [prefixPath(base, `server/middleware/${toKebabCase(name)}.js`)]: buildMiddleware(name)
    }));
}

export function createServerActionArtifacts(projectRoot, name, options = {}) {
    return createScaffold(projectRoot, name, options, ({ base }) => ({
        [prefixPath(base, `server/actions/${toKebabCase(name)}.js`)]: buildServerAction(name),
        [prefixPath(base, `server/actions/${toKebabCase(name)}.test.js`)]: `import { ${toCamelCase(name)}Action } from './${toKebabCase(name)}.js';\n\nexport async function test${toPascalCase(name)}Action() {\n    return ${toCamelCase(name)}Action({ redirect: '/dashboard' });\n}\n`
    }));
}

export function createEventArtifacts(projectRoot, name, options = {}) {
    return createScaffold(projectRoot, name, options, ({ entity, base }) => ({
        [prefixPath(base, `events/${entity}Event.js`)]: buildEvent(entity),
        [prefixPath(base, `events/${entity}Event.test.js`)]: `import { ${entity}Event } from './${entity}Event.js';\n\nexport function test${entity}Event() {\n    return ${entity}Event();\n}\n`
    }));
}

export function createListenerArtifacts(projectRoot, name, options = {}) {
    return createScaffold(projectRoot, name, options, ({ entity, base }) => ({
        [prefixPath(base, `listeners/${entity}Listener.js`)]: buildListener(entity),
        [prefixPath(base, `listeners/${entity}Listener.test.js`)]: `import { ${entity}Listener } from './${entity}Listener.js';\n\nexport function test${entity}Listener() {\n    return ${entity}Listener().register();\n}\n`
    }));
}

export function createJobArtifacts(projectRoot, name, options = {}) {
    return createScaffold(projectRoot, name, options, ({ entity, base }) => ({
        [prefixPath(base, `jobs/${entity}Job.js`)]: buildJob(entity),
        [prefixPath(base, `jobs/${entity}Job.test.js`)]: `import { ${entity}Job } from './${entity}Job.js';\n\nexport function test${entity}Job() {\n    return ${entity}Job();\n}\n`
    }));
}

export function createEventsArtifacts(projectRoot, name, options = {}) {
    const entity = toPascalCase(name);
    const appName = options.appName || parseOptions(options.argv ?? []).app || '';
    const force = Boolean(options.force ?? parseOptions(options.argv ?? []).force);
    const includeAuth = Boolean(options.withAuth);
    const includeCrud = Boolean(options.withCrud);
    const includeNotifications = Boolean(options.withNotifications);
    const routeName = pluralize(name);

    const entries = {
        [`events/bus.js`]: buildDomainEventBus(),
        [`events/${entity}Events.js`]: buildCrudEventHelpers(entity),
        [`jobs/${entity}CreatedJob.js`]: buildCrudJob(entity, 'created'),
        [`jobs/${entity}UpdatedJob.js`]: buildCrudJob(entity, 'updated'),
        [`jobs/${entity}DeletedJob.js`]: buildCrudJob(entity, 'deleted'),
        [`listeners/${entity}CreatedListener.js`]: buildCrudListener(entity, 'created'),
        [`listeners/${entity}UpdatedListener.js`]: buildCrudListener(entity, 'updated'),
        [`listeners/${entity}DeletedListener.js`]: buildCrudListener(entity, 'deleted'),
        [`listeners/${entity}Listeners.js`]: buildCrudListenersBootstrap(entity)
    };

    if (includeAuth) {
        Object.assign(entries, {
            [`events/AuthEvents.js`]: buildAuthEventHelpers(),
            [`jobs/AuthAuditJob.js`]: buildAuthJob(),
            [`listeners/AuthLoggedInListener.js`]: buildAuthListener('logged-in'),
            [`listeners/AuthLoggedOutListener.js`]: buildAuthListener('logged-out'),
            [`listeners/AuthListeners.js`]: buildAuthListenersBootstrap(),
            [`server/auth/AuthService.js`]: buildAuthService(appName),
            [`server/middleware/auth.js`]: buildAuthMiddleware('auth'),
            [`server/middleware/guest.js`]: buildAuthMiddleware('guest'),
            [`server/actions/login.js`]: buildLoginAction(),
            [`server/actions/logout.js`]: buildLogoutAction(),
            [`requests/LoginRequest.js`]: buildLoginRequest(),
            [`dto/AuthSessionData.js`]: buildSessionDto(),
            [`transformers/AuthSessionTransformer.js`]: buildSessionTransformer(),
            [`routes/auth.js`]: buildAuthRoutes(),
            [`routes/groups/auth.js`]: buildAuthRouteGroup(appName),
            [`pages/login/index.view.js`]: buildLoginView(),
            [`pages/dashboard/index.view.js`]: buildDashboardView()
        });
    }

    if (includeCrud) {
        Object.assign(entries, {
            [`server/controllers/${entity}Controller.js`]: buildCrudController(entity, appName),
            [`database/models/${entity}.js`]: buildModel(entity),
            [`database/migrations/create-${routeName}-table.js`]: buildMigration(entity),
            [`database/seeders/${entity}Seeder.js`]: buildSeeder(entity),
            [`database/factories/${entity}Factory.js`]: buildFactory(entity),
            [`requests/Store${entity}Request.js`]: buildRequest(`Store${entity}`),
            [`requests/Update${entity}Request.js`]: buildRequest(`Update${entity}`),
            [`dto/${entity}Data.js`]: buildDto(entity),
            [`transformers/${entity}Transformer.js`]: buildTransformer(entity),
            [`api/resources/${entity}Resource.js`]: buildResource(entity),
            [`server/policies/${entity}Policy.js`]: buildPolicy(entity),
            [`routes/${routeName}.js`]: buildRouteFile(entity, entity),
            [`pages/${routeName}/index.view.js`]: buildView(`${routeName}/index`),
            [`pages/${routeName}/create.view.js`]: buildView(`${routeName}/create`),
            [`pages/${routeName}/edit.view.js`]: buildView(`${routeName}/edit`),
            [`pages/${routeName}/show.view.js`]: buildView(`${routeName}/show`)
        });
    }

    if (includeNotifications) {
        Object.assign(entries, {
            [`events/NotificationEvents.js`]: buildNotificationEventHelpers(),
            [`jobs/NotificationQueuedJob.js`]: buildNotificationJob('queued'),
            [`jobs/NotificationSentJob.js`]: buildNotificationJob('sent'),
            [`jobs/NotificationFailedJob.js`]: buildNotificationJob('failed'),
            [`listeners/NotificationQueuedListener.js`]: buildNotificationListener('queued'),
            [`listeners/NotificationSentListener.js`]: buildNotificationListener('sent'),
            [`listeners/NotificationFailedListener.js`]: buildNotificationListener('failed'),
            [`listeners/NotificationListeners.js`]: buildNotificationListenersBootstrap()
        });
    }

    const result = createScaffold(projectRoot, entity, { ...options, appName, force }, ({ base, appName: scopedAppName }) => {
        const prefixed = {};
        for (const [relativePath, content] of Object.entries(entries)) {
            prefixed[prefixPath(base, relativePath)] = content;
        }

        return prefixed;
    });

    return {
        ...result,
        withAuth: includeAuth,
        withCrud: includeCrud,
        withNotifications: includeNotifications,
        bundle: 'events'
    };
}

export function createViewArtifacts(projectRoot, name, options = {}) {
    return createScaffold(projectRoot, name, options, ({ base }) => {
        const pagePath = String(name).replace(/\\/g, '/').replace(/^\/+/, '');
        const outputPath = pagePath.includes('/')
            ? `pages/${pagePath.replace(/\\/g, '/')}.view.js`
            : `pages/${toKebabCase(pagePath)}/index.view.js`;
        return {
            [prefixPath(base, outputPath)]: buildView(name)
        };
    });
}

export function createCrudArtifacts(projectRoot, name, options = {}) {
    const entity = toPascalCase(name);
    const routeName = pluralize(name);
    const appName = options.appName || parseOptions(options.argv ?? []).app || '';
    const base = backendBase(appName);
    const force = Boolean(options.force ?? parseOptions(options.argv ?? []).force);

    const entries = {
        [prefixPath(base, `events/bus.js`)]: buildDomainEventBus(),
        [prefixPath(base, `events/${entity}Events.js`)]: buildCrudEventHelpers(entity),
        [prefixPath(base, `jobs/${entity}CreatedJob.js`)]: buildCrudJob(entity, 'created'),
        [prefixPath(base, `jobs/${entity}UpdatedJob.js`)]: buildCrudJob(entity, 'updated'),
        [prefixPath(base, `jobs/${entity}DeletedJob.js`)]: buildCrudJob(entity, 'deleted'),
        [prefixPath(base, `listeners/${entity}CreatedListener.js`)]: buildCrudListener(entity, 'created'),
        [prefixPath(base, `listeners/${entity}UpdatedListener.js`)]: buildCrudListener(entity, 'updated'),
        [prefixPath(base, `listeners/${entity}DeletedListener.js`)]: buildCrudListener(entity, 'deleted'),
        [prefixPath(base, `listeners/${entity}Listeners.js`)]: buildCrudListenersBootstrap(entity),
        [prefixPath(base, `server/controllers/${entity}Controller.js`)]: buildCrudController(entity, appName),
        [prefixPath(base, `database/models/${entity}.js`)]: buildModel(entity),
        [prefixPath(base, `database/migrations/create-${routeName}-table.js`)]: buildMigration(entity),
        [prefixPath(base, `database/seeders/${entity}Seeder.js`)]: buildSeeder(entity),
        [prefixPath(base, `database/factories/${entity}Factory.js`)]: buildFactory(entity),
        [prefixPath(base, `requests/Store${entity}Request.js`)]: buildRequest(`Store${entity}`),
        [prefixPath(base, `requests/Update${entity}Request.js`)]: buildRequest(`Update${entity}`),
        [prefixPath(base, `dto/${entity}Data.js`)]: buildDto(entity),
        [prefixPath(base, `transformers/${entity}Transformer.js`)]: buildTransformer(entity),
        [prefixPath(base, `api/resources/${entity}Resource.js`)]: buildResource(entity),
        [prefixPath(base, `server/policies/${entity}Policy.js`)]: buildPolicy(entity),
        [prefixPath(base, `routes/${routeName}.js`)]: buildRouteFile(entity, entity),
        [prefixPath(base, `pages/${routeName}/index.view.js`)]: buildView(`${routeName}/index`),
        [prefixPath(base, `pages/${routeName}/create.view.js`)]: buildView(`${routeName}/create`),
        [prefixPath(base, `pages/${routeName}/edit.view.js`)]: buildView(`${routeName}/edit`),
        [prefixPath(base, `pages/${routeName}/show.view.js`)]: buildView(`${routeName}/show`)
    };

    const files = createFileSet(projectRoot, entries, force);

    return {
        ok: true,
        name: entity,
        appName: appName || null,
        basePath: base || null,
        routeName,
        files,
        fileCount: files.length
    };
}

export function createRouteArtifacts(projectRoot, name, options = {}) {
    const parsed = parseOptions(options.argv ?? []);
    const appName = options.appName || parsed.app || '';
    const force = Boolean(options.force ?? parsed.force);
    const base = backendBase(appName);
    const manifest = buildRouteManifest(name, appName, {
        layout: options.layout || parsed.layout || 'app',
        middleware: options.middleware || (parsed.middleware ? String(parsed.middleware).split(',').filter(Boolean) : ['web']),
        prefix: options.prefix || parsed.prefix || undefined
    });
    const routeSlug = toKebabCase(name);
    const entries = {
        [prefixPath(base, `routes/${routeSlug}.js`)]: buildRouteSource(name, manifest),
        [prefixPath(base, `storage/routes/cache/${routeSlug}.json`)]: buildRouteCache(manifest),
        [prefixPath(base, `storage/routes/exports/${routeSlug}.php`)]: buildRouteExportPhp(manifest),
        [prefixPath(base, `storage/routes/exports/${routeSlug}.yaml`)]: buildRouteExportYaml(manifest),
        [prefixPath(base, `routes/groups/${routeSlug}.js`)]: `export const ${toCamelCase(name)}Group = ${json({
            name: manifest.name,
            prefix: manifest.prefix,
            layout: manifest.layout,
            middleware: manifest.middleware
        })};\n\nexport default ${toCamelCase(name)}Group;\n`
    };

    const files = createFileSet(projectRoot, entries, force);

    return {
        ok: true,
        name: manifest.name,
        appName: appName || null,
        basePath: base || null,
        manifest,
        files,
        fileCount: files.length
    };
}

export function createApiArtifacts(projectRoot, name, options = {}) {
    const parsed = parseOptions(options.argv ?? []);
    const appName = options.appName || parsed.app || '';
    const force = Boolean(options.force ?? parsed.force);
    const base = backendBase(appName);
    const entity = toPascalCase(name);
    const routeName = pluralize(singularize(name));
    const entries = {
        [prefixPath(base, `api/controllers/${entity}ApiController.js`)]: buildApiController(entity),
        [prefixPath(base, `api/resources/${entity}Resource.js`)]: buildResource(entity),
        [prefixPath(base, `api/routes/${routeName}.js`)]: buildApiRoute(entity, entity, {
            middleware: options.middleware || (parsed.middleware ? String(parsed.middleware).split(',').filter(Boolean) : ['api'])
        }),
        [prefixPath(base, `api/tests/${entity}ApiController.test.js`)]: `import { ${entity}ApiController } from '../controllers/${entity}ApiController.js';\n\nexport function test${entity}ApiController() {\n    return ${entity}ApiController();\n}\n`,
        [prefixPath(base, `storage/api/${routeName}.json`)]: json({
            kind: 'ghost.api.cache',
            schemaVersion: 1,
            name: entity,
            app: appName || null,
            routes: [
                { method: 'GET', path: `/api/${routeName}`, handler: `${entity}ApiController.index` },
                { method: 'GET', path: `/api/${routeName}/:id`, handler: `${entity}ApiController.show` },
                { method: 'POST', path: `/api/${routeName}`, handler: `${entity}ApiController.store` }
            ]
        })
    };

    const files = createFileSet(projectRoot, entries, force);

    return {
        ok: true,
        name: entity,
        appName: appName || null,
        basePath: base || null,
        routeName,
        files,
        fileCount: files.length
    };
}

export function createAuthArtifacts(projectRoot, options = {}) {
    const parsed = parseOptions(options.argv ?? []);
    const appName = options.appName || parsed.app || '';
    const force = Boolean(options.force ?? parsed.force);
    const base = backendBase(appName);
    const entries = {
        [prefixPath(base, 'events/bus.js')]: buildDomainEventBus(),
        [prefixPath(base, 'events/AuthEvents.js')]: buildAuthEventHelpers(),
        [prefixPath(base, 'jobs/AuthAuditJob.js')]: buildAuthJob(),
        [prefixPath(base, 'listeners/AuthLoggedInListener.js')]: buildAuthListener('logged-in'),
        [prefixPath(base, 'listeners/AuthLoggedOutListener.js')]: buildAuthListener('logged-out'),
        [prefixPath(base, 'listeners/AuthListeners.js')]: buildAuthListenersBootstrap(),
        [prefixPath(base, 'server/auth/AuthService.js')]: buildAuthService(appName),
        [prefixPath(base, 'server/middleware/auth.js')]: buildAuthMiddleware('auth'),
        [prefixPath(base, 'server/middleware/guest.js')]: buildAuthMiddleware('guest'),
        [prefixPath(base, 'server/actions/login.js')]: buildLoginAction(),
        [prefixPath(base, 'server/actions/logout.js')]: buildLogoutAction(),
        [prefixPath(base, 'requests/LoginRequest.js')]: buildLoginRequest(),
        [prefixPath(base, 'dto/AuthSessionData.js')]: buildSessionDto(),
        [prefixPath(base, 'transformers/AuthSessionTransformer.js')]: buildSessionTransformer(),
        [prefixPath(base, 'routes/auth.js')]: buildAuthRoutes(),
        [prefixPath(base, 'routes/groups/auth.js')]: buildAuthRouteGroup(appName),
        [prefixPath(base, 'pages/login/index.view.js')]: buildLoginView(),
        [prefixPath(base, 'pages/dashboard/index.view.js')]: buildDashboardView()
    };

    const files = createFileSet(projectRoot, entries, force);

    return {
        ok: true,
        name: 'Auth',
        appName: appName || null,
        basePath: base || null,
        files,
        fileCount: files.length
    };
}
