import { mediator, createBus } from '../packages/core/src/index.js';

export function testMediator() {
    console.log('--- Testing Mediator Pillar (Communication) ---');

    let receivedData = null;
    const unsub = mediator.on('test-event', (data) => {
        receivedData = data;
    });

    mediator.emit('test-event', 'Ghost');
    if (receivedData !== 'Ghost') throw new Error('Mediator emit failed');

    receivedData = null;
    unsub();
    mediator.emit('test-event', 'Phantom');
    if (receivedData !== null) throw new Error('Mediator unsubscribe failed');

    // Test isolated bus
    const bus = createBus();
    let isolatedData = null;
    bus.on('msg', (d) => isolatedData = d);
    bus.emit('msg', 'Hello');
    if (isolatedData !== 'Hello') throw new Error('Isolated bus failed');

    console.log('✅ Mediator tests passed!');
}
