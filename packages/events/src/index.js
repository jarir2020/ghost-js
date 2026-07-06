function normalizeName(value) {
    return String(value || '').trim().replace(/[^a-zA-Z0-9._:-]+/g, '.').replace(/^[.:_-]+|[.:_-]+$/g, '') || 'event';
}

function toTopic(value) {
    return normalizeName(value)
        .replace(/([a-z0-9])([A-Z])/g, '$1.$2')
        .replace(/[_/]+/g, '.')
        .replace(/-+/g, '.')
        .toLowerCase();
}

function toPascalCase(value) {
    return String(value || '')
        .split(/[^a-zA-Z0-9]+/)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join('') || 'Event';
}

function createRecord(kind, name, payload = {}, meta = {}) {
    return {
        kind,
        name,
        payload,
        meta: {
            ...meta,
            createdAt: meta.createdAt ?? new Date().toISOString()
        }
    };
}

export function createEventRecord(name, payload = {}, meta = {}) {
    return createRecord('ghost.event', toTopic(name), payload, meta);
}

export function createJobRecord(name, payload = {}, meta = {}) {
    return createRecord('ghost.job', normalizeName(name), payload, meta);
}

export function createEventBus({ logger = null } = {}) {
    const listeners = new Map();
    const history = [];

    const addListener = (eventName, handler, { once = false } = {}) => {
        if (typeof handler !== 'function') {
            throw new TypeError('Event listeners must be functions.');
        }

        const topic = toTopic(eventName);
        if (!listeners.has(topic)) {
            listeners.set(topic, []);
        }

        const entry = { handler, once };
        listeners.get(topic).push(entry);
        return () => {
            const current = listeners.get(topic) ?? [];
            const index = current.indexOf(entry);
            if (index >= 0) {
                current.splice(index, 1);
            }
            if (current.length === 0) {
                listeners.delete(topic);
            }
        };
    };

    const emit = async (eventName, payload = {}, meta = {}) => {
        const event = createEventRecord(eventName, payload, meta);
        const topic = event.name;
        const handlers = [...(listeners.get(topic) ?? [])];
        const results = [];
        const errors = [];

        history.push(event);
        if (typeof logger === 'function') {
            logger(event);
        }

        for (const entry of handlers) {
            try {
                const result = await entry.handler(event);
                results.push(result);
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                errors.push(message);
                results.push({ ok: false, error: message });
            } finally {
                if (entry.once) {
                    const current = listeners.get(topic) ?? [];
                    const index = current.indexOf(entry);
                    if (index >= 0) {
                        current.splice(index, 1);
                    }
                    if (current.length === 0) {
                        listeners.delete(topic);
                    }
                }
            }
        }

        return {
            ok: true,
            event,
            listeners: handlers.length,
            results,
            errors
        };
    };

    return {
        on(eventName, handler) {
            return addListener(eventName, handler);
        },
        once(eventName, handler) {
            return addListener(eventName, handler, { once: true });
        },
        off(eventName, handler) {
            const topic = toTopic(eventName);
            if (!listeners.has(topic)) {
                return false;
            }

            const current = listeners.get(topic);
            const index = current.findIndex((entry) => entry.handler === handler);
            if (index < 0) {
                return false;
            }

            current.splice(index, 1);
            if (current.length === 0) {
                listeners.delete(topic);
            }

            return true;
        },
        emit,
        dispatch: emit,
        clear(eventName = null) {
            if (eventName === null) {
                listeners.clear();
                return;
            }
            listeners.delete(toTopic(eventName));
        },
        hasListeners(eventName) {
            return (listeners.get(toTopic(eventName)) ?? []).length > 0;
        },
        listenerCount(eventName) {
            return (listeners.get(toTopic(eventName)) ?? []).length;
        },
        listenersFor(eventName) {
            return (listeners.get(toTopic(eventName)) ?? []).map((entry) => entry.handler);
        },
        history() {
            return [...history];
        },
        snapshot() {
            return {
                listeners: [...listeners.entries()].map(([topic, entries]) => ({
                    topic,
                    count: entries.length
                })),
                history: [...history]
            };
        }
    };
}

export function createQueuedWork({ bus = createEventBus(), concurrency = 1, logger = null } = {}) {
    const pending = [];
    const completed = [];
    const failed = [];
    let active = 0;

    const emitLifecycle = async (phase, job, extra = {}) => {
        const record = {
            ...job,
            phase,
            ...extra
        };
        if (typeof logger === 'function') {
            logger(record);
        }
        await bus.emit(`queue.${phase}`, record, { job: job.name });
        return record;
    };

    const dequeue = () => pending.shift() ?? null;

    const processJob = async (job) => {
        active += 1;
        await emitLifecycle('started', job);
        try {
            const result = await job.handler(job.payload, { bus });
            const record = await emitLifecycle('completed', job, { result });
            completed.push(record);
            return record;
        } catch (error) {
            const record = await emitLifecycle('failed', job, {
                error: error instanceof Error ? error.message : String(error)
            });
            failed.push(record);
            return record;
        } finally {
            active -= 1;
        }
    };

    return {
        enqueue(name, handler, payload = {}, meta = {}) {
            if (typeof handler !== 'function') {
                throw new TypeError('Queued work handlers must be functions.');
            }

            const job = createJobRecord(name, payload, {
                queue: meta.queue ?? 'default',
                attempts: meta.attempts ?? 1,
                priority: meta.priority ?? 0,
                ...meta
            });

            job.handler = handler;
            pending.push(job);
            bus.emit('queue.enqueued', job, { job: job.name });
            return job;
        },
        async processNext() {
            if (active >= concurrency) {
                return null;
            }
            const job = dequeue();
            if (!job) {
                return null;
            }
            return processJob(job);
        },
        async drain() {
            const processed = [];
            while (pending.length > 0) {
                const record = await this.processNext();
                if (record) {
                    processed.push(record);
                }
            }
            return {
                ok: true,
                processed,
                completed: [...completed],
                failed: [...failed]
            };
        },
        stats() {
            return {
                pending: pending.length,
                active,
                completed: completed.length,
                failed: failed.length
            };
        },
        pending() {
            return [...pending];
        },
        completed() {
            return [...completed];
        },
        failed() {
            return [...failed];
        },
        bus
    };
}

export function createQueue(options = {}) {
    return createQueuedWork(options);
}

export function createEventDefinition(name, payload = {}, meta = {}) {
    return {
        name: toTopic(name),
        title: toPascalCase(name),
        record: createEventRecord(name, payload, meta)
    };
}

export default {
    createEventRecord,
    createJobRecord,
    createEventBus,
    createQueuedWork,
    createQueue,
    createEventDefinition
};
