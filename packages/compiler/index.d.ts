// Ghost Compiler — TypeScript definitions — 2026-04-06

export type TokenType = 'text' | 'expr' | 'attr_bind' | 'tag_open' | 'tag_close' | 'self_close';

export interface Token {
    type: TokenType;
    value?: string;
    name?: string;
    attrs?: Record<string, string | true>;
    bindings?: Record<string, string>;
}

export interface CompileResult {
    code: string;
    tokens: Token[];
    map: null;
}

export function tokenize(template: string): Token[];
export function compile(template: string): CompileResult;

// esbuild plugin
export interface EsbuildPlugin {
    name: string;
    setup(build: any): void;
}

export function ghostPlugin(): EsbuildPlugin;
