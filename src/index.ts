import fs from "fs";

import { ES2022, semanticsES2022 } from "./grammars/ES2022.js";

import type { Tag } from "./grammars/JSDOC.js";

import type { File, Class, Method } from "./grammars/ES2022.js";

function formatRaw(raw: string): string {
    return raw
        .split("\n")
        .map((line, index) => index === 0 ? line.trim() : ` ${line.trim()}`)
        .join("\n");
}

function getParam(method: Method, id: string): Tag | undefined {
    return <Tag | undefined> method.doc?.tags
        .find(tag => tag.at == "@param" && (<Tag> tag).arguments[1] == id);
}

function getReturns(method: Method): Tag | undefined {
    return <Tag | undefined> method.doc?.tags
        .find(tag => tag.at == "@returns");
}

function transpileClass(_class: Class): string {
    let output = ""

    if (_class.doc) {
        output += `${formatRaw(_class.doc.raw)}\n`
    }

    output += !_class.export!.default ? "export " : "export default ";

    if (_class.doc?.tags.includes("@interface")) {
        output += "interface ";
    }
    else if (_class.doc?.tags.includes("@abstract")) {
        output += "abstract class ";
    }
    else {
        output += "class ";
    }

    output += `${_class.id} {\n`;

    for (const method of _class.methods) {
        if (method.doc?.tags.includes("@internal")) {
            continue;
        }

        output += transpileMethod(method)
            .replace(/^(?!\s*$)/gm, "\t");
    }

    output += "}";

    return output;
}

function transpileMethod(method: Method): string {
    let output = ""

    if (method.doc) {
        output += `${formatRaw(method.doc.raw)}\n`;
    }

    output += `${method.id}(`;

    for (const [index, argument] of method.arguments.entries()) {
        const param = getParam(method, argument);

        output += `${argument}: ${param ? param.arguments[0] : "any"}`;

        if (index < method.arguments.length - 1) {
            output += ", ";
        }
    }

    const returns = getReturns(method);

    output += `): ${returns ? returns.arguments[0] : "any"};\n`;

    return output;
}

function main(input: string) {
    let output = "// This file has been automatically generated with jsdoc-to-d-ts\n";

    const content = fs.readFileSync(input, "utf-8");

    const match = ES2022.match(content, "File");

    const file = semanticsES2022(match);

    for (const _class of <File> file.eval()) {
        if (_class.doc?.tags.includes("@internal") || !_class.export) {
            continue;
        }

        output += transpileClass(_class)
    }

    fs.writeFileSync(input.slice(0, input.length - 3) + ".d.ts", output);
}

const input = process.argv[2];

main(input);
