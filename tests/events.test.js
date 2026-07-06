import { mkdtempSync, existsSync, rmSync, readFileSync } from 'fs';
import { execFileSync } from 'child_process';
import { tmpdir } from 'os';
import { join } from 'path';
import {
    createEventBus,
    createQueuedWork,
    createEventRecord,
    createJobRecord
} from '../packages/events/src/index.js';

export async function testEvents() {
    console.log('--- Testing Events and Queue Layer ---');

    const event = createEventRecord('UserCreated', { id: 1 }, { source: 'test' });
    if (event.kind !== 'ghost.event' || event.name !== 'user.created' || event.meta.source !== 'test') {
        throw new Error('createEventRecord did not normalize the event record correctly');
    }

    const job = createJobRecord('SendWelcomeEmail', { userId: 1 }, { queue: 'emails' });
    if (job.kind !== 'ghost.job' || job.name !== 'SendWelcomeEmail' || job.meta.queue !== 'emails') {
        throw new Error('createJobRecord did not normalize the job record correctly');
    }

    const bus = createEventBus();
    const seen = [];
    const unsubscribe = bus.on('user.created', (record) => {
        seen.push(record.payload.id);
        return { handled: true };
    });
    bus.once('user.created', (record) => {
        seen.push(`once:${record.payload.id}`);
        return { handled: 'once' };
    });

    const emitted = await bus.emit('user.created', { id: 7 });
    if (!emitted.ok || emitted.listeners !== 2) {
        throw new Error('createEventBus did not dispatch to all listeners');
    }
    await bus.emit('user.created', { id: 8 });
    if (seen.join(',') !== '7,once:7,8') {
        throw new Error('createEventBus did not honor once/off listener behavior');
    }
    if (!bus.hasListeners('user.created') || bus.listenerCount('user.created') !== 1) {
        throw new Error('createEventBus did not retain the expected listener state');
    }
    unsubscribe();
    if (bus.hasListeners('user.created')) {
        throw new Error('createEventBus did not remove listeners on unsubscribe');
    }

    const queueBus = createEventBus();
    const queueEvents = [];
    queueBus.on('queue.started', (record) => queueEvents.push(`started:${record.name}`));
    queueBus.on('queue.completed', (record) => queueEvents.push(`completed:${record.name}`));
    queueBus.on('queue.failed', (record) => queueEvents.push(`failed:${record.name}`));

    const queue = createQueuedWork({ bus: queueBus, concurrency: 1 });
    queue.enqueue('send-welcome-email', async (payload) => ({ ok: true, payload }), { userId: 1 });
    const drained = await queue.drain();
    if (!drained.ok || drained.completed.length !== 1 || queue.stats().pending !== 0) {
        throw new Error('createQueuedWork did not drain the job queue correctly');
    }
    if (!queueEvents.some((entry) => entry.startsWith('started:')) || !queueEvents.some((entry) => entry.startsWith('completed:'))) {
        throw new Error('createQueuedWork did not emit lifecycle events');
    }

    const root = mkdtempSync(join(tmpdir(), 'ghost-events-'));
    const cliPath = join(process.cwd(), 'packages', 'ghost-cli', 'src', 'cli.js');

    try {
        const eventOutput = execFileSync('node', [cliPath, 'make:event', 'OrderCreated', '--app=acme', '--json', '--brief', '--force'], {
            cwd: root,
            encoding: 'utf8'
        }).trim();
        const eventResult = JSON.parse(eventOutput);
        if (!eventResult.ok || eventResult.name !== 'OrderCreated') {
            throw new Error('make:event did not return a successful JSON payload');
        }

        const listenerOutput = execFileSync('node', [cliPath, 'make:listener', 'OrderCreated', '--app=acme', '--json', '--brief', '--force'], {
            cwd: root,
            encoding: 'utf8'
        }).trim();
        const listenerResult = JSON.parse(listenerOutput);
        if (!listenerResult.ok || listenerResult.name !== 'OrderCreated') {
            throw new Error('make:listener did not return a successful JSON payload');
        }

        const jobOutput = execFileSync('node', [cliPath, 'make:job', 'SendWelcomeEmail', '--app=acme', '--json', '--brief', '--force'], {
            cwd: root,
            encoding: 'utf8'
        }).trim();
        const jobResult = JSON.parse(jobOutput);
        if (!jobResult.ok || jobResult.name !== 'SendWelcomeEmail') {
            throw new Error('make:job did not return a successful JSON payload');
        }

        const expectedFiles = [
            join(root, 'apps', 'acme', 'events', 'OrderCreatedEvent.js'),
            join(root, 'apps', 'acme', 'events', 'OrderCreatedEvent.test.js'),
            join(root, 'apps', 'acme', 'listeners', 'OrderCreatedListener.js'),
            join(root, 'apps', 'acme', 'listeners', 'OrderCreatedListener.test.js'),
            join(root, 'apps', 'acme', 'jobs', 'SendWelcomeEmailJob.js'),
            join(root, 'apps', 'acme', 'jobs', 'SendWelcomeEmailJob.test.js')
        ];

        for (const filePath of expectedFiles) {
            if (!existsSync(filePath)) {
                throw new Error(`event generators did not create ${filePath}`);
            }
        }

        const eventSource = readFileSync(join(root, 'apps', 'acme', 'events', 'OrderCreatedEvent.js'), 'utf8');
        if (!eventSource.includes('createEventRecord') || !eventSource.includes('order.created')) {
            throw new Error('make:event did not wire the event record helper');
        }

        const listenerSource = readFileSync(join(root, 'apps', 'acme', 'listeners', 'OrderCreatedListener.js'), 'utf8');
        if (!listenerSource.includes('createEventBus') || !listenerSource.includes('register(handler = null)')) {
            throw new Error('make:listener did not wire the event bus helper');
        }

        const jobSource = readFileSync(join(root, 'apps', 'acme', 'jobs', 'SendWelcomeEmailJob.js'), 'utf8');
        if (!jobSource.includes('createJobRecord') || !jobSource.includes("queue: 'default'")) {
            throw new Error('make:job did not wire the queued work helper');
        }

        console.log('✅ Events and queue tests passed!');
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
}
