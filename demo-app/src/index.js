import { React } from '@ghost-js/paradigms';
import { mount, initDevTools } from '@ghost-js/core';

initDevTools();

const [count, setCount] = React.useState(0);

const App = () => {
    return {
        tag: 'div',
        props: { style: 'text-align: center; margin-top: 50px;' },
        children: [
            { tag: 'h1', props: {}, children: ['Ghost.js App'] },
            { tag: 'p', props: {}, children: [() => `Count: ${count()}`] },
            {
                tag: 'button',
                props: { onclick: () => setCount(c => c + 1) },
                children: ['Increment']
            }
        ]
    };
};

mount(App(), document.body);