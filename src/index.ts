import fs from "fs";

import path from "path";

import Handlebars from "handlebars";

import { ES2022, semanticsES2022 } from "./grammars/ES2022.ts";

import { preProcess } from "./pre-processor.ts";

Handlebars.registerHelper("eq", function(a: unknown, b: unknown): boolean {
    return a == b;
});

Handlebars.registerHelper("join", function(array: string[], separator: string): string {
    return array.join(separator);
});

Handlebars.registerHelper("replace", function(text: string, replace: string, _with: string): string {
    return text.replaceAll(replace, _with);
});

Handlebars.registerHelper("indent", function(text: string, tabs: number): string {
    const indentation = " ".repeat(4 * tabs)

    const [first, ...rest] = text.split("\n");

    const common = rest
        .filter(line => line.trim().length > 0)
        .reduce((min, line) => Math.min(min, line.length - line.trimStart().length), Infinity);

    const offset = Number.isFinite(common) ? common : 0;

    return [
        indentation + first.trimStart(),
        ...rest.map(line => line.trim().length > 0 ? indentation + " " + line.slice(offset) : "")
    ].join("\n");
});

const PATH = path.join(import.meta.dirname, "../templates/index.hbs");

const TEMPLATE = fs.readFileSync(PATH, "utf-8");

/**
 * Transpiles javascript code with jsdoc to typescript's type definitions.
 *
 * @param input - The javascript code to transpile.
 * @returns The corresponding .d.ts type definitions.
 */
export function transpile(input: string): string {
    const match = ES2022.match(input, "File");
    const fileDescriptor = semanticsES2022(match);
    const file = preProcess(fileDescriptor.eval());

    const template = Handlebars.compile(TEMPLATE, { noEscape: true });
    const output = template(file);

    return output;
}
