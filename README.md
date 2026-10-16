# Ghost.js 👻
> **A Compiler-First, High-Performance Reactive Framework.**

Ghost.js is a "zero-overhead" frontend framework designed for the modern web. It features a fine-grained reactivity system (Signals), a deterministic Render Graph, and a built-in Asset Pipeline—all in under **5KB**.

## 🌟 Core Pillars
1. **Ghost Core (Reactivity Pillar)**: Fine-grained signals with glitch-free updates.
2. **Ghost Bundler (Compiler Pillar)**: Specialized `esbuild` integration for maximum tree-shaking.
3. **Ghost Data (Async Pillar)**: Automatic async state management (`loading`, `error`, `data`).
4. **Ghost HTTP (Network Pillar)**: Native JSON/XML API support with `ghostFetch`.
5. **Ghost Bridge (Persistence Pillar)**: Reactive `localStorage` syncing with `persistSignal`.
6. **Ghost Mediator (Communication Pillar)**: Global Signal-driven Event Bus.
7. **Ghost Router (Structure Pillar)**: File-based routing with nested layouts.
8. **Active Style (Style Pillar)**: Direct CSS-variable binding (zero runtime re-styling).
9. **Ghost Inspector (Dev Pillar)**: Real-time visual overlay for Render Graph health.

## 🚀 Getting Started

### 1. Install the CLI
To use Ghost locally, link the CLI tool:
```bash
cd packages/ghost-cli
npm link
```

### Alternatively, use npx (requires publishing first)
```bash
npx @ghost-js/cli create my-phantom-app
```

### 2. Create a New Project
```bash
ghost create my-phantom-app
cd my-phantom-app
npm install
```

### 3. Develop
```bash
ghost dev
```
Visit `http://localhost:3000` by default, or set `--port` / `--host` to use a different dev address.

### Build for Android WebViews

```bash
ghost build --target=mobile
```
This writes a single-file bundle and `dist/build/index.html` for a Capacitor `webDir`. See the [Android and WebView guide](./docs/MOBILE.md) for setup and BridgeJS architecture notes.

## 🏷️ Release
Ghost.js `1.0.0` is the first release line for this framework. The release notes and CLI bundle updates are tracked in [`docs/CHANGELOG.md`](./docs/CHANGELOG.md), including the `ghost make:events --with-notifications` bundle option.

## 🎭 Framework Paradigms
Ghost.js is unopinionated about your syntax. Choose the API that fits your team:

- **React Paradigm**: `import { useState, useEffect } from '@ghost-js/paradigms/react'`
- **Vue Paradigm**: `import { reactive, computed } from '@ghost-js/paradigms/vue'`
- **Angular Paradigm**: `import { Injectable, Form } from '@ghost-js/paradigms/angular'`

## 🏗️ Monorepo Structure
- `packages/core`: Reactive primitives and Render Graph.
- `packages/compiler`: Optimized template-to-DOM parser.
- `packages/paradigms`: Framework-friendly adapters.
- `packages/router`: Logic for file-based and manual routing.
- `packages/ghost-cli`: Build tool, Dev server, and Generator.

## 📈 Performance
- **Zero-JS Fallback**: Built-in SSR with state-aware hydration.
- **5KB Limit**: The framework core and runtime are strictly capped at 5KB (gzipped).
- **Infinite Rendering**: Fast, deterministic DOM updates without a Virtual DOM.

---
Built with 👻 by the Ghost.js Team.
