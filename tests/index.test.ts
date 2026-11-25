import { describe, expect, test } from "@jest/globals";

import { transpile } from "../src/index.ts";

const HEADER = "// This file has been automatically generated with jsdoc-to-d-ts\n";

function getIndentation(line: string): number {
    return line.length - line.trimStart().length;
}

function code(strings: TemplateStringsArray): string {
    const lines = strings.join("").split("\n").slice(1, -1);

    const indentation = Math.min(...lines.filter(line => line.trim() != "").map(getIndentation));

    return lines.map(line => line.slice(indentation) + "\n").join("");
}

function run(input: string, output: string): void {
    expect(transpile(input)).toBe(HEADER + output);
}

describe("transpile", () => {
    test("should generate only the header for files without exports", () => {
        const INPUT = code`
            const a = 1;

            function f() {}
        `;

        const OUTPUT = code`
        `;

        run(INPUT, OUTPUT);
    });

    test("should take the type of a constant from @type", () => {
        const INPUT = code`
            /** @type {number} */
            export const a = 1;
        `;

        const OUTPUT = code`
            /** @type {number} */
            export const a: number;
        `;

        run(INPUT, OUTPUT);
    });

    test("should keep the let and var keywords", () => {
        const INPUT = code`
            /** @type {string} */
            export let b = "b";

            /** @type {boolean} */
            export var c = true;
        `;

        const OUTPUT = code`
            /** @type {string} */
            export let b: string;
            /** @type {boolean} */
            export var c: boolean;
        `;

        run(INPUT, OUTPUT);
    });

    test("should declare a constant without @type as any", () => {
        const INPUT = code`
            export const a = [1, 2];
        `;

        const OUTPUT = code`
            export const a: any;
        `;

        run(INPUT, OUTPUT);
    });

    test("should omit non-exported and @internal constants", () => {
        const INPUT = code`
            /** @type {number} */
            const a = 1;

            /**
             * @internal
             * @type {number}
             */
            export const b = 2;
        `;

        const OUTPUT = code`
        `;

        run(INPUT, OUTPUT);
    });

    test("should declare and then export a default-exported assignment", () => {
        const INPUT = code`
            /** @type {string} */
            export default name = "value";
        `;

        const OUTPUT = code`
            /** @type {string} */
            declare const name: string;
            export default name;
        `;

        run(INPUT, OUTPUT);
    });

    test("should declare a default-exported expression as _default", () => {
        const INPUT = code`
            /** @type {{ a: number }} */
            export default { a: 1 };
        `;

        const OUTPUT = code`
            /** @type {{ a: number }} */
            declare const _default: { a: number };
            export default _default;
        `;

        run(INPUT, OUTPUT);
    });

    test("should rename _default to avoid declared names", () => {
        const INPUT = code`
            /** @type {number} */
            const _default = 1;

            export { _default as fallback };

            /** @type {string} */
            export default "x";
        `;

        const OUTPUT = code`
            /** @type {number} */
            declare const _default: number;
            /** @type {string} */
            declare const _default_1: string;
            export default _default_1;
            export { _default as fallback };
        `;

        run(INPUT, OUTPUT);
    });

    test("should rename _default to avoid imports and typedefs", () => {
        const INPUT = code`
            import _default from "./a.js";

            /** @typedef {string} _default_1 */

            /** @type {_default} */
            export default 1;
        `;

        const OUTPUT = code`
            /** @type {_default} */
            declare const _default_2: _default;
            export default _default_2;
            export type _default_1 = string;
            import _default from "./a.js";
        `;

        run(INPUT, OUTPUT);
    });

    test("should convert an object literal with @enum into an enum", () => {
        const INPUT = code`
            /**
             * Directions.
             *
             * @enum {number}
             */
            export const Direction = {
                UP: 1,
                DOWN: 2
            };
        `;

        const OUTPUT = code`
            /**
             * Directions.
             *
             * @enum {number}
             */
            export enum Direction {
                UP = 1,
                DOWN = 2
            }
        `;

        run(INPUT, OUTPUT);
    });

    test("should keep colons, strings and nested objects in enum values", () => {
        const INPUT = code`
            /** @enum {string} */
            export const Values = { URL: "http://example.com", TERNARY: flag ? "a" : "b", NESTED: { a: "x" }.a, };
        `;

        const OUTPUT = code`
            /** @enum {string} */
            export enum Values {
                URL = "http://example.com",
                TERNARY = flag ? "a" : "b",
                NESTED = { a: "x" }.a
            }
        `;

        run(INPUT, OUTPUT);
    });

    test("should keep quoted names and documentation of enum members", () => {
        const INPUT = code`
            /** @enum {string} */
            export const Keys = {
                /** The first. */
                "with-dash": "a",
                'single': "b"
            };
        `;

        const OUTPUT = code`
            /** @enum {string} */
            export enum Keys {
                /** The first. */
                "with-dash" = "a",
                'single' = "b"
            }
        `;

        run(INPUT, OUTPUT);
    });

    test("should accept @enum without a type", () => {
        const INPUT = code`
            /** @enum */
            export const E = { A: 0 };
        `;

        const OUTPUT = code`
            /** @enum */
            export enum E {
                A = 0
            }
        `;

        run(INPUT, OUTPUT);
    });

    test("should convert an empty object literal into an empty enum", () => {
        const INPUT = code`
            /** @enum {number} */
            export const E = {};
        `;

        const OUTPUT = code`
            /** @enum {number} */
            export enum E {
            }
        `;

        run(INPUT, OUTPUT);
    });

    test("should keep a constant when the @enum value is not an object literal", () => {
        const INPUT = code`
            /** @enum {string} */
            export const Frozen = Object.freeze({ A: "a" });
        `;

        const OUTPUT = code`
            /** @enum {string} */
            export const Frozen: any;
        `;

        run(INPUT, OUTPUT);
    });

    test("should declare and then export a default-exported enum", () => {
        const INPUT = code`
            /** @enum {string} */
            export default Mode = { A: "a" };
        `;

        const OUTPUT = code`
            /** @enum {string} */
            declare enum Mode {
                A = "a"
            }
            export default Mode;
        `;

        run(INPUT, OUTPUT);
    });

    test("should declare an enum exported through an export list", () => {
        const INPUT = code`
            /** @enum {number} */
            const Level = { LOW: 0 };

            export { Level };
        `;

        const OUTPUT = code`
            /** @enum {number} */
            declare enum Level {
                LOW = 0
            }
            export { Level };
        `;

        run(INPUT, OUTPUT);
    });

    test("should take parameters and return type from @param and @returns", () => {
        const INPUT = code`
            /**
             * Adds two numbers.
             *
             * @param {number} a - The first.
             * @param {number} b - The second.
             * @returns {number} The sum.
             */
            export function add(a, b) {
                return a + b;
            }
        `;

        const OUTPUT = code`
            /**
             * Adds two numbers.
             *
             * @param {number} a - The first.
             * @param {number} b - The second.
             * @returns {number} The sum.
             */
            export function add(a: number, b: number): number;
        `;

        run(INPUT, OUTPUT);
    });

    test("should declare undocumented parameters and return types as any", () => {
        const INPUT = code`
            export function f(a, b) {}
        `;

        const OUTPUT = code`
            export function f(a: any, b: any): any;
        `;

        run(INPUT, OUTPUT);
    });

    test("should accept @return as an alias of @returns", () => {
        const INPUT = code`
            /** @return {string} */
            export function f() {}
        `;

        const OUTPUT = code`
            /** @return {string} */
            export function f(): string;
        `;

        run(INPUT, OUTPUT);
    });

    test("should make parameters in square brackets optional", () => {
        const INPUT = code`
            /**
             * @param {number} [a]
             * @param {string} [b="x"]
             * @returns {void}
             */
            export function f(a, b) {}
        `;

        const OUTPUT = code`
            /**
             * @param {number} [a]
             * @param {string} [b="x"]
             * @returns {void}
             */
            export function f(a?: number, b?: string): void;
        `;

        run(INPUT, OUTPUT);
    });

    test("should make parameters with a default value in the code optional", () => {
        const INPUT = code`
            /**
             * @param {number} index
             * @returns {void}
             */
            export function f(index = 0) {}
        `;

        const OUTPUT = code`
            /**
             * @param {number} index
             * @returns {void}
             */
            export function f(index?: number): void;
        `;

        run(INPUT, OUTPUT);
    });

    test("should match parameters to @param tags by name", () => {
        const INPUT = code`
            /**
             * @param {number} b
             * @param {string} a
             * @param {boolean} ghost
             * @returns {void}
             */
            export function f(a, b, c) {}
        `;

        const OUTPUT = code`
            /**
             * @param {number} b
             * @param {string} a
             * @param {boolean} ghost
             * @returns {void}
             */
            export function f(a: string, b: number, c: any): void;
        `;

        run(INPUT, OUTPUT);
    });

    test("should match binding patterns to the @param at the same position", () => {
        const INPUT = code`
            /**
             * @param {Object} options
             * @param {string} options.x
             * @param {number} other
             * @returns {void}
             */
            export function f({ x }, other) {}
        `;

        const OUTPUT = code`
            /**
             * @param {Object} options
             * @param {string} options.x
             * @param {number} other
             * @returns {void}
             */
            export function f(options: {
                x: string;
            }, other: number): void;
        `;

        run(INPUT, OUTPUT);
    });

    test("should declare as any a binding pattern whose position belongs to another parameter", () => {
        const INPUT = code`
            /**
             * @param {number} other
             * @returns {void}
             */
            export function f({ x }, other) {}
        `;

        const OUTPUT = code`
            /**
             * @param {number} other
             * @returns {void}
             */
            export function f({ x }: any, other: number): void;
        `;

        run(INPUT, OUTPUT);
    });

    test("should keep the shape of undocumented binding patterns without default values", () => {
        const INPUT = code`
            export function f({ a, b: { c } = {}, ...others }, [d, [e], ...g] = []) {}
        `;

        const OUTPUT = code`
            export function f({ a, b: { c }, ...others }: any, [ d, [ e ], ...g ]?: any): any;
        `;

        run(INPUT, OUTPUT);
    });

    test("should take the element type of rest parameters from a variadic @param", () => {
        const INPUT = code`
            /**
             * @param {string} first
             * @param {...number} rest
             * @returns {void}
             */
            export function f(first, ...rest) {}
        `;

        const OUTPUT = code`
            /**
             * @param {string} first
             * @param {...number} rest
             * @returns {void}
             */
            export function f(first: string, ...rest: number[]): void;
        `;

        run(INPUT, OUTPUT);
    });

    test("should wrap variadic types in parentheses when needed", () => {
        const INPUT = code`
            /**
             * @param {...(string | number)} values
             * @param {...keyof T} keys
             * @returns {void}
             */
            export function f(values, keys) {}

            /**
             * @param {...*} values
             * @returns {void}
             */
            export function g(...values) {}

            export function h(...args) {}
        `;

        const OUTPUT = code`
            /**
             * @param {...(string | number)} values
             * @param {...keyof T} keys
             * @returns {void}
             */
            export function f(values: (string | number)[], keys: (keyof T)[]): void;
            /**
             * @param {...*} values
             * @returns {void}
             */
            export function g(...values: any[]): void;
            export function h(...args: any[]): any;
        `;

        run(INPUT, OUTPUT);
    });

    test("should never make rest parameters optional", () => {
        const INPUT = code`
            /**
             * @param {...number} [values]
             * @returns {void}
             */
            export function f(...values) {}
        `;

        const OUTPUT = code`
            /**
             * @param {...number} [values]
             * @returns {void}
             */
            export function f(...values: number[]): void;
        `;

        run(INPUT, OUTPUT);
    });

    test("should declare generic types with constraints and defaults from @template", () => {
        const INPUT = code`
            /**
             * @template {string} K, V
             * @template [D=number]
             * @param {K} k
             * @param {V} v
             * @returns {[K, V, D]}
             */
            export function f(k, v) {}
        `;

        const OUTPUT = code`
            /**
             * @template {string} K, V
             * @template [D=number]
             * @param {K} k
             * @param {V} v
             * @returns {[K, V, D]}
             */
            export function f<K extends string, V, D = number>(k: K, v: V): [K, V, D];
        `;

        run(INPUT, OUTPUT);
    });

    test("should declare async functions as plain functions", () => {
        const INPUT = code`
            /** @returns {Promise<void>} */
            export async function f() {}
        `;

        const OUTPUT = code`
            /** @returns {Promise<void>} */
            export function f(): Promise<void>;
        `;

        run(INPUT, OUTPUT);
    });

    test("should omit the implementation signature of overloads", () => {
        const INPUT = code`
            /**
             * @overload
             * @param {string} value
             * @returns {string}
             */
            /**
             * @overload
             * @param {...number} values
             * @returns {number}
             */
            /**
             * @param {...any} args
             * @returns {string | number}
             */
            export function f(...args) {}
        `;

        const OUTPUT = code`
            /**
             * @overload
             * @param {string} value
             * @returns {string}
             */
            export function f(value: string): string;
            /**
             * @overload
             * @param {...number} values
             * @returns {number}
             */
            export function f(...values: number[]): number;
        `;

        run(INPUT, OUTPUT);
    });

    test("should omit @internal functions and overloads", () => {
        const INPUT = code`
            /**
             * @internal
             * @returns {void}
             */
            export function hidden() {}

            /**
             * @overload
             * @internal
             * @param {string} a
             * @returns {string}
             */
            /**
             * @overload
             * @param {number} a
             * @returns {number}
             */
            /**
             * @param {any} a
             * @returns {any}
             */
            export function partly(a) {}
        `;

        const OUTPUT = code`
            /**
             * @overload
             * @param {number} a
             * @returns {number}
             */
            export function partly(a: number): number;
        `;

        run(INPUT, OUTPUT);
    });

    test("should omit non-exported functions", () => {
        const INPUT = code`
            function f() {}
        `;

        const OUTPUT = code`
        `;

        run(INPUT, OUTPUT);
    });

    test("should keep the name of a default-exported function", () => {
        const INPUT = code`
            export default async function named(a) {}
        `;

        const OUTPUT = code`
            export default function named(a: any): any;
        `;

        run(INPUT, OUTPUT);
    });

    test("should declare an anonymous default-exported function without a name", () => {
        const INPUT = code`
            /** @returns {void} */
            export default function () {}
        `;

        const OUTPUT = code`
            /** @returns {void} */
            export default function (): void;
        `;

        run(INPUT, OUTPUT);
    });

    test("should build nested object types from dotted @param tags", () => {
        const INPUT = code`
            /**
             * @param {Object} config
             * @param {Object} config.server
             * @param {string} config.server.host
             * @param {number} [config.server.port=80]
             * @param {Object[]} config.users
             * @param {string} config.users[].id
             * @param {Array<Object>} config.groups
             * @param {string} config.groups[].name
             * @returns {void}
             */
            export function f(config) {}
        `;

        const OUTPUT = code`
            /**
             * @param {Object} config
             * @param {Object} config.server
             * @param {string} config.server.host
             * @param {number} [config.server.port=80]
             * @param {Object[]} config.users
             * @param {string} config.users[].id
             * @param {Array<Object>} config.groups
             * @param {string} config.groups[].name
             * @returns {void}
             */
            export function f(config: {
                server: {
                    host: string;
                    port?: number;
                };
                users: {
                    id: string;
                }[];
                groups: {
                    name: string;
                }[];
            }): void;
        `;

        run(INPUT, OUTPUT);
    });

    test("should ignore dotted @param tags without an object parent", () => {
        const INPUT = code`
            /**
             * @param {number} options.x
             * @param {Foo} other
             * @param {string} other.y
             * @returns {void}
             */
            export function f(options, other) {}
        `;

        const OUTPUT = code`
            /**
             * @param {number} options.x
             * @param {Foo} other
             * @param {string} other.y
             * @returns {void}
             */
            export function f(options: any, other: Foo): void;
        `;

        run(INPUT, OUTPUT);
    });

    test("should take the type of an arrow function from @param and @returns", () => {
        const INPUT = code`
            /**
             * @param {number} a
             * @returns {number}
             */
            export const double = (a) => a * 2;
        `;

        const OUTPUT = code`
            /**
             * @param {number} a
             * @returns {number}
             */
            export const double: (a: number) => number;
        `;

        run(INPUT, OUTPUT);
    });

    test("should support generic, async, named and single-parameter function expressions", () => {
        const INPUT = code`
            /**
             * @template T
             * @param {T} value
             * @returns {Promise<T>}
             */
            export const wrap = async function named(value) {};

            /**
             * @param {string} s
             * @returns {void}
             */
            export let log = s => {
                console.log(s);
            }

            export const untyped = (x, y = 1) => x;
        `;

        const OUTPUT = code`
            /**
             * @template T
             * @param {T} value
             * @returns {Promise<T>}
             */
            export const wrap: <T>(value: T) => Promise<T>;
            /**
             * @param {string} s
             * @returns {void}
             */
            export let log: (s: string) => void;
            export const untyped: (x: any, y?: any) => any;
        `;

        run(INPUT, OUTPUT);
    });

    test("should give @type precedence over the signature", () => {
        const INPUT = code`
            /** @type {(a: string) => void} */
            export const typed = (a) => {};
        `;

        const OUTPUT = code`
            /** @type {(a: string) => void} */
            export const typed: (a: string) => void;
        `;

        run(INPUT, OUTPUT);
    });

    test("should not treat expressions containing a function as functions", () => {
        const INPUT = code`
            /** @type {number} */
            export const value = (1 + 2) * 3;

            export const result = compute(a => a);
        `;

        const OUTPUT = code`
            /** @type {number} */
            export const value: number;
            export const result: any;
        `;

        run(INPUT, OUTPUT);
    });

    test("should declare a default-exported arrow function as _default", () => {
        const INPUT = code`
            /**
             * @param {number} a
             * @returns {number}
             */
            export default (a) => a;
        `;

        const OUTPUT = code`
            /**
             * @param {number} a
             * @returns {number}
             */
            declare const _default: (a: number) => number;
            export default _default;
        `;

        run(INPUT, OUTPUT);
    });

    test("should declare fields, constructor and methods", () => {
        const INPUT = code`
            export class Counter {
                /** @type {number} */
                count = 0;

                untyped;

                /**
                 * @param {number} start
                 */
                constructor(start) {
                    /** @type {string} */
                    this.label = "counter";
                }

                /**
                 * @param {number} step
                 * @returns {number}
                 */
                increment(step) {}
            }
        `;

        const OUTPUT = code`
            export class Counter {
                /** @type {number} */
                count: number;
                untyped: any;
                /** @type {string} */
                label: string;
                /**
                 * @param {number} start
                 */
                constructor(start: number);
                /**
                 * @param {number} step
                 * @returns {number}
                 */
                increment(step: number): number;
            }
        `;

        run(INPUT, OUTPUT);
    });

    test("should keep the static, protected and readonly modifiers", () => {
        const INPUT = code`
            export class K {
                /**
                 * @protected
                 * @readonly
                 * @type {number}
                 */
                static version = 1;

                /**
                 * @protected
                 * @returns {void}
                 */
                static reset() {}

                /** @returns {Promise<void>} */
                static async load() {}
            }
        `;

        const OUTPUT = code`
            export class K {
                /**
                 * @protected
                 * @readonly
                 * @type {number}
                 */
                protected static readonly version: number;
                /**
                 * @protected
                 * @returns {void}
                 */
                protected static reset(): void;
                /** @returns {Promise<void>} */
                static load(): Promise<void>;
            }
        `;

        run(INPUT, OUTPUT);
    });

    test("should omit private members", () => {
        const INPUT = code`
            export class K {
                #secret = 1;

                /** @private */
                hidden = 2;

                constructor() {
                    this.#other = 3;

                    /** @private */
                    this.alsoHidden = 4;
                }

                #privateMethod() {}

                /**
                 * @private
                 * @returns {void}
                 */
                privateByDoc() {}

                get #privateGetter() {
                    return 1;
                }
            }
        `;

        const OUTPUT = code`
            export class K {
                constructor();
            }
        `;

        run(INPUT, OUTPUT);
    });

    test("should declare fields assigned to this in the methods", () => {
        const INPUT = code`
            export class K {
                constructor() {
                    this.a = this.b = 1;
                    this.c == 2;
                    items.forEach(item => {
                        /** @type {number} */
                        this.d = item;
                    });
                }

                /** @returns {void} */
                reset() {
                    if (ready) {
                        this.e = 0;
                    }
                }
            }
        `;

        const OUTPUT = code`
            export class K {
                a: any;
                b: any;
                /** @type {number} */
                d: number;
                e: any;
                constructor();
                /** @returns {void} */
                reset(): void;
            }
        `;

        run(INPUT, OUTPUT);
    });

    test("should replace an undocumented field with a documented assignment to this", () => {
        const INPUT = code`
            export class K {
                value;

                constructor() {
                    /** @type {string} */
                    this.value = "x";
                }
            }
        `;

        const OUTPUT = code`
            export class K {
                /** @type {string} */
                value: string;
                constructor();
            }
        `;

        run(INPUT, OUTPUT);
    });

    test("should not replace a field with an undocumented assignment to this", () => {
        const INPUT = code`
            export class K {
                /** @type {number} */
                count = 0;

                constructor() {
                    this.count = 1;
                    this.count = 2;
                }
            }
        `;

        const OUTPUT = code`
            export class K {
                /** @type {number} */
                count: number;
                constructor();
            }
        `;

        run(INPUT, OUTPUT);
    });

    test("should declare fields assigned to this in a static block as static", () => {
        const INPUT = code`
            export class K {
                static {
                    /** @type {number} */
                    this.count = 0;
                }
            }
        `;

        const OUTPUT = code`
            export class K {
                /** @type {number} */
                static count: number;
            }
        `;

        run(INPUT, OUTPUT);
    });

    test("should give fields initialized with a function its signature", () => {
        const INPUT = code`
            export class K {
                /**
                 * @param {MouseEvent} event
                 * @returns {void}
                 */
                onClick = (event) => {};

                constructor() {
                    /**
                     * @template T
                     * @param {Object} options
                     * @param {T} options.value
                     * @returns {T}
                     */
                    this.unwrap = function (options) {};
                }
            }
        `;

        const OUTPUT = code`
            export class K {
                /**
                 * @param {MouseEvent} event
                 * @returns {void}
                 */
                onClick: (event: MouseEvent) => void;
                /**
                 * @template T
                 * @param {Object} options
                 * @param {T} options.value
                 * @returns {T}
                 */
                unwrap: <T>(options: {
                    value: T;
                }) => T;
                constructor();
            }
        `;

        run(INPUT, OUTPUT);
    });

    test("should take the type of getters from @type and omit the return type of setters", () => {
        const INPUT = code`
            export class K {
                /** @type {number} */
                get size() {
                    return 1;
                }

                /** @param {number} value */
                set size(value = 0) {}

                get untyped() {
                    return 1;
                }

                /** @type {string} */
                static get version() {
                    return "1";
                }

                /** @param {string} value */
                static set version(value) {}

                set untyped(value) {}
            }
        `;

        const OUTPUT = code`
            export class K {
                /** @type {number} */
                get size(): number;
                /** @param {number} value */
                set size(value: number);
                get untyped(): any;
                /** @type {string} */
                static get version(): string;
                /** @param {string} value */
                static set version(value: string);
                set untyped(value: any);
            }
        `;

        run(INPUT, OUTPUT);
    });

    test("should not recognize keywords inside longer names", () => {
        const INPUT = code`
            export class K {
                staticValue = 1;

                asyncThing = 2;

                getValue() {}
            }
        `;

        const OUTPUT = code`
            export class K {
                staticValue: any;
                asyncThing: any;
                getValue(): any;
            }
        `;

        run(INPUT, OUTPUT);
    });

    test("should omit the implementation signature of method overloads", () => {
        const INPUT = code`
            export class K {
                /**
                 * @overload
                 * @param {string} x
                 * @returns {string}
                 */
                /**
                 * @param {unknown} x
                 * @returns {unknown}
                 */
                convert(x) {}
            }
        `;

        const OUTPUT = code`
            export class K {
                /**
                 * @overload
                 * @param {string} x
                 * @returns {string}
                 */
                convert(x: string): string;
            }
        `;

        run(INPUT, OUTPUT);
    });

    test("should support generic classes and methods", () => {
        const INPUT = code`
            /**
             * @template T
             * @template {object} [U={}]
             */
            export class Box {
                /**
                 * @template R
                 * @param {(value: T) => R} fn
                 * @returns {R}
                 */
                map(fn) {}
            }
        `;

        const OUTPUT = code`
            /**
             * @template T
             * @template {object} [U={}]
             */
            export class Box<T, U extends object = {}> {
                /**
                 * @template R
                 * @param {(value: T) => R} fn
                 * @returns {R}
                 */
                map<R>(fn: (value: T) => R): R;
            }
        `;

        run(INPUT, OUTPUT);
    });

    test("should declare the base class and the @implements of a class", () => {
        const INPUT = code`
            /**
             * @implements {Iface<string>}
             * @implements {Other}
             */
            export class A extends Base {}
        `;

        const OUTPUT = code`
            /**
             * @implements {Iface<string>}
             * @implements {Other}
             */
            export class A extends Base implements Iface<string>, Other {
            }
        `;

        run(INPUT, OUTPUT);
    });

    test("should add the type arguments of @extends and @augments to the base class", () => {
        const INPUT = code`
            /** @extends {Base<string>} */
            export class A extends Base {}

            /** @augments Base<number[]> */
            export class B extends Base {}

            /** @extends {Other<string>} */
            export class C extends Base {}

            /** @extends {Base<string>} */
            export class D {}
        `;

        const OUTPUT = code`
            /** @extends {Base<string>} */
            export class A extends Base<string> {
            }
            /** @augments Base<number[]> */
            export class B extends Base<number[]> {
            }
            /** @extends {Other<string>} */
            export class C extends Base {
            }
            /** @extends {Base<string>} */
            export class D {
            }
        `;

        run(INPUT, OUTPUT);
    });

    test("should declare @interface classes as interfaces and @abstract ones as abstract", () => {
        const INPUT = code`
            /**
             * @interface
             */
            export class Shape {
                /** @returns {number} */
                area() {}
            }

            /**
             * @abstract
             */
            export class Animal {
                /**
                 * @abstract
                 * @returns {string}
                 */
                speak() {}
            }
        `;

        const OUTPUT = code`
            /**
             * @interface
             */
            export interface Shape {
                /** @returns {number} */
                area(): number;
            }
            /**
             * @abstract
             */
            export abstract class Animal {
                /**
                 * @abstract
                 * @returns {string}
                 */
                abstract speak(): string;
            }
        `;

        run(INPUT, OUTPUT);
    });

    test("should declare an anonymous default-exported class without a name", () => {
        const INPUT = code`
            export default class extends Base {}
        `;

        const OUTPUT = code`
            export default class extends Base {
            }
        `;

        run(INPUT, OUTPUT);
    });

    test("should omit non-exported and @internal classes", () => {
        const INPUT = code`
            class Local {}

            /** @internal */
            export class Hidden {}
        `;

        const OUTPUT = code`
        `;

        run(INPUT, OUTPUT);
    });

    test("should skip computed members", () => {
        const INPUT = code`
            export class K {
                [Symbol.iterator]() {}

                /** @type {string} */
                name = "k";
            }
        `;

        const OUTPUT = code`
            export class K {
                /** @type {string} */
                name: string;
            }
        `;

        run(INPUT, OUTPUT);
    });

    test("should convert a typedef into a type alias", () => {
        const INPUT = code`
            /** @typedef {string | number} Id */
        `;

        const OUTPUT = code`
            export type Id = string | number;
        `;

        run(INPUT, OUTPUT);
    });

    test("should build an object type from @property and @prop", () => {
        const INPUT = code`
            /**
             * @typedef {Object} Point
             * @property {number} x - The x coordinate.
             * @prop {number} [y] The y coordinate.
             * @property {number} z
             */
        `;

        const OUTPUT = code`
            export type Point = {
                /**
                 * The x coordinate.
                 */
                x: number;
                /**
                 * The y coordinate.
                 */
                y?: number;
                z: number;
            };
        `;

        run(INPUT, OUTPUT);
    });

    test("should build nested object types with descriptions from dotted @property tags", () => {
        const INPUT = code`
            /**
             * @typedef {Object} Config
             * @property {Object} server - The server,
             *     on two lines.
             * @property {string} server.host - The host.
             * @property {Object[]} [server.tags]
             * @property {string} server.tags[].name - A tag.
             */
        `;

        const OUTPUT = code`
            export type Config = {
                /**
                 * The server,
                 *     on two lines.
                 */
                server: {
                    /**
                     * The host.
                     */
                    host: string;
                    tags?: {
                        /**
                         * A tag.
                         */
                        name: string;
                    }[];
                };
            };
        `;

        run(INPUT, OUTPUT);
    });

    test("should support generic typedefs", () => {
        const INPUT = code`
            /**
             * @template T
             * @typedef {Object} Box
             * @property {T} value
             */

            /**
             * @template {string} K, [V=number]
             * @typedef {Record<K, V>} Dict
             */

            /** @typedef {Array<T>} List<T> */

            /**
             * @template T
             * @typedef {T[]} Both<T>
             */
        `;

        const OUTPUT = code`
            export type Box<T> = {
                value: T;
            };
            export type Dict<K extends string, V = number> = Record<K, V>;
            export type List<T> = Array<T>;
            export type Both<T> = T[];
        `;

        run(INPUT, OUTPUT);
    });

    test("should separate typedefs from the documentation of a declaration", () => {
        const INPUT = code`
            /**
             * @typedef {Object} Options
             * @property {boolean} verbose
             */
            /**
             * @param {Options} options
             * @returns {void}
             */
            export function run(options) {}

            /** @typedef {string} Name */
            export const name = "x";

            /** @typedef {number} Id */
            export class K {}

            /** @typedef {string} T */
            export function f() {}
        `;

        const OUTPUT = code`
            export const name: any;
            /**
             * @param {Options} options
             * @returns {void}
             */
            export function run(options: Options): void;
            export function f(): any;
            export class K {
            }
            export type Options = {
                verbose: boolean;
            };
            export type Name = string;
            export type Id = number;
            export type T = string;
        `;

        run(INPUT, OUTPUT);
    });

    test("should omit @internal typedefs and documentation comments without a typedef", () => {
        const INPUT = code`
            /**
             * @internal
             * @typedef {number} Secret
             */

            /** Just a comment. */
        `;

        const OUTPUT = code`
        `;

        run(INPUT, OUTPUT);
    });

    test("should keep the imports used by the declarations and remove the unused ones", () => {
        const INPUT = code`
            import { A, B as C, Unused } from "./a.js";
            import D, { E } from "./d.js";
            import F from "./f.js";
            import * as G from "./g.js";
            import H, { I } from "./h.js";

            /**
             * @param {A} a
             * @param {C} c
             * @param {D} d
             * @param {E} e
             * @param {G.Thing} g
             * @returns {I}
             */
            export function use(a, c, d, e, g) {}
        `;

        const OUTPUT = code`
            /**
             * @param {A} a
             * @param {C} c
             * @param {D} d
             * @param {E} e
             * @param {G.Thing} g
             * @returns {I}
             */
            export function use(a: A, c: C, d: D, e: E, g: G.Thing): I;
            import { A, B as C } from "./a.js";
            import D, { E } from "./d.js";
            import * as G from "./g.js";
            import { I } from "./h.js";
        `;

        run(INPUT, OUTPUT);
    });

    test("should keep imports used only by export statements", () => {
        const INPUT = code`
            import { Listed } from "./listed.js";
            import Defaulted from "./defaulted.js";
            import { ReExported } from "./re-exported.js";

            export { Listed };
            export default Defaulted;
            export { ReExported } from "./re-exported.js";
        `;

        const OUTPUT = code`
            export { Listed };
            export default Defaulted;
            export { ReExported } from "./re-exported.js";
            import { Listed } from "./listed.js";
            import Defaulted from "./defaulted.js";
        `;

        run(INPUT, OUTPUT);
    });

    test("should keep imports used only by generic types", () => {
        const INPUT = code`
            import { Constraint, Fallback, Unused } from "./types.js";

            /**
             * @template {Constraint} T
             * @template [U=Fallback]
             * @param {number} n
             * @returns {void}
             */
            export function f(n) {}
        `;

        const OUTPUT = code`
            /**
             * @template {Constraint} T
             * @template [U=Fallback]
             * @param {number} n
             * @returns {void}
             */
            export function f<T extends Constraint, U = Fallback>(n: number): void;
            import { Constraint, Fallback } from "./types.js";
        `;

        run(INPUT, OUTPUT);
    });

    test("should keep imports used only by a class", () => {
        const INPUT = code`
            import { Base, Iface, Field, Param, Result, Bound, ClassBound, Unused } from "./types.js";

            /**
             * @template {ClassBound} C
             * @implements {Iface}
             */
            export class K extends Base {
                /** @type {Field} */
                field;

                /**
                 * @template {Bound} T
                 * @param {Param} p
                 * @returns {Result}
                 */
                m(p) {}
            }
        `;

        const OUTPUT = code`
            /**
             * @template {ClassBound} C
             * @implements {Iface}
             */
            export class K<C extends ClassBound> extends Base implements Iface {
                /** @type {Field} */
                field: Field;
                /**
                 * @template {Bound} T
                 * @param {Param} p
                 * @returns {Result}
                 */
                m<T extends Bound>(p: Param): Result;
            }
            import { Base, Iface, Field, Param, Result, Bound, ClassBound } from "./types.js";
        `;

        run(INPUT, OUTPUT);
    });

    test("should keep imports used only by generic defaults of classes and methods", () => {
        const INPUT = code`
            import { MethodDefault, ClassDefault, Unused } from "./types.js";

            /**
             * @template [C=ClassDefault]
             */
            export class K {
                /**
                 * @template [T=MethodDefault]
                 * @returns {void}
                 */
                m() {}

                undocumented() {}
            }

            export class Plain {}

            export function g() {}
        `;

        const OUTPUT = code`
            export function g(): any;
            /**
             * @template [C=ClassDefault]
             */
            export class K<C = ClassDefault> {
                /**
                 * @template [T=MethodDefault]
                 * @returns {void}
                 */
                m<T = MethodDefault>(): void;
                undocumented(): any;
            }
            export class Plain {
            }
            import { MethodDefault, ClassDefault } from "./types.js";
        `;

        run(INPUT, OUTPUT);
    });

    test("should keep imports used only by constants and typedefs", () => {
        const INPUT = code`
            import { ConstantType, AliasType, PropertyType, Unused } from "./types.js";

            /** @type {ConstantType} */
            export const c = 1;

            /** @typedef {AliasType} Alias */

            /**
             * @typedef {Object} Shape
             * @property {PropertyType} p
             */
        `;

        const OUTPUT = code`
            /** @type {ConstantType} */
            export const c: ConstantType;
            export type Alias = AliasType;
            export type Shape = {
                p: PropertyType;
            };
            import { ConstantType, AliasType, PropertyType } from "./types.js";
        `;

        run(INPUT, OUTPUT);
    });

    test("should convert @import tags into type-only imports", () => {
        const INPUT = code`
            /**
             * @import { Config, Other as O } from "./config.js"
             * @import * as ns from "./ns.js"
             * @import Def, { Named } from "./def.js"
             * @import Solo from "./solo.js"
             * @import {
             *   Multi,
             * } from './multi.js'
             * @import {} from "./empty.js"
             * @import { Unused } from "./unused.js"
             */

            /**
             * @param {Config} a
             * @param {O} b
             * @param {ns.Thing} c
             * @param {Def} d
             * @param {Named} e
             * @param {Solo} f
             * @param {Multi} g
             * @returns {void}
             */
            export function use(a, b, c, d, e, f, g) {}
        `;

        const OUTPUT = code`
            /**
             * @param {Config} a
             * @param {O} b
             * @param {ns.Thing} c
             * @param {Def} d
             * @param {Named} e
             * @param {Solo} f
             * @param {Multi} g
             * @returns {void}
             */
            export function use(a: Config, b: O, c: ns.Thing, d: Def, e: Named, f: Solo, g: Multi): void;
            import type { Config, Other as O } from "./config.js";
            import type * as ns from "./ns.js";
            import type Def from "./def.js";
            import type { Named } from "./def.js";
            import type Solo from "./solo.js";
            import type { Multi } from './multi.js';
        `;

        run(INPUT, OUTPUT);
    });

    test("should declare the declarations exported through an export list", () => {
        const INPUT = code`
            /**
             * @param {number} a
             * @returns {number}
             */
            function double(a) {}

            /** @type {string} */
            const VERSION = "1";

            class Local {}

            export { double, VERSION as version, Local };
        `;

        const OUTPUT = code`
            /** @type {string} */
            declare const VERSION: string;
            /**
             * @param {number} a
             * @returns {number}
             */
            declare function double(a: number): number;
            declare class Local {
            }
            export { double, VERSION as version, Local };
        `;

        run(INPUT, OUTPUT);
    });

    test("should declare a declaration exported as default by name", () => {
        const INPUT = code`
            /** @returns {void} */
            function greet() {}

            export default greet
        `;

        const OUTPUT = code`
            /** @returns {void} */
            declare function greet(): void;
            export default greet;
        `;

        run(INPUT, OUTPUT);
    });

    test("should remove @internal declarations from export lists", () => {
        const INPUT = code`
            /**
             * @internal
             * @returns {void}
             */
            function hidden() {}

            /** @internal */
            class HiddenClass {}

            /**
             * @internal
             * @type {number}
             */
            const hiddenConstant = 1;

            /** @returns {void} */
            function visible() {}

            export { hidden, visible };
            export { HiddenClass };
            export default hiddenConstant;
        `;

        const OUTPUT = code`
            /** @returns {void} */
            declare function visible(): void;
            export { visible };
        `;

        run(INPUT, OUTPUT);
    });

    test("should keep re-exports and empty export lists as they are", () => {
        const INPUT = code`
            export { a, b as c } from "./a.js";
            export * from "./all.js";
            export * as ns from "./ns.js";
            export {};
        `;

        const OUTPUT = code`
            export { a, b as c } from "./a.js";
            export * from "./all.js";
            export * as ns from "./ns.js";
            export {};
        `;

        run(INPUT, OUTPUT);
    });

    test("should recognize tags only by their whole name", () => {
        const INPUT = code`
            /** @internalThing */
            export function f() {}
        `;

        const OUTPUT = code`
            /** @internalThing */
            export function f(): any;
        `;

        run(INPUT, OUTPUT);
    });

    test("should keep empty lines in documentation comments", () => {
        const INPUT = code`
            /**
             * First.

             * Second.
             * @returns {void}
             */
            export function f() {}
        `;

        const OUTPUT = code`
            /**
             * First.

             * Second.
             * @returns {void}
             */
            export function f(): void;
        `;

        run(INPUT, OUTPUT);
    });

    test("should strip the leading asterisks from types spanning several lines", () => {
        const INPUT = code`
            /**
             * @param {{
             *   a: number,
             *   b: string
             * }} options
             * @returns {void}
             */
            export function f(options) {}
        `;

        const OUTPUT = code`
            /**
             * @param {{
             *   a: number,
             *   b: string
             * }} options
             * @returns {void}
             */
            export function f(options: {
              a: number,
              b: string
            }): void;
        `;

        run(INPUT, OUTPUT);
    });

    test("should keep asterisks inside types", () => {
        const INPUT = code`
            /** @type {"a*b"} */
            export const a = "a*b";
        `;

        const OUTPUT = code`
            /** @type {"a*b"} */
            export const a: "a*b";
        `;

        run(INPUT, OUTPUT);
    });

    test("should allow URLs in single-line documentation comments", () => {
        const INPUT = code`
            /** Docs at http://example.com @type {number} */
            export const n = 1;
        `;

        const OUTPUT = code`
            /** Docs at http://example.com @type {number} */
            export const n: number;
        `;

        run(INPUT, OUTPUT);
    });

    test("should ignore code inside comments, strings and template literals", () => {
        const INPUT = code`
            // export function commented() {}
            /* export function blockCommented() {} */
            const s = "export function inString() {}";
            const t = \`export function inTemplate() {} \${ { a: "}" }.a }\`;

            /** @returns {void} */
            export function real() {}
        `;

        const OUTPUT = code`
            /** @returns {void} */
            export function real(): void;
        `;

        run(INPUT, OUTPUT);
    });

    test("should ignore brackets inside regular expressions", () => {
        const INPUT = code`
            /** @returns {string} */
            export function strip(s) {
                return s.replace(/[{(]/g, "").replace(/[}]/, "") / 2;
            }

            export class Parser {
                /** @type {RegExp} */
                pattern = /\\)+/;

                test(s) {
                    this.last = /[}]/;
                    return a / b / c;
                }
            }
        `;

        const OUTPUT = code`
            /** @returns {string} */
            export function strip(s: any): string;
            export class Parser {
                /** @type {RegExp} */
                pattern: RegExp;
                last: any;
                test(s: any): any;
            }
        `;

        run(INPUT, OUTPUT);
    });

    test("should end an initializer at the end of its statement", () => {
        const INPUT = code`
            /** @type {number} */
            export const a = 1
            /** @type {boolean} */
            export const b = first &&
                second
            /** @type {number} */
            export let c = i++
            /** @type {string} */
            export const d = "d"; /** @type {number} */ export const e = 1
            export { a as alias }
        `;

        const OUTPUT = code`
            /** @type {number} */
            export const a: number;
            /** @type {boolean} */
            export const b: boolean;
            /** @type {number} */
            export let c: number;
            /** @type {string} */
            export const d: string;
            /** @type {number} */
            export const e: number;
            export { a as alias };
        `;

        run(INPUT, OUTPUT);
    });

    test("should end a field initializer at the end of its line", () => {
        const INPUT = code`
            export class K {
                /** @type {number} */
                sum = a +
                    b
                /** @type {number} */
                ternary = cond
                    ? 1
                    : 2
                /** @type {string} */
                name = "k"
            }
        `;

        const OUTPUT = code`
            export class K {
                /** @type {number} */
                sum: number;
                /** @type {number} */
                ternary: number;
                /** @type {string} */
                name: string;
            }
        `;

        run(INPUT, OUTPUT);
    });
});
