jsdoc-to-d-ts
=============

[![npm](https://img.shields.io/npm/v/jsdoc-to-d-ts)](https://www.npmjs.com/package/jsdoc-to-d-ts)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

`jsdoc-to-d-ts` is a lightweight transpiler that converts **JavaScript** with **JSDoc** into **TypeScript** declaration files (`.d.ts`).

It reads your project's `tsconfig.json` just like `tsc`, so it can replace it in any project that already generates its types from JSDoc. Unlike `tsc`, it emits real `enum`s, `abstract` classes and `interface`s, and drops every `@internal` declaration.

* [Installation](#installation)
* [Usage](#usage)
* [Transpile a single file](#transpile-a-single-file)
* [Transpile an entire project](#transpile-an-entire-project)
* [Validate the output with tsc](#validate-the-output-with-tsc)
* [API](#api)
* [Example](#example)
* [License](#license)

Installation
------------

```console
npm install --save-dev jsdoc-to-d-ts
```

Usage
-----

```console
Usage: jsdoc-to-d-ts [options] [file]

lightweight transpiler to convert javascript with jsdoc to typescript's .d.ts
files

Arguments:
  file                    transpile a single file

Options:
  -v, --version           output the version number
  -p, --project [config]  the path of the tsconfig.json file of the project to
                          transpile
  -h, --help              display help for command
```

Transpile a single file
-----------------------

The quickest way to try the tool is to pass it the path of a JavaScript file:

```console
npx jsdoc-to-d-ts src/wallet.js
```

The declarations are written next to the source file, in `src/wallet.d.ts` (or in a `.d.mts` file for `.mjs` sources).

Transpile an entire project
---------------------------

Run the tool with no arguments to transpile a whole project:

```console
npx jsdoc-to-d-ts
```

It looks for a `tsconfig.json` in the current directory or in its parents, and reads `include`, `exclude`, `rootDir` and `outDir` from it, like `tsc` does:

```json
{
    "include": ["src/**/*.js"],
    "compilerOptions": {
        "rootDir": "./src",
        "outDir": "./types"
    }
}
```

Every `.js` and `.mjs` file matched by `include` is transpiled into `outDir`. Without `outDir`, each declaration file is written next to its source.

To use a different configuration file, pass its path (or the path of its folder) with `-p`:

```console
npx jsdoc-to-d-ts -p tsconfig.build.json
```

In a project that already builds its types with `tsc`, replacing the command is usually enough:

```json
{
    "scripts": {
        "build:types": "jsdoc-to-d-ts"
    }
}
```

Validate the output with tsc
----------------------------

`jsdoc-to-d-ts` only transpiles: it doesn't check that the generated declarations are valid. Keep `typescript` as a development dependency and use it to validate the output, without emitting anything.

Create a `tsconfig.check.json` that includes the generated files:

```json
{
    "include": ["types/**/*.d.ts", "types/**/*.d.mts"],
    "compilerOptions": {
        "module": "nodenext",
        "strict": true,
        "noEmit": true,
        "skipLibCheck": false,
        "types": ["node"]
    }
}
```

Then run it right after the transpilation:

```json
{
    "scripts": {
        "build:types": "jsdoc-to-d-ts && npm run check:types",
        "check:types": "tsc -p tsconfig.check.json"
    }
}
```

`skipLibCheck` must stay `false`, otherwise `tsc` skips every `.d.ts` file, including the generated ones. List in `types` the `@types` packages your declarations rely on: since TypeScript 6 they are no longer included by default.

API
---

The transpiler can also be used programmatically:

```js
import { transpile } from "jsdoc-to-d-ts";

const declarations = transpile(source);
```

`transpile` takes the JavaScript source code as a string and returns the content of the corresponding `.d.ts` file. It doesn't read or write any file.

Example
-------

Given the following JavaScript file:

```js
/** @enum {string} */
export const Network = {
    MAINNET: "mainnet",
    TESTNET: "testnet"
};

/** @abstract */
export default class Wallet {
    /**
     * @param {string} seed - The seed phrase.
     * @param {Object} [options]
     * @param {Network} [options.network]
     */
    constructor(seed, options = {}) {
        /** @protected @type {string} */
        this._seed = seed;
    }

    /**
     * @abstract
     * @returns {Promise<bigint>}
     */
    async getBalance() {}
}
```

`jsdoc-to-d-ts` generates:

```ts
// This file has been automatically generated with jsdoc-to-d-ts
/** @enum {string} */
export enum Network {
    MAINNET = "mainnet",
    TESTNET = "testnet"
}
/** @abstract */
export default abstract class Wallet {
    /** @protected @type {string} */
    protected _seed: string;
    /**
     * @param {string} seed - The seed phrase.
     * @param {Object} [options]
     * @param {Network} [options.network]
     */
    constructor(seed: string, options?: {
        network?: Network;
    });
    /**
     * @abstract
     * @returns {Promise<bigint>}
     */
    abstract getBalance(): Promise<bigint>;
}
```

License
-------

This project is released under the **MIT License**:

```
MIT License

Copyright (c) 2026 Davide Casale

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
