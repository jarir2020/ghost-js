# Ghost.js — Full Roadmap to v0.5

> Written: 2026-04-06
> Current version: 0.2.0 (14 tests passing)
> Target: v0.5.0 — production-usable, world-class independent framework

---

## Honest State Assessment

### What is solid (keep as-is)
- Fine-grained signals: `signal`, `computed`, `batch`, `effect` — genuinely well-designed
- `asyncSignal` with loading/error/data states
- `persistSignal` (localStorage sync)
- Global event bus (`mediator`, `createBus`)
- `ghostFetch` HTTP wrapper (basic)
- Dynamic router with `:param` segments, query signal, 404 wildcard ✅ (v0.2)
- Error boundaries in effects ✅ (v0.2)
- Char-by-char template tokenizer ✅ (v0.2)
- Gzip size monitor ✅ (v0.2)

### What is broken / missing (blocks real apps)
| Gap | Severity | Reason |
|-----|----------|--------|
| No list rendering | **Critical** | Can't render arrays. A todo list is impossible. |
| No conditional rendering | **Critical** | No if/else equivalent in node tree |
| No props system | **Critical** | Components have no typed interface |
| SSR ignores signals | **High** | Renders `"function"` instead of signal values |
| CSS tokenizer broken | **High** | Regex scoping mangles property values |
| Compiler disconnected | **High** | Produces code strings but no pipeline uses them |
| No TypeScript defs | **Medium** | Zero IDE support for consumers |
| No code splitting | **Medium** | Entire app bundled; lazy routes impossible |
| HTTP has no caching | **Medium** | Every call hits network |
| Angular DI is skeleton | **Low** | `Injectable` is a Map, not real DI |
| Svelte adapter missing | **Low** | Mentioned in plan.txt, never built |
| No i18n | **Low** | Users roll their own |
| No streaming SSR | **Low** | `renderToString` blocks |
| No route guards | **Low** | Can't protect auth routes |
| No testing utilities | **Low** | Hard to unit-test nodes |
| 5KB claim unverified | **Low** | Never measured real bundle |

---

## Phase 1 — Core Runtime (unblocks all real app development)

### 1.1 Reactive List Rendering — `createList`
**Problem:** No way to render a reactive array. The most basic UI pattern is completely unsupported.
**Fix:** Add `createList(getItems, keyFn, renderFn)` to render-graph. Uses comment anchors + keyed Map
for O(n) diffing — insert new nodes, remove stale ones, reorder via `insertBefore`.
**Files:** `packages/core/src/render-graph.js`, `packages/core/src/index.js`

### 1.2 Conditional Rendering — `when()`
**Problem:** No if/else in the render tree. You can't show/hide a component based on a signal.
**Fix:** `when(conditionGetter, trueFn, falseFn?)` — mounts/unmounts child nodes reactively.
Uses comment anchors to hold position. Calls `destroy()` on the old branch before mounting new one.
**Files:** `packages/core/src/render-graph.js`

### 1.3 Props System — `defineComponent()`
**Problem:** Components are raw functions. No prop validation, no reactive prop passing.
**Fix:** `defineComponent(setup)` — wraps setup function, normalizes props (converts raw values
to getter functions so children can track parent signals), returns a factory the render graph understands.
**Files:** `packages/core/src/render-graph.js`, `packages/core/src/index.js`

### 1.4 Fix SSR — Render Signal Values
**Problem:** `renderToString` calls `typeof value === 'function'` for children but returns
`"function"` as a string when the function isn't a known getter.
**Fix:** Always call function children to get their value. Strip `on*` event handlers. Handle
nested arrays. Add null/undefined guard.
**Files:** `packages/core/src/ssr.js`

---

## Phase 2 — Compiler Pipeline (make templates actually work)

### 2.1 Fix CSS Tokenizer
**Problem:** `style.js` uses a single regex to prefix selectors. It matches inside property
values (e.g., `color: red` → `[scope] color: red;` instead of `[scope] .cls { color: red; }`).
**Fix:** A proper char-by-char CSS tokenizer that distinguishes selector context from
declaration context before prefixing.
**Files:** `packages/core/src/style.js`

### 2.2 esbuild Compiler Plugin
**Problem:** The template compiler in `compiler.js` produces code strings but nothing
consumes them. There is no way to write `.ghost` templates and have them bundled.
**Fix:** An esbuild plugin (`ghost-plugin.js`) that intercepts `.ghost` file loads,
passes them through `compile()`, and returns valid JS module code.
**Files:** `packages/compiler/src/ghost-plugin.js`, wire into `packages/ghost-cli/src/bundler.js`

---

## Phase 3 — Performance

### 3.1 Component Memoization — `memo()`
**Problem:** No `shouldUpdate` equivalent. Every parent signal change re-runs all children
even if their own inputs haven't changed.
**Fix:** `memo(factory, depsGetter)` — wraps a node factory. Caches the last node; only
re-runs factory if `depsGetter()` returns a different value (shallow compare).
**Files:** `packages/core/src/render-graph.js`

### 3.2 Lazy Node Loading — `lazyNode()`
**Problem:** All routes/components bundled upfront even if never visited.
**Fix:** `lazyNode(importFn, fallback?)` — wraps a dynamic `import()`. Shows fallback node
while loading; swaps it for the real node when the import resolves. Requires esbuild
`splitting: true` in bundler.
**Files:** `packages/core/src/render-graph.js`, `packages/ghost-cli/src/bundler.js`

### 3.3 HTTP Caching + Interceptors
**Problem:** `ghostFetch` makes a fresh network request every call. No way to add
auth headers globally.
**Fix:** Add optional `cache: 'memory'` param (Map keyed by `method+url`). Add
`ghostFetch.interceptors = { request: [], response: [] }` arrays — each interceptor
receives and returns the config/response, enabling auth injection, logging, etc.
**Files:** `packages/core/src/http.js`

---

## Phase 4 — DX & Completeness

### 4.1 Svelte Paradigm Adapter
**Problem:** Svelte-style stores (`writable`, `readable`, `derived`) mentioned in plan.txt
but never built. Limits paradigm portability.
**Fix:** Map Ghost signals to Svelte store contract: `writable(v)` → signal with `.subscribe`,
`.set`, `.update`. `readable(v, start)` → read-only. `derived(stores, fn)` → computed.
**Files:** `packages/paradigms/src/svelte.js`, `packages/paradigms/src/index.js`

### 4.2 Real Angular DI — `provide` / `inject`
**Problem:** Current `Injectable` is just a `new Map()`. No scoped containers, no tokens,
no tree-shakeable injection.
**Fix:** `createContainer()` returns a DI scope with `provide(token, value)` and
`inject(token)`. Containers can inherit from a parent container (hierarchical DI).
Tokens are plain objects/classes/symbols — no decorators needed.
**Files:** `packages/paradigms/src/angular.js`

### 4.3 Built-in i18n — `t()`, `locale`, `loadLocale()`
**Problem:** No internationalization. Users roll their own.
**Fix:** `locale` signal (default `'en'`). `loadLocale(lang, dict)` stores translations.
`t(key, vars?)` returns a computed value based on `locale` — reactive, updates all
usages when `locale.set('fr')` is called.
**Files:** `packages/core/src/i18n.js`, export from `packages/core/src/index.js`

### 4.4 Streaming SSR — `renderToStream()`
**Problem:** `renderToString()` blocks until the full tree is ready. Large pages lock
the Node.js event loop.
**Fix:** `renderToStream(node)` returns a Node.js `Readable` stream using async generators.
Flushes each node as it's ready. Keeps `renderToString` unchanged for non-Node environments.
**Files:** `packages/core/src/ssr.js`

### 4.5 Route Guards — `router.guard(fn)`
**Problem:** No way to intercept navigation (e.g., redirect unauthenticated users).
**Fix:** `router.guard(asyncFn)` — called before every route change with `(to, from)`.
If the function returns `false` or a path string, navigation is cancelled or redirected.
**Files:** `packages/router/src/router.js`, `packages/router/src/file-router.js`

### 4.6 TypeScript Definitions
**Problem:** No `.d.ts` files. Zero IDE autocomplete for anyone using Ghost.
**Fix:** Hand-authored `index.d.ts` for each package. Not generated — kept accurate and
small. Cover all public exports.
**Files:**
- `packages/core/index.d.ts`
- `packages/router/index.d.ts`
- `packages/compiler/index.d.ts`
- `packages/paradigms/index.d.ts`
- `packages/ghost-cli/index.d.ts`

---

## Phase 5 — Packaging & Quality

### 5.1 Bundle Size Verification Script
**Problem:** The 5KB gzip claim has never been verified against the actual bundled output.
**Fix:** A `scripts/check-bundle-size.js` script that builds the core with esbuild, gzips
the output, and asserts it's under 5 KB. Wire into a `npm run size` command.
**Files:** `scripts/check-bundle-size.js`, update root `package.json`

### 5.2 Component Testing Utilities
**Problem:** No helpers for testing individual Ghost nodes in isolation.
**Fix:** `packages/core/src/testing.js` — `mountTest(node)` (attaches to a temp div),
`find(selector)`, `trigger(el, eventName, detail?)`, `cleanup()` (removes temp div).
**Files:** `packages/core/src/testing.js`

---

## Version Roadmap

| Version | Focus | Key Deliverables |
|---------|-------|-----------------|
| **v0.2.0** ✅ | Hardening | Dynamic routes, tokenizer, gzip check, error boundaries |
| **v0.3.0** | Core Runtime | `createList`, `when`, `defineComponent`, fix SSR |
| **v0.4.0** | Compiler + Perf | esbuild plugin, fix CSS, `memo`, `lazyNode`, HTTP cache |
| **v0.5.0** | Full Stack | Svelte/Angular/i18n, streaming SSR, guards, TypeScript defs, testing utils, bundle check |

---

## Implementation Priority (what to build first, this session)

```
1. createList        — unblocks all real UI
2. when()            — unblocks conditionals
3. defineComponent() — unblocks component model
4. Fix SSR           — completes SSR story
5. Fix CSS           — makes styling correct
6. esbuild plugin    — makes compiler usable
7. memo()            — easy perf win
8. lazyNode()        — code splitting
9. HTTP cache        — network perf
10. Svelte adapter   — paradigm completeness
11. Angular DI       — paradigm completeness
12. i18n             — unique differentiator
13. Streaming SSR    — Node.js perf
14. Route guards     — auth support
15. TypeScript defs  — IDE support
16. Bundle size check — prove the 5KB claim
17. Testing utils    — testability
```
