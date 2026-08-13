import fs from "fs";

import path from "path";

import * as ohm from "ohm-js";

export type DocCommentDescriptor = {
    type: "doc-comment";
    raw: string;
    tags: TagDescriptor[];
    getTag: (name: string) => TagDescriptor | undefined;
    getTags: (name: string) => TagDescriptor[];
};

export type TagDescriptor = {
    name: string;
    arguments: string[];
};

const PATH = path.join(import.meta.dirname, "../../grammars/JSDOC.ohm");

const file = fs.readFileSync(PATH, "utf-8");

export const JSDOC = ohm.grammar(file);

export const semanticsJSDOC = JSDOC.createSemantics().addOperation("eval", {
    DocComment(_, body, _2): DocCommentDescriptor {
        return {
            type: "doc-comment",
            raw: this.sourceString,
            tags: body.eval(),

            getTag(name) {
                return this.tags.find(tag => tag.name == name);
            },

            getTags(name) {
                return this.tags.filter(tag => tag.name == name);
            }
        };
    },

    Body(body) {
        return body.children
            .filter(child => child.ctorName == "Tag")
            .map(tag => tag.eval());
    },

    Tag(tag) {
        if (tag.ctorName == "Template") {
            return tag.eval();
        }

        return {
            name: tag.child(0).sourceString,
            arguments: tag.children.slice(1).map(argument => argument.eval())
        };
    },

    Template_template(_, _type, id) {
        return {
            name: "@template",
            arguments: [_type.eval(), id.eval(), undefined]
        };
    },

    Template_templateWithDefault(_, _type, _2, id, _4, _default, _6) {
        return {
            name: "@template",
            arguments: [_type.eval(), id.eval(), _default.sourceString]
        };
    },

    TypeInBraces(_, type, _2) {
        return type.sourceString.replaceAll("*", " ");
    },

    id(_, _1) {
        return this.sourceString;
    },

    optionalId(_, _1, _2) {
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
