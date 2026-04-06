// Ghost Paradigms — TypeScript definitions — 2026-04-06
import type { Signal, Computed } from '../core/index.d.ts';

// ─── React ────────────────────────────────────────────────────────────────────

export declare namespace React {
    function useState<T>(initialValue: T): [() => T, (value: T | ((prev: T) => T)) => void];
    function useEffect(fn: () => void): () => void;
    function useAsync<T>(fetcher: () => Promise<T>): import('../core/index.d.ts').AsyncSignal<T>;
    function useMemo<T>(fn: () => T): () => T;
    function Component<P>(renderFn: (props: P) => any): (props: P) => any;
}

// ─── Vue ──────────────────────────────────────────────────────────────────────

export declare namespace Vue {
    function reactive<T extends object>(obj: T): T;
    function computed<T>(fn: () => T): { readonly value: T };
    function asyncState<T>(fetcher: () => Promise<T>): import('../core/index.d.ts').AsyncSignal<T>;
    function effect(fn: () => void): () => void;
}

// ─── Angular ──────────────────────────────────────────────────────────────────

export declare namespace Angular {
    interface DIContainer {
        provide(token: any, value: any): this;
        inject<T>(token: new (...args: any[]) => T | any): T;
        child(): DIContainer;
    }
    function createContainer(parent?: DIContainer | null): DIContainer;
    function Injectable<T>(Class: new (...args: any[]) => T): () => T;
    interface FormInstance {
        readonly value: Record<string, any>;
        fields: Record<string, Signal<any>>;
        errors: Signal<Record<string, string>>;
        readonly isValid: boolean;
        setValue(key: string, value: any): void;
        validate(): boolean;
        handleSubmit(callback: (value: Record<string, any>) => void): (e?: Event) => void;
        reset(): void;
    }
    function Form(initialValues: Record<string, any>, validators?: Record<string, (v: any) => string | null>): FormInstance;
}

// ─── Svelte ───────────────────────────────────────────────────────────────────

export declare namespace Svelte {
    interface Unsubscriber { (): void; }
    interface Readable<T> {
        subscribe(fn: (value: T) => void): Unsubscriber;
        get(): T;
    }
    interface Writable<T> extends Readable<T> {
        set(value: T): void;
        update(fn: (value: T) => T): void;
    }
    function writable<T>(initialValue: T): Writable<T>;
    function readable<T>(initialValue: T, start?: (set: (v: T) => void) => (() => void) | void): Readable<T>;
    function derived<T>(stores: Readable<any> | Readable<any>[], fn: (values: any) => T): Readable<T>;
}
