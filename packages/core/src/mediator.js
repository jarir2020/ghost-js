/**
 * Ghost Mediator: Communication Pillar
 * A lightweight global event bus for decoupled component interaction.
 */
export function createBus() {
    const handlers = new Map();

    return {
        on(event, fn) {
            if (!handlers.has(event)) {
                handlers.set(event, new Set());
            }
            handlers.get(event).add(fn);
            // Unsubscribe function
            return () => handlers.get(event).delete(fn);
        },

        emit(event, data) {
            if (handlers.has(event)) {
                handlers.get(event).forEach(fn => fn(data));
            }
        },

        clear(event) {
            if (event) handlers.delete(event);
            else handlers.clear();
        }
    };
}

// Default global mediator instance
export const mediator = createBus();
