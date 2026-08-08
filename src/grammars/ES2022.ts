import fs from "fs";

import * as ohm from "ohm-js";

import { JSDOC, semanticsJSDOC } from "./JSDOC.js";

import type { DocComment } from "./JSDOC.js";

export type File = (DocComment | Class)[];

export type Class = {
    type: "class";
    doc?: DocComment;
    id: string;
    methods: Method[];
    export?: {
        default: boolean;
    };
};

export type Method = {
    doc?: DocComment;
    id: string;
    arguments: string[];
};

const file = fs.readFileSync("grammars/ES2022.ohm", "utf-8");

export const ES2022 = ohm.grammar(file, { JSDOC });

export const semanticsES2022 = ES2022.extendSemantics(semanticsJSDOC).extendOperation<any>("eval", {
    File(items) {
        return items.children
            .filter(item => ["Class", "DocComment"].includes(item.ctorName))
            .map(item => item.eval());
    },

    Class(doc, _export, _2, id, _4, body, _6) {
        return {
            type: "class",
            doc: doc.numChildren > 0 ? doc.child(0).eval() : undefined,
            export: _export.numChildren > 0 ? _export.child(0).eval() : undefined,
            id: id.eval(),
            methods: body.eval()
        };
    },

    Export(_, _default) {
        return {
            default: _default.numChildren > 0
        };
    },

    ClassBody(methods) {
        return methods.children.map(method => method.eval());
    },

    Method(doc, _1, id, _3, _arguments, _5, _6, _7, _8) {
        return {
            doc: doc.numChildren > 0 ? doc.child(0).eval() : undefined,
            id: id.eval(),
            arguments: _arguments.eval()
        };
    },

    ArgumentList(ids) {
        return ids.asIteration().children.map(id => id.sourceString);
    }
});
