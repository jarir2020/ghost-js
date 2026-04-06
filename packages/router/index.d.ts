// Ghost Router — TypeScript definitions — 2026-04-06
import type { Signal } from '../core/index.d.ts';

export type GuardFn = (to: string, from: string) => boolean | string | Promise<boolean | string | void>;

export interface Router {
    readonly path: string;
    readonly query: Record<string, string | true>;
    readonly params: Record<string, string>;
    push(path: string): Promise<void>;
    guard(fn: GuardFn): this;
    link(path: string, children: any[]): import('../core/index.d.ts').GhostNode;
    readonly activeComponent: any | null;
}

export interface FileRouter {
    readonly path: string;
    readonly query: Record<string, string | true>;
    readonly params: Record<string, string>;
    push(path: string): Promise<void>;
    guard(fn: GuardFn): this;
    readonly matched: any[];
}

export interface RouteConfig {
    path: string;
    component?: any;
    children?: RouteConfig[];
}

export interface RouteTree {
    layout?: any;
    page?: any;
    children?: Record<string, RouteTree>;
    '*'?: RouteTree;
}

export function createRouter(routes: RouteConfig[]): Router;
export function createFileRouter(routeTree: RouteTree): FileRouter;
export const routeParams: Signal<Record<string, string>>;
export const routeQuery: Signal<Record<string, string | true>>;
