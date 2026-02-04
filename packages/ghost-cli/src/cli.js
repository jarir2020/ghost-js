#!/usr/bin/env node
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { build, serve } from './bundler.js';

const command = process.argv[2];
const param = process.argv[3];
const projectRoot = process.cwd();

if (command === 'create' && param) {
    const projectName = param;
    console.log(`Creating Ghost.js project: ${projectName}...`);

    mkdirSync(projectName);
    mkdirSync(join(projectName, 'src'));

    const packageJson = {
        name: projectName,
        version: '1.0.0',
        type: 'module',
        dependencies: {
            "@ghost-js/core": "0.1.2",
            "@ghost-js/paradigms": "0.1.2",
            "@ghost-js/router": "0.1.2",
            "@ghost-js/cli": "0.1.2"
        },
        scripts: {
            "dev": "ghost dev",
            "build": "ghost build"
        }
    };

    writeFileSync(join(projectName, 'package.json'), JSON.stringify(packageJson, null, 2));

    const indexJs = `
import { React } from '@ghost-js/paradigms';
import { mount, initDevTools } from '@ghost-js/core';

// Initialize DevTools HUD
initDevTools();

const [count, setCount] = React.useState(0);

const App = () => {
    return {
        tag: 'div',
        props: { style: 'text-align: center; margin-top: 50px;' },
        children: [
            { tag: 'h1', props: {}, children: ['Ghost.js App'] },
            { tag: 'p', props: {}, children: [() => \`Count: \${count()}\`] },
            { 
                tag: 'button', 
                props: { onclick: () => setCount(c => c + 1) }, 
                children: ['Increment'] 
            }
        ]
    };
};

mount(App(), document.body);
    `.trim();

    writeFileSync(join(projectName, 'src', 'index.js'), indexJs);

    const indexHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${projectName}</title>
</head>
<body>
    <script src="/dist/bundle.js" type="module"></script>
</body>
</html>
    `.trim();

    writeFileSync(join(projectName, 'index.html'), indexHtml);

    console.log('Project created successfully!');
    console.log(`Next steps:\n  cd ${projectName}\n  npm install\n  npm run dev`);
} else if (command === 'build') {
    build(projectRoot);
} else if (command === 'dev') {
    serve(projectRoot);
} else if (command === 'generate' && param) {
    const type = param; // component or view
    const name = process.argv[4];
    if (!name) {
        console.log('Usage: ghost generate <component|view> <name>');
        process.exit(1);
    }

    const dir = type === 'view' ? 'src/views' : 'src/components';
    const filePath = join(projectRoot, dir, `${name}.js`);

    try {
        mkdirSync(join(projectRoot, dir), { recursive: true });
        const content = type === 'view'
            ? `export const ${name} = () => ({ tag: 'div', props: {}, children: ['View: ${name}'] });`
            : `export const ${name} = () => ({ tag: 'div', props: {}, children: ['Component: ${name}'] });`;

        writeFileSync(filePath, content);
        console.log(`✅ Generated ${type}: ${filePath}`);
    } catch (e) {
        console.error(`❌ Failed to generate ${type}:`, e.message);
    }
} else {
    console.log('Usage: ghost <create|build|dev|generate> [args]');
}
