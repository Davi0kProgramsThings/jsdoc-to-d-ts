import fs from "fs";

import { ES2022, semanticsES2022 } from "./grammars/ES2022.js";

import type { Tag } from "./grammars/JSDOC.js";

import type { File, Class, Method } from "./grammars/ES2022.js";

function getParam(method: Method, id: string): Tag | undefined {
    return <Tag | undefined> method.doc?.tags
        .find(tag => tag.at == "@param" && (<Tag> tag).arguments[1] == id);
}

function getReturns(method: Method): Tag | undefined {
    return <Tag | undefined> method.doc?.tags
        .find(tag => tag.at == "@returns");
}

function transpileClass(_class: Class): string {
    const _export = !_class.export!.default ? "export" : "export default";

    const keyword = _class.doc?.tags.includes("@interface")
        ? "interface"
        : _class.doc?.tags.includes("@abstract")
            ? "abstract class"
            : "class";

    const methods = _class.methods
        .filter(method => !method.doc?.tags.includes("@internal"))
        .map(method => transpileMethod(method).replace(/^(?!\s*$)/gm, "\t"))
        .join("\n");

    const raw = _class.doc?.raw

    const output = `${_export} ${keyword} ${_class.id} {\n${methods}\n}`

    return raw ? `${raw}\n${output}` : output
}

function transpileMethod(method: Method): string {
    const params = method.arguments
        .map(argument => {
            const param = getParam(method, argument);
            return `${argument}: ${param ? param.arguments[0] : "any"}`;
        })
        .join(", ");

    const returns = getReturns(method);

    const raw = method.doc?.raw

    const output = `${method.id}(${params}): ${returns ? returns.arguments[0] : "any"};`

    return raw ? `${raw}\n${output}` : output
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
