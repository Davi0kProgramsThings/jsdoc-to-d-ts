import fs from "fs";

import { ES2022, semanticsES2022 } from "./grammars/ES2022.js";

import type { DocComment, Tag } from "./grammars/JSDOC.js";

import type { File, Class, Method } from "./grammars/ES2022.js";

function trimChars(str: string, characters: string): string {
    const escaped = characters.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`^[${escaped}]+|[${escaped}]+$`, "g");
    return str.replace(regex, "");
}

function getParam(method: Method, id: string): Tag | undefined {
    return <Tag | undefined> method.doc?.tags
        .find(tag => typeof tag != "string" && tag.name == "@param" && (<Tag> tag).arguments[1] == id);
}

function getReturns(method: Method): Tag | undefined {
    return <Tag | undefined> method.doc?.tags
        .find(tag => typeof tag != "string" && tag.name == "@returns");
}

function transpileTypeDefinition(doc: DocComment): string {
    const typedef = <Tag> doc.tags
        .find(tag => typeof tag != "string" && tag.name == "@typedef")

    const id = typedef.arguments[1]

    const properties = <Tag[]> doc.tags
        .filter(tag => typeof tag != "string" && ["@prop", "@property"].includes(tag.name))

    if (properties.length > 0) {
        let output = `export type ${id} = {\n`;

        for (const property of properties) {
            output += `/*\n * ${trimChars(property.arguments[2], " -*\n")}\n */\n${property.arguments[1]}: ${property.arguments[0]};\n`
                .replace(/^(?!\s*$)/gm, "\t");
        }

        output += "};\n";

        return output;
    }

    const output = `export type ${id} = ${typedef.arguments[0]};\n`;

    return output;
}

function transpileClass(_class: Class): string {
    const raw = _class.doc?.raw

    const _export = !_class.export!.default ? "export" : "export default";

    const keyword = _class.doc?.tags.includes("@interface")
        ? "interface"
        : _class.doc?.tags.includes("@abstract")
            ? "abstract class"
            : "class";

    const methods = _class.methods
        .filter(method => !method.doc?.tags.includes("@internal") && !method.doc?.tags.includes("@private"))
        .map(method => transpileMethod(method).replace(/^(?!\s*$)/gm, "\t"))
        .join("\n");

    const output = `${_export} ${keyword} ${_class.id} {\n${methods}\n}`

    return raw ? `${raw}\n${output}` : output
}

function transpileMethod(method: Method): string {
    const raw = method.doc?.raw

    const params = method.arguments
        .map(argument => {
            const param = getParam(method, argument);

            return `${argument}: ${param ? param.arguments[0] : "any"}`;
        })
        .join(", ");

    const returns = getReturns(method);

    const output = `${method.id}(${params}): ${returns ? returns.arguments[0] : "any"};`

    return raw ? `${raw}\n${output}` : output
}

function main(input: string) {
    let output = "// This file has been automatically generated with jsdoc-to-d-ts\n";

    const content = fs.readFileSync(input, "utf-8");

    const match = ES2022.match(content, "File");

    const file = semanticsES2022(match);

    for (const name of <File> file.eval()) {
        switch (name.type) {
            case "doc-comment": {
                const doc = <DocComment> name;

                if (doc.tags.includes("@internal")) {
                    continue;
                }

                output += transpileTypeDefinition(doc);

                break;
            }

            case "class": {
                const _class = <Class> name;

                if (_class.doc?.tags.includes("@internal") || !_class.export) {
                    continue;
                }

                output += transpileClass(_class);

                break;
            }
        }
    }

    fs.writeFileSync(input.slice(0, input.length - 3) + ".d.ts", output);
}

const input = process.argv[2];

main(input);
