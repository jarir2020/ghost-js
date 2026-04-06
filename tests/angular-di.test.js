// Tests for real Angular DI + Form validators — 2026-04-06
import { Angular } from '../packages/paradigms/src/index.js';

export function testAngularDI() {
    console.log('--- Testing Angular DI (createContainer, Injectable, Form validators) ---');

    // 1. createContainer — provide/inject
    const container = Angular.createContainer();
    class LogService { log(msg) { return `[LOG] ${msg}`; } }
    container.provide(LogService, new LogService());
    const logger = container.inject(LogService);
    if (!(logger instanceof LogService)) throw new Error('DI inject: wrong instance type');
    if (logger.log('test') !== '[LOG] test') throw new Error('DI inject: method broken');

    // 2. Hierarchical — child inherits parent
    const child = container.child();
    const sameLogger = child.inject(LogService);
    if (sameLogger !== logger) throw new Error('DI hierarchy: child should resolve from parent');

    // 3. Child override
    class MockLogService { log(msg) { return `[MOCK] ${msg}`; } }
    child.provide(LogService, new MockLogService());
    const mockLogger = child.inject(LogService);
    if (!(mockLogger instanceof MockLogService)) throw new Error('DI override: child should shadow parent');

    // 4. Auto-instantiate unknown class token
    class AutoService { value = 'auto'; }
    const auto = container.inject(AutoService);
    if (!(auto instanceof AutoService)) throw new Error('DI auto-instantiate: failed');
    if (auto.value !== 'auto') throw new Error('DI auto-instantiate: value wrong');

    // 5. Singleton — same instance returned twice
    const auto2 = container.inject(AutoService);
    if (auto !== auto2) throw new Error('DI singleton: different instances returned');

    // 6. Injectable() — root container singleton
    class AppService { name = 'AppService'; }
    const getApp1 = Angular.Injectable(AppService);
    const getApp2 = Angular.Injectable(AppService);
    if (getApp1() !== getApp2()) throw new Error('Injectable singleton failed');

    // 7. Form with validators
    const form = Angular.Form(
        { email: '', password: '' },
        {
            email: v => v.includes('@') ? null : 'Invalid email',
            password: v => v.length >= 6 ? null : 'Too short'
        }
    );
    if (form.isValid) throw new Error('Form: should be invalid initially (empty values)');

    form.setValue('email', 'ghost@example.com');
    form.setValue('password', 'secret123');
    if (!form.isValid) throw new Error('Form: should be valid with correct values');

    // 8. Form reset
    form.reset();
    if (form.value.email !== '') throw new Error('Form reset: email should be empty');

    console.log('✅ Angular DI tests passed!');
}
