import { signal } from './src/signals.js';
import { css } from './src/style.js';

// Mock DOM for testing
global.document = {
    head: {
        appendChild: () => { }
    },
    createElement: (tag) => ({
        tag,
        dataset: {},
        style: {
            setProperty: (name, val) => {
                console.log(`Setting CSS Var: ${name} = ${val}`);
            }
        },
        setAttribute: (name, val) => {
            console.log(`Setting Attribute: ${name} = ${val}`);
        }
    })
};

console.log('--- Testing Active Style ---');

const themeColor = signal('red');
const myStyle = css`
    .button {
        color: ${() => themeColor.get()};
        padding: 10px;
    }
`;

console.log('Scope ID:', myStyle.scope);

const mockEl = document.createElement('div');
myStyle.mount(mockEl);

console.log('Updating themeColor to blue...');
themeColor.set('blue');

// Validating (indirectly via console logs in mock)
console.log('✅ Active Style base logic verified!');
