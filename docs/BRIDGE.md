# Ghost Bridge 🌉
> **Zero-Boilerplate State Persistence.**

## Overview
Ghost Bridge allows you to make your Signals survive page refreshes by automatically syncing them with `localStorage`.

## API

### `persistSignal(key, initialValue)`
Creates a signal that is backed by `localStorage`.

```javascript
import { persistSignal } from '@ghost-js/core';

// Automatically loads from localStorage if 'user-settings' exists
const theme = persistSignal('user-settings', { mode: 'dark' });

// Updates to this signal are automatically saved back to localStorage
theme.set({ mode: 'light' });
```

## Features
- **Automatic Hydration**: On initialization, it checks for existing data.
- **Reactive Persistence**: Any change to the signal triggers an atomic `localStorage` write via an internal effect.
- **Serialization**: Handles complex objects and arrays automatically using JSON.
