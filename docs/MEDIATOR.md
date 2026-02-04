# Ghost Mediator 🕊️
> **Decoupled Global Communication.**

## Overview
Ghost Mediator is a global event bus built for components that need to talk to each other without being directly connected through props or context.

## API

### The Global Instance
Ghost provides a default singleton for ease of use.
```javascript
import { mediator } from '@ghost-js/core';

// Component A: Listen for events
const unsub = mediator.on('user:login', (user) => {
    console.log('Login detected:', user.name);
});

// Component B: Emit events
mediator.emit('user:login', { name: 'Casper' });

// Clean up (Prevents memory leaks)
unsub();
```

### `createBus()`
Create isolated mediators for specific modules or plugins.
```javascript
import { createBus } from '@ghost-js/core';
const myPrivateBus = createBus();
```

## Benefits
- **Memory Safe**: Returns an unsubscribe function for easy cleanup in `destroy` lifecycles.
- **Ultra-Lightweight**: Zero dependencies, optimized for Ghost's **5KB** limit.
- **Type-Friendly**: Easily extendable for typed event maps.
