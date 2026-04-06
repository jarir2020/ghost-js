// Ghost esbuild Plugin — 2026-04-06
// Intercepts .ghost template files and compiles them to ES module JS.
import { compile } from './compiler.js';
import { readFileSync } from 'fs';

/**
 * esbuild plugin for .ghost template files.
 *
 * Usage in bundler.js:
 *   import { ghostPlugin } from '@ghost-js/compiler';
 *   await esbuild.build({ plugins: [ghostPlugin()] });
 *
 * A .ghost file is a single-component template:
 *   <div class="counter">
 *     <p>Count: {{ count }}</p>
 *     <button :onclick="increment">+1</button>
 *   </div>
 *
 * It compiles to an ES module that exports a default factory function.
 */
export function ghostPlugin() {
    return {
        name: 'ghost-template',
        setup(build) {
            // Resolve .ghost files
            build.onResolve({ filter: /\.ghost$/ }, args => ({
                path: args.path,
                namespace: 'ghost-template'
            }));

            // Load and compile .ghost files
            build.onLoad({ filter: /.*/, namespace: 'ghost-template' }, args => {
                const source   = readFileSync(args.path, 'utf8');
                const { code, tokens } = compile(source);

                // Wrap compiled output as a proper ES module.
                // The compiled code is a factory: (state) => createNode(...)
                // We export it as default and as named `template`.
                const js = `
import { createNode, createList, when, defineComponent } from '@ghost-js/core';

// Compiled from: ${args.path}
const template = ${code};

export default template;
export { template };
`.trim();

                return { contents: js, loader: 'js' };
            });
        }
    };
}
