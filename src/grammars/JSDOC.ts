import fs from "fs";

import * as ohm from "ohm-js";

export type DocComment = {
    type: "doc-comment";
    raw: string;
    tags: (string | Tag)[];
};

export type Tag = {
    name: string;
    arguments: string[];
};

const file = fs.readFileSync("grammars/JSDOC.ohm", "utf-8");

function formatRaw(raw: string): string {
    return raw
        .split("\n")
        .map((line, index) => index == 0 ? line.trim() : ` ${line.trim()}`)
        .join("\n");
}

export const JSDOC = ohm.grammar(file);

export const semanticsJSDOC = JSDOC.createSemantics().addOperation("eval", {
    DocComment(_, body, _2) {
        return {
            type: "doc-comment",
            raw: formatRaw(this.sourceString),
            ...body.eval()
        };
    },

    Body(items) {
        return {
            tags: items.children
                .filter(item => item.ctorName == "Tag")
                .map(name => name.eval())
        };
    },

    Tag(tag) {
        if (tag.numChildren == 1) {
            return tag.sourceString
        }

        return {
            name: tag.child(0).sourceString,
            arguments: tag.children.slice(1).map(argument => argument.eval())
        };
    },

    TypeInBraces(_, type, _2) {
        return type.sourceString;
    },

    id(_, _1) {
        return this.sourceString;
    },

    description(_) {
        return this.sourceString;
    }
});
