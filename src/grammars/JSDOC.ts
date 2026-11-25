import fs from "fs";

import path from "path";

import * as ohm from "ohm-js";

export type DocCommentDescriptor = {
    type: "doc-comment";
    raw: string;
    tags: TagDescriptor[];
    getTag: (name: string) => TagDescriptor | undefined;
    getTags: (name: string | string[]) => TagDescriptor[];
};

export type TagDescriptor = {
    name: string;
    arguments: string[];
    import?: ImportTagDescriptor;
};

export type ImportTagDescriptor = {
    wildcard?: boolean;
    default?: string;
    specifiers: {
        id: string;
        alias?: string;
    }[];
    from: string;
};

const PATH = path.join(import.meta.dirname, "../../grammars/JSDOC.ohm");

const file = fs.readFileSync(PATH, "utf-8");

export const JSDOC = ohm.grammar(file);

export const semanticsJSDOC = JSDOC.createSemantics().addOperation("eval", {
    docComment(_, body, _2): DocCommentDescriptor {
        return {
            type: "doc-comment",
            raw: this.sourceString,
            tags: body.children
                .filter(child => child.ctorName == "tag")
                .flatMap(tag => tag.eval()),

            getTag(name) {
                return this.tags.find(tag => tag.name == name);
            },

            getTags(name) {
                return this.tags.filter(tag => typeof name == "string" ? tag.name == name : name.includes(tag.name));
            }
        };
    },

    modifierTag(_, name): TagDescriptor {
        return {
            name: "@" + name.sourceString,
            arguments: []
        };
    },

    typeTag(_, name, _2, type): TagDescriptor {
        return {
            name: "@" + name.sourceString,
            arguments: [type.eval()]
        };
    },

    enumTag(_, _1, type): TagDescriptor {
        return {
            name: "@enum",
            arguments: type.children.map(child => child.eval())
        };
    },

    extendsTag(_, name, _2, type): TagDescriptor {
        return {
            name: "@" + name.sourceString,
            arguments: [type.eval()]
        };
    },

    paramTag(_, _1, type, _3, name): TagDescriptor {
        return {
            name: "@param",
            arguments: [type.eval(), name.eval()]
        };
    },

    propertyTag(_, tagName, _2, type, _4, name, _6, description): TagDescriptor {
        return {
            name: "@" + tagName.sourceString,
            arguments: [type.eval(), name.eval(), description.eval()]
        };
    },

    typedefTag(_, _1, type, _3, name): TagDescriptor {
        return {
            name: "@typedef",
            arguments: [type.eval(), name.eval()]
        };
    },

    templateTag(_, _1, type, _3, first, _5, _6, _7, rest): TagDescriptor[] {
        return [first, ...rest.children].map((parameter, index) => {
            const [id, _default] = parameter.eval();

            return {
                name: "@template",
                arguments: [index == 0 ? type.eval() : undefined, id, _default]
            };
        });
    },

    templateParameter_withDefault(_, _1, id, _3, _4, _default, _6) {
        return [id.eval(), _default.sourceString.trim()];
    },

    templateParameter_withoutDefault(id) {
        return [id.eval(), undefined];
    },

    typeExpression(_, _1, _2) {
        return this.sourceString.slice(1, -1).replace(/\n[ \t]*\* ?/g, "\n").trim();
    },

    importTag(_, _1, clause, _3, _4, _5, from): TagDescriptor {
        return {
            name: "@import",
            arguments: [],
            import: {
                ...clause.eval(),
                from: from.sourceString
            }
        };
    },

    importClause_defaultAndNamed(id, _1, _2, _3, specifiers) {
        return {
            default: id.eval(),
            specifiers: specifiers.eval()
        };
    },

    importClause_namespace(_, _1, _2, _3, id) {
        return {
            wildcard: true,
            default: id.eval(),
            specifiers: []
        };
    },

    importClause_named(specifiers) {
        return {
            specifiers: specifiers.eval()
        };
    },

    importClause_default(id) {
        return {
            default: id.eval(),
            specifiers: []
        };
    },

    namedImports(_, _1, specifiers, _3, _4, _5, _6) {
        return specifiers.eval() ?? [];
    },

    importSpecifiers(first, _1, _2, _3, rest) {
        return [first.eval(), ...rest.children.map(specifier => specifier.eval())];
    },

    importSpecifier(id, _1, _2, _3, alias) {
        return {
            id: id.eval(),
            alias: alias.eval()
        };
    },

    parameterName_optional(_, _1, name, _3, _4, _5, _6) {
        return `[${name.sourceString}]`;
    },

    parameterName_required(name) {
        return name.sourceString;
    },

    typedefName(_, _1) {
        return this.sourceString;
    },

    typeReference(_, _1, _2, _3) {
        return this.sourceString;
    },

    description(_) {
        return this.sourceString;
    },

    id(_, _1) {
        return this.sourceString;
    },

    _iter(...children) {
        if (this._node.isOptional()) {
            return children[0]?.eval();
        }

        return children.map(child => child.eval());
    }
});
