import fs from "fs";

import * as ohm from "ohm-js";

export type DocComment = {
    raw: string;
    tags: (string | Tag)[];
};

export type Tag = {
    at: string;
    arguments: string[];
};

const TAGS_TO_IGNORE = [
    "@link"
];

const file = fs.readFileSync("grammars/JSDOC.ohm", "utf-8");

export const JSDOC = ohm.grammar(file);

export const semanticsJSDOC = JSDOC.createSemantics().addOperation("eval", {
    DocComment(_, body, _2) {
        return { raw: this.sourceString, ...body.eval() };
    },

    Body(items) {
        return {
            tags: items.children
                .filter(item => item.ctorName == "Tag")
                .map(at => at.eval())
                .filter(({ tag }) => !TAGS_TO_IGNORE.includes(tag))
        };
    },

    Tag(tag) {
        if (tag.numChildren == 1) {
            return tag.sourceString
        }

        return {
            at: tag.child(0).sourceString,
            arguments: tag.children.slice(1).map(argument => argument.eval())
        };
    },

    TypeInBraces(_, _type, _2) {
        return _type.sourceString;
    },

    id(_, _1) {
        return this.sourceString;
    }
});
