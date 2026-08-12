import fs from "fs";

import * as ohm from "ohm-js";

export type DocCommentDescriptor = {
    type: "doc-comment";
    raw: string;
    tags: TagDescriptor[];
};

export type TagDescriptor = {
    name: string;
    arguments: string[];
};

const file = fs.readFileSync("grammars/JSDOC.ohm", "utf-8");

export const JSDOC = ohm.grammar(file);

export const semanticsJSDOC = JSDOC.createSemantics().addOperation("eval", {
    DocComment(_, body, _2) {
        return {
            type: "doc-comment",
            raw: this.sourceString,
            tags: body.eval()
        };
    },

    Body(body) {
        return body.children
            .filter(child => child.ctorName == "Tag")
            .map(tag => tag.eval());
    },

    Tag(tag) {
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
    },

    EmptyListOf() {
        return [];
    },

    NonemptyListOf(zero, _, rest) {
        return [zero.eval(), ...rest.eval()];
    },

    _iter(...children) {
        if (this._node.isOptional()) {
            return children[0]?.eval();
        }

        return children.map(child => child.eval());
    }
});
