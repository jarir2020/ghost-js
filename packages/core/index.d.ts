// Ghost Core — TypeScript definitions — 2026-04-06

// ─── Signals ──────────────────────────────────────────────────────────────────

export interface Signal<T> {
    get(): T;
    set(value: T): void;
}

export interface Computed<T> {
    get(): T;
}

export function signal<T>(initialValue: T): Signal<T>;
export function computed<T>(fn: () => T): Computed<T>;
export function effect(fn: () => void): () => void;
export function batch(fn: () => void): void;
export function onError(fn: ((err: Error, effectFn: Function) => void) | null): void;

// ─── Async ────────────────────────────────────────────────────────────────────

export interface AsyncSignal<T> {
    readonly data: T | null;
    readonly loading: boolean;
    readonly error: Error | null;
    refetch(): Promise<void>;
}

export function asyncSignal<T>(fetcher: () => Promise<T>): AsyncSignal<T>;

// ─── Render Graph ─────────────────────────────────────────────────────────────

export interface GhostNode {
    tag: string;
    props: Record<string, any>;
    children: GhostChild[];
    el: HTMLElement | null;
    effects: Array<() => void>;
    events: {
        mount: Array<() => void>;
        update: Array<() => void>;
        destroy: Array<() => void>;
        error: Array<(err: Error) => void>;
    };
}

export type GhostChild = string | number | GhostNode | (() => string | number) | GhostListDescriptor | GhostWhenDescriptor | GhostLazyDescriptor;

export interface GhostListDescriptor { __ghostList: true; }
export interface GhostWhenDescriptor { __ghostWhen: true; }
export interface GhostLazyDescriptor { __ghostLazy: true; }

export function createNode(tag: string, props: Record<string, any>, children?: GhostChild[]): GhostNode;
export function on(node: GhostNode, event: 'mount' | 'update' | 'destroy' | 'error', fn: Function): void;
export function onNodeError(node: GhostNode, fn: (err: Error) => void): void;
export function mount(node: GhostNode | GhostListDescriptor | GhostWhenDescriptor, parentEl: HTMLElement): void;
export function destroy(node: GhostNode | GhostListDescriptor | GhostWhenDescriptor): void;
export function scheduleUpdate(fn: () => void): void;

export function createList<T>(
    getItems: () => T[],
    keyFn: (item: T, index: number) => string | number,
    renderFn: (item: T, index: number) => GhostNode
): GhostListDescriptor;

export function when(
    conditionGetter: () => boolean,
    trueFn: () => GhostNode,
    falseFn?: (() => GhostNode) | null
): GhostWhenDescriptor;

export function defineComponent<P extends Record<string, any>>(
    setup: (props: { [K in keyof P]: () => P[K] }) => GhostNode
): (rawProps?: P) => GhostNode;

export function memo(factory: () => GhostNode, depsGetter: () => any): GhostNode;

export function lazyNode(
    importFn: () => Promise<{ default: () => GhostNode } | (() => GhostNode)>,
    fallback?: GhostNode | null
): GhostLazyDescriptor;

// ─── SSR ──────────────────────────────────────────────────────────────────────

export function renderToString(node: GhostChild): string;
export function renderToStream(node: GhostChild): AsyncGenerator<string>;
export function renderWithState(node: GhostChild, state?: Record<string, any>): string;
export function hydrate(App: GhostNode, container: HTMLElement): void;

// ─── Style ────────────────────────────────────────────────────────────────────

export interface GhostStyle {
    scope: string;
    mount(el: HTMLElement): void;
}

export function css(strings: TemplateStringsArray, ...values: Array<string | number | (() => string | number)>): GhostStyle;

// ─── HTTP ─────────────────────────────────────────────────────────────────────

export interface GhostFetchOptions extends RequestInit {
    cache?: 'memory' | false;
}

export function ghostFetch(url: string, options?: GhostFetchOptions): Promise<any>;
export namespace ghostFetch {
    const interceptors: {
        request: Array<(config: Record<string, any>) => Record<string, any>>;
        response: Array<(response: Response, data: any) => any>;
    };
}
export function xml2json(xmlString: string): Record<string, any>;
export function clearHttpCache(url?: string, method?: string): void;

// ─── Persistence ─────────────────────────────────────────────────────────────

export function persistSignal<T>(key: string, initialValue: T): Signal<T>;

// ─── Mediator ─────────────────────────────────────────────────────────────────

export interface EventBus {
    on(event: string, fn: (data: any) => void): () => void;
    emit(event: string, data?: any): void;
    clear(event?: string): void;
}

export function createBus(): EventBus;
export const mediator: EventBus;

// ─── i18n ─────────────────────────────────────────────────────────────────────

export const locale: Signal<string>;
export function loadLocale(lang: string, dict: Record<string, any>): void;
export function t(key: string, vars?: Record<string, string | number>): () => string;
export function tr(key: string, reactiveVars?: Record<string, () => string | number>): () => string;

// ─── DevTools ─────────────────────────────────────────────────────────────────

export function initDevTools(): void;
