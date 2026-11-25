import fs from "fs";

import path from "path";

import * as ohm from "ohm-js";

import { JSDOC, semanticsJSDOC } from "./JSDOC.ts";

import type { DocCommentDescriptor, ImportTagDescriptor } from "./JSDOC.ts";

export type FileDescriptor = {
    importStatements: ImportStatementDescriptor[];
    exportStatements: ExportStatementDescriptor[];
    components: (ConstantDescriptor | FunctionDescriptor | ClassDescriptor | DocCommentDescriptor)[];
};

export type ImportStatementDescriptor = {
    type: "import";
    wildcard?: boolean;
    default?: string;
    import: SpecifierDescriptor[];
    from: string;
    typeOnly?: boolean;
};

export type ExportStatementDescriptor = {
    type: "export";
    raw: string;
    from?: string;
    default?: string;
    specifiers: SpecifierDescriptor[];
};

export type SpecifierDescriptor = {
    id: string;
    alias?: string;
};

export type ConstantDescriptor = {
    type: "constant";
    doc?: DocCommentDescriptor;
    export?: ExportDescriptor;
    keyword?: "var" | "let" | "const";
    id?: string;
    expr: string;
    properties?: PropertyDescriptor[];
    function?: FunctionExpressionDescriptor;
};

export type FunctionExpressionDescriptor = {
    async: boolean;
    arguments: ArgumentDescriptor[];
};

export type PropertyDescriptor = {
    doc?: DocCommentDescriptor;
    id: string;
    value: string;
};

export type FunctionDescriptor = {
    type: "function";
    docs: DocCommentDescriptor[];
    export?: ExportDescriptor;
    async: boolean;
    id?: string;
    arguments: ArgumentDescriptor[];
};

export type ClassDescriptor = {
    type: "class";
    doc?: DocCommentDescriptor;
    export?: ExportDescriptor;
    id?: string;
    extends?: string;
    members: MemberDescriptor[];
    methods: Omit<MethodDescriptor, "memberDefinitions">[];
};

export type MemberDescriptor = {
    doc?: DocCommentDescriptor;
    static: boolean;
    private: boolean;
    id: string;
    function?: FunctionExpressionDescriptor;
};

export type MethodDescriptor = {
    property?: "get" | "set";
    docs: DocCommentDescriptor[];
    static: boolean;
    async: boolean;
    private: boolean;
    id: string;
    arguments: ArgumentDescriptor[];
    memberDefinitions: MemberDescriptor[];
};

export type ArgumentDescriptor = {
    id: string;
    rest: boolean;
    optional: boolean;
};

export type ExportDescriptor = {
    default: boolean;
};

const PATH = path.join(import.meta.dirname, "../../grammars/ES2022.ohm");

const file = fs.readFileSync(PATH, "utf-8");

function splitComponent(component: FileDescriptor["components"][number]): FileDescriptor["components"] {
    if (component.type == "constant" || component.type == "class") {
        if (component.doc?.getTag("@typedef")) {
            const doc = component.doc;

            component.doc = undefined;

            return [doc, component];
        }
    }

    if (component.type == "function") {
        const docs = component.docs.filter((doc, index) => index == component.docs.length - 1
            ? !doc.getTag("@typedef")
            : !!doc.getTag("@overload"));

        const others = component.docs.filter(doc => !docs.includes(doc));

        component.docs = docs;

        return [...others, component];
    }

    return [component];
}

export const ES2022 = ohm.grammar(file, { JSDOC });

export const semanticsES2022 = ES2022.extendSemantics(semanticsJSDOC).extendOperation<any>("eval", {
    File(items) {
        const file: FileDescriptor = {
            importStatements: [],
            exportStatements: [],
            components: []
        };

        for (const item of items.children) {
            switch (item.ctorName) {
                case "ImportStatement":
                    file.importStatements.push(item.eval());
                    break;

                case "ExportStatement":
                    file.exportStatements.push(item.eval());
                    break;

                case "Component":
                    file.components.push(...splitComponent(item.eval()));
                    break;
            }
        }

        file.importStatements.push(...this.importTags().map(({ wildcard, default: _default, specifiers, from }: ImportTagDescriptor) => ({
            type: "import",
            wildcard,
            default: _default,
            import: specifiers,
            from,
            typeOnly: true
        })));

        return file;
    },

    ImportStatement_import(_, _import, _2, from) {
        return {
            type: "import",
            import: _import.eval(),
            from: from.eval()
        };
    },

    ImportStatement_importWithDefault(_, id, _2, _import, _4, from) {
        return {
            type: "import",
            default: id.eval(),
            import: _import.eval() ?? [],
            from: from.eval()
        };
    },

    ImportStatement_importWithWildcard(_, _1, _2, id, _4, from) {
        return {
            type: "import",
            wildcard: true,
            default: id.eval(),
            import: [],
            from: from.eval()
        };
    },

    NamedImports(_, specifiers, _2, _3) {
        return specifiers.eval();
    },

    ExportStatement_exportFrom(_, _1, _2, from) {
        return {
            type: "export",
            raw: this.sourceString,
            from: from.eval(),
            specifiers: []
        };
    },

    ExportStatement_exportFromWithWildcard(_, _1, _2, _3, _4, from) {
        return {
            type: "export",
            raw: this.sourceString,
            from: from.eval(),
            specifiers: []
        };
    },

    ExportStatement_export(_, specifiers) {
        return {
            type: "export",
            raw: this.sourceString,
            specifiers: specifiers.eval()
        };
    },

    ExportStatement_exportDefault(_, _1, id) {
        return {
            type: "export",
            raw: this.sourceString,
            default: id.eval(),
            specifiers: []
        };
    },

    NamedExports(_, specifiers, _2, _3) {
        return specifiers.eval();
    },

    Specifier(id, _1, alias) {
        return {
            id: id.eval(),
            alias: alias.eval()
        };
    },

    Constant_declaration(doc, _export, keyword, id, _4, initializer) {
        const { expr, properties, function: _function } = initializer.eval();

        return {
            type: "constant",
            doc: doc.eval(),
            export: _export.numChildren > 0 ? { default: false } : undefined,
            keyword: keyword.sourceString,
            id: id.eval(),
            expr,
            properties,
            function: _function
        };
    },

    Constant_exportDefault(doc, _1, _2, id, _4, initializer) {
        const { expr, properties, function: _function } = initializer.eval();

        return {
            type: "constant",
            doc: doc.eval(),
            export: { default: true },
            keyword: "const",
            id: id.eval(),
            expr,
            properties,
            function: _function
        };
    },

    Constant_exportDefaultExpression(doc, _1, _2, initializer) {
        const { expr, properties, function: _function } = initializer.eval();

        return {
            type: "constant",
            doc: doc.eval(),
            export: { default: true },
            keyword: "const",
            id: undefined,
            expr,
            properties,
            function: _function
        };
    },

    Function(docs, _export, _async, _3, id, _5, parameters, _7, _8) {
        return {
            type: "function",
            docs: docs.eval(),
            export: _export.eval(),
            async: _async.numChildren > 0,
            id: id.eval(),
            arguments: parameters.eval()
        };
    },

    Class(doc, _export, _2, id, _4, _extends, body) {
        const { members, methods } = body.eval();

        return {
            type: "class",
            doc: doc.eval(),
            export: _export.eval(),
            id: id.eval(),
            extends: _extends.eval(),
            members,
            methods
        };
    },

    ClassBody(_, elements, _2) {
        const members: MemberDescriptor[] = [];

        const methods: MethodDescriptor[] = [];

        const memberDefinitions: MemberDescriptor[] = [];

        for (const element of elements.children) {
            switch (element.ctorName) {
                case "Member":
                    members.push(element.eval());
                    break;

                case "Method":
                case "Get":
                case "Set":
                    methods.push(element.eval());
                    break;

                case "StaticBlock":
                    memberDefinitions.push(...element.eval());
                    break;
            }
        }

        for (const member of [...methods.flatMap(({ memberDefinitions }) => memberDefinitions), ...memberDefinitions]) {
            const index = members.findIndex(({ id, static: _static }) => id == member.id && _static == member.static);

            if (index < 0) {
                members.push(member);
            } else if (!members[index].doc && member.doc) {
                members[index] = member;
            }
        }

        return {
            members,
            methods: methods.map(({ memberDefinitions, ...method }) => method)
        };
    },

    Member(doc, _static, hashtag, id, _4, initializer) {
        return {
            doc: doc.eval(),
            static: _static.numChildren > 0,
            private: hashtag.numChildren > 0,
            id: id.eval(),
            function: initializer.eval()?.function
        };
    },

    Method(docs, _static, _async, hashtag, id, _5, parameters, _7, block) {
        return {
            docs: docs.eval(),
            static: _static.numChildren > 0,
            async: _async.numChildren > 0,
            private: hashtag.numChildren > 0,
            id: id.eval(),
            arguments: parameters.eval(),
            memberDefinitions: block.eval()
        };
    },

    Get(doc, _static, _2, hashtag, id, _5, _6, block) {
        return {
            property: "get",
            docs: doc.numChildren > 0 ? [doc.eval()] : [],
            static: _static.numChildren > 0,
            async: false,
            private: hashtag.numChildren > 0,
            id: id.eval(),
            arguments: [],
            memberDefinitions: block.eval()
        };
    },

    Set(doc, _static, _2, hashtag, id, _5, parameter, _7, block) {
        return {
            property: "set",
            docs: doc.numChildren > 0 ? [doc.eval()] : [],
            static: _static.numChildren > 0,
            async: false,
            private: hashtag.numChildren > 0,
            id: id.eval(),
            arguments: [{ ...parameter.eval(), optional: false }],
            memberDefinitions: block.eval()
        };
    },

    MethodBlock(_, body, _2) {
        const members: MemberDescriptor[] = [];

        for (const child of body.children) {
            switch (child.ctorName) {
                case "MemberDefinition":
                    members.push(child.eval());
                    break;

                case "MethodBlock":
                    members.push(...child.eval());
                    break;
            }
        }

        return members;
    },

    StaticBlock(_, block) {
        return block.eval().map((member: MemberDescriptor) => ({ ...member, static: true }));
    },

    MemberDefinition_function(doc, _1, _2, hashtag, id, _5, _function) {
        return {
            doc: doc.eval(),
            static: false,
            private: hashtag.numChildren > 0,
            id: id.eval(),
            function: _function.eval()
        };
    },

    MemberDefinition_value(doc, _1, _2, hashtag, id, _5) {
        return {
            doc: doc.eval(),
            static: false,
            private: hashtag.numChildren > 0,
            id: id.eval()
        };
    },

    Export(_, _default) {
        return {
            default: _default.numChildren > 0
        };
    },

    Parameters(parameters) {
        return parameters.eval();
    },

    Parameter_rest(_, target) {
        return {
            id: target.eval(),
            rest: true,
            optional: false
        };
    },

    Parameter_plain(target, _default, _2) {
        return {
            id: target.eval(),
            rest: false,
            optional: _default.numChildren > 0
        };
    },

    BindingPattern_object(_, properties, _2, _3) {
        return `{ ${properties.eval().join(", ")} }`;
    },

    BindingPattern_array(_, elements, _2, _3) {
        return `[ ${elements.eval().join(", ")} ]`;
    },

    ObjectBindingProperty_rest(_, id) {
        return `...${id.eval()}`;
    },

    ObjectBindingProperty_property(id, _1, target, _3, _4) {
        return target.numChildren > 0 ? `${id.eval()}: ${target.eval()}` : id.eval();
    },

    ArrayBindingElement_rest(_, target) {
        return `...${target.eval()}`;
    },

    ArrayBindingElement_element(target, _1, _2) {
        return target.eval();
    },

    Initializer_objectLiteral(object) {
        return {
            expr: this.sourceString,
            properties: object.eval()
        };
    },

    Initializer_functionExpression(_function) {
        return {
            expr: this.sourceString,
            function: _function.eval()
        };
    },

    FunctionExpression_function(_async, _1, _2, _3, parameters, _5, _6) {
        return {
            async: _async.numChildren > 0,
            arguments: parameters.eval()
        };
    },

    FunctionExpression_arrow(_async, parameters, _2, _3) {
        return {
            async: _async.numChildren > 0,
            arguments: parameters.eval()
        };
    },

    ArrowParameters_parenthesized(_, parameters, _2) {
        return parameters.eval();
    },

    ArrowParameters_single(id) {
        return [{
            id: id.eval(),
            rest: false,
            optional: false
        }];
    },

    Initializer_expression(_, _1) {
        return {
            expr: this.sourceString
        };
    },

    ObjectLiteral(_, properties, _2, _3) {
        return properties.eval();
    },

    Property(doc, id, _2, value) {
        return {
            doc: doc.eval(),
            id: id.sourceString,
            value: value.sourceString
        };
    },

    string(_, _1, _2) {
        return this.sourceString;
    },

    EmptyListOf() {
        return [];
    },

    NonemptyListOf(first, _, rest) {
        return [first.eval(), ...rest.eval()];
    }
}).addOperation<ImportTagDescriptor[]>("importTags", {
    docComment(_, _1, _2) {
        return this.eval().tags.flatMap(({ import: _import }: { import?: ImportTagDescriptor }) => _import ? [_import] : []);
    },

    _nonterminal(...children) {
        return children.flatMap(child => child.importTags());
    },

    _iter(...children) {
        return children.flatMap(child => child.importTags());
    },

    _terminal() {
        return [];
    }
});
