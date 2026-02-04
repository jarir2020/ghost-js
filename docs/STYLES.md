# Active Style 🎨
> **Signal-Bound Styling with Zero Runtime Overhead.**

Ghost.js moves style updates out of JavaScript and into CSS variables, leveraging the browser's native optimization.

## Usage

```javascript
import { activeStyle } from '@ghost-js/core';

const color = signal('#ff0000');

const App = () => ({
    tag: 'div',
    props: {
        // High-performance binding
        ghostStyle: activeStyle({
            '--main-color': () => color.get()
        })
    },
    children: ['Styled Text']
});
```

## Why it's fast
Ghost does not recalculate the CSS tree. It simply updates a CSS Variable on the element. The browser handles the rest natively, ensuring **60FPS** even during complex animations.
