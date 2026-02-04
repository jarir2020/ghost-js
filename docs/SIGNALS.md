# Ghost Signals 📡
> **Fine-Grained, Glitch-Free Reactivity.**

## Overview
Ghost Signals are the primary way to manage state. Unlike Virtual DOM frameworks, Ghost updates the DOM directly when a signal changes.

## API

### `signal(value)`
Creates a reactive state holder.
```javascript
const count = signal(0);
console.log(count.get()); // Read
count.set(1);             // Write
```

### `computed(fn)`
Creates a derived value that only re-calculates when dependencies change.
```javascript
const double = computed(() => count.get() * 2);
```

### `effect(fn)`
Runs a function automatically when its dependencies change.
```javascript
effect(() => {
    console.log('The count is now:', count.get());
});
```

### `batch(fn)`
Batches multiple signal updates into a single notification cycle.
```javascript
batch(() => {
    count.set(10);
    name.set('Ghost');
}); // Effects only run once here
```
