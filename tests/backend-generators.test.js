import { mkdtempSync, existsSync, rmSync, readFileSync } from 'fs';
import { execFileSync } from 'child_process';
import { tmpdir } from 'os';
import { join } from 'path';

export function testBackendGenerators() {
    console.log('--- Testing Backend Generators ---');

    const root = mkdtempSync(join(tmpdir(), 'ghost-backend-'));
    const cliPath = join(process.cwd(), 'packages', 'ghost-cli', 'src', 'cli.js');

    try {
        const eventsOutput = execFileSync('node', [cliPath, 'make:events', 'Order', '--app=acme', '--json', '--brief', '--force'], {
            cwd: root,
            encoding: 'utf8'
        }).trim();
        const eventsBundle = JSON.parse(eventsOutput);
        if (!eventsBundle.ok || eventsBundle.name !== 'Order') {
            throw new Error('make:events did not return a successful JSON payload');
        }

        const expectedEventsFiles = [
            join(root, 'apps', 'acme', 'events', 'bus.js'),
            join(root, 'apps', 'acme', 'events', 'OrderEvents.js'),
            join(root, 'apps', 'acme', 'jobs', 'OrderCreatedJob.js'),
            join(root, 'apps', 'acme', 'jobs', 'OrderUpdatedJob.js'),
            join(root, 'apps', 'acme', 'jobs', 'OrderDeletedJob.js'),
            join(root, 'apps', 'acme', 'listeners', 'OrderCreatedListener.js'),
            join(root, 'apps', 'acme', 'listeners', 'OrderUpdatedListener.js'),
            join(root, 'apps', 'acme', 'listeners', 'OrderDeletedListener.js'),
            join(root, 'apps', 'acme', 'listeners', 'OrderListeners.js')
        ];

        for (const filePath of expectedEventsFiles) {
            if (!existsSync(filePath)) {
                throw new Error(`make:events did not create ${filePath}`);
            }
        }

        const eventsBootstrapSource = readFileSync(join(root, 'apps', 'acme', 'listeners', 'OrderListeners.js'), 'utf8');
        if (!eventsBootstrapSource.includes('registerOrderListeners') || !eventsBootstrapSource.includes('OrderCreatedListener')) {
            throw new Error('make:events did not create the listener bootstrap');
        }

        const eventsListenerSource = readFileSync(join(root, 'apps', 'acme', 'listeners', 'OrderCreatedListener.js'), 'utf8');
        if (!eventsListenerSource.includes('workQueue.enqueue') || !eventsListenerSource.includes('eventBus.on')) {
            throw new Error('make:events did not wire the listener fan-out');
        }

        const eventsAuthOutput = execFileSync('node', [cliPath, 'make:events', 'Order', '--app=acme', '--with-auth', '--json', '--brief', '--force'], {
            cwd: root,
            encoding: 'utf8'
        }).trim();
        const eventsAuthBundle = JSON.parse(eventsAuthOutput);
        if (!eventsAuthBundle.ok || !eventsAuthBundle.withAuth || eventsAuthBundle.withCrud) {
            throw new Error('make:events --with-auth did not report the expected mode flags');
        }

        const expectedEventsAuthFiles = [
            join(root, 'apps', 'acme', 'events', 'AuthEvents.js'),
            join(root, 'apps', 'acme', 'jobs', 'AuthAuditJob.js'),
            join(root, 'apps', 'acme', 'listeners', 'AuthLoggedInListener.js'),
            join(root, 'apps', 'acme', 'listeners', 'AuthLoggedOutListener.js'),
            join(root, 'apps', 'acme', 'listeners', 'AuthListeners.js'),
            join(root, 'apps', 'acme', 'server', 'auth', 'AuthService.js'),
            join(root, 'apps', 'acme', 'routes', 'auth.js'),
            join(root, 'apps', 'acme', 'pages', 'login', 'index.view.js'),
            join(root, 'apps', 'acme', 'pages', 'dashboard', 'index.view.js')
        ];

        for (const filePath of expectedEventsAuthFiles) {
            if (!existsSync(filePath)) {
                throw new Error(`make:events --with-auth did not create ${filePath}`);
            }
        }

        const eventsCrudOutput = execFileSync('node', [cliPath, 'make:events', 'Invoice', '--app=acme', '--with-crud', '--json', '--brief', '--force'], {
            cwd: root,
            encoding: 'utf8'
        }).trim();
        const eventsCrudBundle = JSON.parse(eventsCrudOutput);
        if (!eventsCrudBundle.ok || !eventsCrudBundle.withCrud || eventsCrudBundle.withAuth) {
            throw new Error('make:events --with-crud did not report the expected mode flags');
        }

        const expectedEventsCrudFiles = [
            join(root, 'apps', 'acme', 'server', 'controllers', 'InvoiceController.js'),
            join(root, 'apps', 'acme', 'database', 'models', 'Invoice.js'),
            join(root, 'apps', 'acme', 'database', 'migrations', 'create-invoices-table.js'),
            join(root, 'apps', 'acme', 'routes', 'invoices.js'),
            join(root, 'apps', 'acme', 'pages', 'invoices', 'index.view.js'),
            join(root, 'apps', 'acme', 'pages', 'invoices', 'create.view.js'),
            join(root, 'apps', 'acme', 'pages', 'invoices', 'edit.view.js'),
            join(root, 'apps', 'acme', 'pages', 'invoices', 'show.view.js')
        ];

        for (const filePath of expectedEventsCrudFiles) {
            if (!existsSync(filePath)) {
                throw new Error(`make:events --with-crud did not create ${filePath}`);
            }
        }

        const eventsNotificationOutput = execFileSync('node', [cliPath, 'make:events', 'Message', '--app=acme', '--with-notifications', '--json', '--brief', '--force'], {
            cwd: root,
            encoding: 'utf8'
        }).trim();
        const eventsNotificationBundle = JSON.parse(eventsNotificationOutput);
        if (!eventsNotificationBundle.ok || !eventsNotificationBundle.withNotifications || eventsNotificationBundle.withAuth || eventsNotificationBundle.withCrud) {
            throw new Error('make:events --with-notifications did not report the expected mode flags');
        }

        const expectedEventsNotificationFiles = [
            join(root, 'apps', 'acme', 'events', 'NotificationEvents.js'),
            join(root, 'apps', 'acme', 'jobs', 'NotificationQueuedJob.js'),
            join(root, 'apps', 'acme', 'jobs', 'NotificationSentJob.js'),
            join(root, 'apps', 'acme', 'jobs', 'NotificationFailedJob.js'),
            join(root, 'apps', 'acme', 'listeners', 'NotificationQueuedListener.js'),
            join(root, 'apps', 'acme', 'listeners', 'NotificationSentListener.js'),
            join(root, 'apps', 'acme', 'listeners', 'NotificationFailedListener.js'),
            join(root, 'apps', 'acme', 'listeners', 'NotificationListeners.js')
        ];

        for (const filePath of expectedEventsNotificationFiles) {
            if (!existsSync(filePath)) {
                throw new Error(`make:events --with-notifications did not create ${filePath}`);
            }
        }

        const notificationBootstrapSource = readFileSync(join(root, 'apps', 'acme', 'listeners', 'NotificationListeners.js'), 'utf8');
        if (!notificationBootstrapSource.includes('registerNotificationListeners') || !notificationBootstrapSource.includes('NotificationQueuedListener')) {
            throw new Error('make:events --with-notifications did not create the notification listener bootstrap');
        }

        const notificationListenerSource = readFileSync(join(root, 'apps', 'acme', 'listeners', 'NotificationQueuedListener.js'), 'utf8');
        if (!notificationListenerSource.includes('notifications.queued') || !notificationListenerSource.includes('workQueue.enqueue')) {
            throw new Error('make:events --with-notifications did not wire the notification listener fan-out');
        }

        const crudOutput = execFileSync('node', [cliPath, 'make:crud', 'User', '--app=acme', '--json', '--brief', '--force'], {
            cwd: root,
            encoding: 'utf8'
        }).trim();
        const crud = JSON.parse(crudOutput);
        if (!crud.ok || crud.name !== 'User') {
            throw new Error('make:crud did not return a successful JSON payload');
        }
        if (!Array.isArray(crud.files) || crud.files.length < 10) {
            throw new Error('make:crud did not report the generated backend surface');
        }

        const expectedCrudFiles = [
            join(root, 'apps', 'acme', 'events', 'bus.js'),
            join(root, 'apps', 'acme', 'events', 'UserEvents.js'),
            join(root, 'apps', 'acme', 'jobs', 'UserCreatedJob.js'),
            join(root, 'apps', 'acme', 'jobs', 'UserUpdatedJob.js'),
            join(root, 'apps', 'acme', 'jobs', 'UserDeletedJob.js'),
            join(root, 'apps', 'acme', 'listeners', 'UserCreatedListener.js'),
            join(root, 'apps', 'acme', 'listeners', 'UserUpdatedListener.js'),
            join(root, 'apps', 'acme', 'listeners', 'UserDeletedListener.js'),
            join(root, 'apps', 'acme', 'listeners', 'UserListeners.js'),
            join(root, 'apps', 'acme', 'server', 'controllers', 'UserController.js'),
            join(root, 'apps', 'acme', 'database', 'models', 'User.js'),
            join(root, 'apps', 'acme', 'database', 'migrations', 'create-users-table.js'),
            join(root, 'apps', 'acme', 'requests', 'StoreUserRequest.js'),
            join(root, 'apps', 'acme', 'dto', 'UserData.js'),
            join(root, 'apps', 'acme', 'transformers', 'UserTransformer.js'),
            join(root, 'apps', 'acme', 'api', 'resources', 'UserResource.js'),
            join(root, 'apps', 'acme', 'pages', 'users', 'index.view.js'),
            join(root, 'apps', 'acme', 'routes', 'users.js')
        ];

        for (const filePath of expectedCrudFiles) {
            if (!existsSync(filePath)) {
                throw new Error(`make:crud did not create ${filePath}`);
            }
        }

        const controllerSource = readFileSync(join(root, 'apps', 'acme', 'server', 'controllers', 'UserController.js'), 'utf8');
        if (!controllerSource.includes('UserController') || !controllerSource.includes('emitUserCreated') || !controllerSource.includes('registerUserListeners')) {
            throw new Error('controller scaffold did not include the expected controller shape');
        }

        const eventSource = readFileSync(join(root, 'apps', 'acme', 'events', 'UserEvents.js'), 'utf8');
        if (!eventSource.includes('emitUserCreated') || !eventSource.includes('user.created')) {
            throw new Error('CRUD event scaffolding did not include the event helpers');
        }

        const listenerSource = readFileSync(join(root, 'apps', 'acme', 'listeners', 'UserListeners.js'), 'utf8');
        if (!listenerSource.includes('registerUserListeners') || !listenerSource.includes('UserCreatedListener')) {
            throw new Error('CRUD listener scaffolding did not include the listener bootstrap');
        }

        const jobSource = readFileSync(join(root, 'apps', 'acme', 'jobs', 'UserCreatedJob.js'), 'utf8');
        if (!jobSource.includes('createJobRecord') || !jobSource.includes("topic: 'user.created'")) {
            throw new Error('CRUD job scaffolding did not include the queued work helper');
        }

        const crudListenerSource = readFileSync(join(root, 'apps', 'acme', 'listeners', 'UserCreatedListener.js'), 'utf8');
        if (!crudListenerSource.includes('eventBus.on') || !crudListenerSource.includes('workQueue.enqueue')) {
            throw new Error('CRUD listener file did not wire event fan-out and queued work');
        }

        const modelSource = readFileSync(join(root, 'apps', 'acme', 'database', 'models', 'User.js'), 'utf8');
        if (!modelSource.includes('defineModel') || !modelSource.includes('@ghost-js/database')) {
            throw new Error('model scaffold did not wire the ORM helper import');
        }

        const routeSource = readFileSync(join(root, 'apps', 'acme', 'routes', 'users.js'), 'utf8');
        if (!routeSource.includes('/users') || !routeSource.includes('UserController.index')) {
            throw new Error('CRUD route scaffold did not include the expected route metadata');
        }

        const viewOutput = execFileSync('node', [cliPath, 'make:view', 'dashboard', '--app=acme', '--force'], {
            cwd: root,
            encoding: 'utf8'
        });
        if (!viewOutput.includes('Generated view')) {
            throw new Error('make:view did not report success');
        }

        const viewPath = join(root, 'apps', 'acme', 'pages', 'dashboard', 'index.view.js');
        if (!existsSync(viewPath)) {
            throw new Error('make:view did not create the page view file');
        }

        const serverActionOutput = execFileSync('node', [cliPath, 'make:server-action', 'login', '--app=acme', '--force'], {
            cwd: root,
            encoding: 'utf8'
        });
        if (!serverActionOutput.includes('Generated server action')) {
            throw new Error('make:server-action did not report success');
        }

        const actionPath = join(root, 'apps', 'acme', 'server', 'actions', 'login.js');
        const actionTestPath = join(root, 'apps', 'acme', 'server', 'actions', 'login.test.js');
        if (!existsSync(actionPath) || !existsSync(actionTestPath)) {
            throw new Error('make:server-action did not create both runtime files');
        }

        const authOutput = execFileSync('node', [cliPath, 'make:auth', '--app=acme', '--json', '--brief', '--force'], {
            cwd: root,
            encoding: 'utf8'
        }).trim();
        const auth = JSON.parse(authOutput);
        if (!auth.ok || auth.name !== 'Auth') {
            throw new Error('make:auth did not return a successful JSON payload');
        }
        const expectedAuthFiles = [
            join(root, 'apps', 'acme', 'events', 'bus.js'),
            join(root, 'apps', 'acme', 'events', 'AuthEvents.js'),
            join(root, 'apps', 'acme', 'jobs', 'AuthAuditJob.js'),
            join(root, 'apps', 'acme', 'listeners', 'AuthLoggedInListener.js'),
            join(root, 'apps', 'acme', 'listeners', 'AuthLoggedOutListener.js'),
            join(root, 'apps', 'acme', 'listeners', 'AuthListeners.js'),
            join(root, 'apps', 'acme', 'server', 'auth', 'AuthService.js'),
            join(root, 'apps', 'acme', 'server', 'middleware', 'auth.js'),
            join(root, 'apps', 'acme', 'server', 'middleware', 'guest.js'),
            join(root, 'apps', 'acme', 'server', 'actions', 'login.js'),
            join(root, 'apps', 'acme', 'server', 'actions', 'logout.js'),
            join(root, 'apps', 'acme', 'requests', 'LoginRequest.js'),
            join(root, 'apps', 'acme', 'dto', 'AuthSessionData.js'),
            join(root, 'apps', 'acme', 'transformers', 'AuthSessionTransformer.js'),
            join(root, 'apps', 'acme', 'routes', 'auth.js'),
            join(root, 'apps', 'acme', 'routes', 'groups', 'auth.js'),
            join(root, 'apps', 'acme', 'pages', 'login', 'index.view.js'),
            join(root, 'apps', 'acme', 'pages', 'dashboard', 'index.view.js')
        ];

        for (const filePath of expectedAuthFiles) {
            if (!existsSync(filePath)) {
                throw new Error(`make:auth did not create ${filePath}`);
            }
        }

        const authRouteGroup = readFileSync(join(root, 'apps', 'acme', 'routes', 'groups', 'auth.js'), 'utf8');
        if (!authRouteGroup.includes("layout: 'auth'") || !authRouteGroup.includes("middleware: ['guest']")) {
            throw new Error('make:auth did not write the route group metadata');
        }

        const loginActionSource = readFileSync(join(root, 'apps', 'acme', 'server', 'actions', 'login.js'), 'utf8');
        if (!loginActionSource.includes('validateLoginRequest') || !loginActionSource.includes('AuthService')) {
            throw new Error('make:auth did not wire login request validation and auth service');
        }

        const authServiceSource = readFileSync(join(root, 'apps', 'acme', 'server', 'auth', 'AuthService.js'), 'utf8');
        if (!authServiceSource.includes('emitAuthLoggedIn') || !authServiceSource.includes('registerAuthListeners') || authServiceSource.includes('workQueue.enqueue')) {
            throw new Error('make:auth did not wire auth events and queued work');
        }

        const authListenersSource = readFileSync(join(root, 'apps', 'acme', 'listeners', 'AuthListeners.js'), 'utf8');
        if (!authListenersSource.includes('registerAuthListeners') || !authListenersSource.includes('AuthLoggedInListener') || !authListenersSource.includes('AuthLoggedOutListener')) {
            throw new Error('make:auth did not create the auth listener bootstrap');
        }

        const authListenerSource = readFileSync(join(root, 'apps', 'acme', 'listeners', 'AuthLoggedInListener.js'), 'utf8');
        if (!authListenerSource.includes('eventBus.on') || !authListenerSource.includes('workQueue.enqueue')) {
            throw new Error('make:auth did not wire the auth listener fan-out');
        }

        const routeOutput = execFileSync('node', [cliPath, 'make:route', 'orders', '--app=acme', '--layout=admin', '--prefix=/admin/orders', '--middleware=web,auth', '--json', '--brief', '--force'], {
            cwd: root,
            encoding: 'utf8'
        }).trim();
        const route = JSON.parse(routeOutput);
        if (!route.ok || route.name !== 'Orders') {
            throw new Error('make:route did not return a successful JSON payload');
        }

        const expectedRouteFiles = [
            join(root, 'apps', 'acme', 'routes', 'orders.js'),
            join(root, 'apps', 'acme', 'routes', 'groups', 'orders.js'),
            join(root, 'apps', 'acme', 'storage', 'routes', 'cache', 'orders.json'),
            join(root, 'apps', 'acme', 'storage', 'routes', 'exports', 'orders.php'),
            join(root, 'apps', 'acme', 'storage', 'routes', 'exports', 'orders.yaml')
        ];

        for (const filePath of expectedRouteFiles) {
            if (!existsSync(filePath)) {
                throw new Error(`make:route did not create ${filePath}`);
            }
        }

        const routedSource = readFileSync(join(root, 'apps', 'acme', 'routes', 'orders.js'), 'utf8');
        if (!routedSource.includes('/admin/orders') || !routedSource.includes('OrdersController.index')) {
            throw new Error('make:route did not write the route source file');
        }

        const routeListOutput = execFileSync('node', [cliPath, 'route:list', '--json', '--brief'], {
            cwd: root,
            encoding: 'utf8'
        }).trim();
        const routeList = JSON.parse(routeListOutput);
        if (!Array.isArray(routeList.routes) || !routeList.routes.some((entry) => entry.name === 'Orders')) {
            throw new Error('route:list did not include the cached route manifest');
        }

        const routeDiagnoseOutput = execFileSync('node', [cliPath, 'route:diagnose', '--json', '--brief'], {
            cwd: root,
            encoding: 'utf8'
        }).trim();
        const routeDiagnose = JSON.parse(routeDiagnoseOutput);
        if (routeDiagnose.status !== 'healthy' || routeDiagnose.routeCount === 0) {
            throw new Error('route:diagnose did not report a healthy cached route set');
        }

        const apiOutput = execFileSync('node', [cliPath, 'make:api', 'invoices', '--app=acme', '--middleware=api,auth', '--json', '--brief', '--force'], {
            cwd: root,
            encoding: 'utf8'
        }).trim();
        const api = JSON.parse(apiOutput);
        if (!api.ok || api.name !== 'Invoices') {
            throw new Error('make:api did not return a successful JSON payload');
        }

        const expectedApiFiles = [
            join(root, 'apps', 'acme', 'api', 'controllers', 'InvoicesApiController.js'),
            join(root, 'apps', 'acme', 'api', 'resources', 'InvoicesResource.js'),
            join(root, 'apps', 'acme', 'api', 'routes', 'invoices.js'),
            join(root, 'apps', 'acme', 'api', 'tests', 'InvoicesApiController.test.js'),
            join(root, 'apps', 'acme', 'storage', 'api', 'invoices.json')
        ];

        for (const filePath of expectedApiFiles) {
            if (!existsSync(filePath)) {
                throw new Error(`make:api did not create ${filePath}`);
            }
        }

        const apiControllerSource = readFileSync(join(root, 'apps', 'acme', 'api', 'controllers', 'InvoicesApiController.js'), 'utf8');
        if (!apiControllerSource.includes('createApiResponse') || !apiControllerSource.includes('createResourceEnvelope')) {
            throw new Error('make:api did not wire the response envelope helper');
        }

        const apiRouteSource = readFileSync(join(root, 'apps', 'acme', 'api', 'routes', 'invoices.js'), 'utf8');
        if (!apiRouteSource.includes('/api/invoices') || !apiRouteSource.includes('InvoicesApiController.index')) {
            throw new Error('make:api did not write the API route file');
        }

        console.log('✅ Backend generator tests passed!');
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
}
