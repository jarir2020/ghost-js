# Ghost Router 🗺️
> **Zero-Config, File-Based Routing.**

## File-Based Routing
Ghost.js automatically maps your `src/views/` folder to routes.

- `src/views/index.js` -> `/`
- `src/views/about.js` -> `/about`
- `src/views/blog/post.js` -> `/blog/post`

## Nested Layouts
Ghost supports recursive layouts. Just add a `layout.js` in any folder inside `src/views`.
- The layout will wrap all views in that folder and its sub-folders.

## Manual Router
For advanced use-cases, use `createRouter`:

```javascript
import { createRouter } from '@ghost-js/router';

const router = createRouter([
    { path: '/', component: Home },
    { path: '/profile', component: Profile }
]);

router.push('/profile'); // Programmatic navigation
```
