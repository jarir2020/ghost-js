import { React, Vue, Angular } from '../packages/paradigms/src/index.js';

export function testParadigms() {
    console.log('--- Testing Paradigms ---');

    // React test
    const [count, setCount] = React.useState(0);
    if (count() !== 0) throw new Error('React useState failed');
    setCount(1);
    if (count() !== 1) throw new Error('React setter failed');

    // Vue test
    const state = Vue.reactive({ a: 1 });
    if (state.a !== 1) throw new Error('Vue reactive failed');
    state.a = 2;
    if (state.a !== 2) throw new Error('Vue reactive update failed');

    // Angular test
    const { Injectable, Form } = Angular;
    class MyService { value = 'service'; }
    const service1 = Injectable(MyService)();
    const service2 = Injectable(MyService)();
    if (service1 !== service2) throw new Error('Angular DI singleton failed');
    if (service1.value !== 'service') throw new Error('Angular service value failed');

    const form = Form({ name: 'Ghost' });
    if (form.value.name !== 'Ghost') throw new Error('Angular Form initial value failed');
    form.setValue('name', 'Phantom');
    if (form.value.name !== 'Phantom') throw new Error('Angular Form update failed');

    console.log('✅ Paradigms tests passed!');
}
