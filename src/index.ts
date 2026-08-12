import fs from "fs";

import Handlebars from "handlebars";

import { ES2022, semanticsES2022 } from "./grammars/ES2022.js";

import type { File } from "./types.js";

import type { FileDescriptor } from "./grammars/ES2022.js";

Handlebars.registerHelper("eq", function(a: unknown, b: unknown): boolean {
    return a == b;
});

Handlebars.registerHelper("join", function(array: string[], separator: string): string {
    return array.join(separator);
});

const TEMPLATE = fs.readFileSync("templates/index.hbs", "utf-8");

function preProcessor(fileDescriptor: FileDescriptor): File {

}

function main(input: string) {
    const content = fs.readFileSync(input, "utf-8");
    const match = ES2022.match(content, "File");
    const fileDescriptor = semanticsES2022(match);

    const file = preProcessor(fileDescriptor.eval())

    const template = Handlebars.compile(TEMPLATE, { noEscape: true });
    const output = template(file);

    fs.writeFileSync(input.slice(0, input.length - 3) + ".d.ts", output);
}

const input = process.argv[2];

main(input);
