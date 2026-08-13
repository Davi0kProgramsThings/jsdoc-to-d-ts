import fs from "fs";

import Handlebars from "handlebars";

import { ES2022, semanticsES2022 } from "./grammars/ES2022.js";

import { preProcess } from "./pre-processor.js";

import type { File } from "./types.js";

Handlebars.registerHelper("eq", function(a: unknown, b: unknown): boolean {
    return a == b;
});

Handlebars.registerHelper("join", function(array: string[], separator: string): string {
    return array.join(separator);
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

const TEMPLATE = fs.readFileSync("templates/index.hbs", "utf-8");

function isEmpty({ exportStatements, constants, classes, types }: File): boolean {
    const components = exportStatements.length + constants.length + classes.length + types.length;

    return components == 0;
}

function main(input: string) {
    const content = fs.readFileSync(input, "utf-8");
    const match = ES2022.match(content, "File");
    const fileDescriptor = semanticsES2022(match);

    const file = preProcess(fileDescriptor.eval());

    if (!isEmpty(file)) {
        const template = Handlebars.compile(TEMPLATE, { noEscape: true });
        const output = template(file);

        fs.writeFileSync(input.slice(0, input.length - 3) + ".d.ts", output);
    }
}

class T<A extends string = "lol"> {

}

const input = process.argv[2];

main(input);
