import fs from "fs";

import path from "path";

import * as ohm from "ohm-js";

import { JSDOC, semanticsJSDOC } from "./JSDOC.ts";

import type { DocCommentDescriptor } from "./JSDOC.ts";

export type FileDescriptor = {
    importStatements: ImportStatementDescriptor[];
    exportStatements: string[];
    components: (ConstantDescriptor | FunctionDescriptor | ClassDescriptor | DocCommentDescriptor)[];
};

export type ImportStatementDescriptor = {
    type: "import";
    wildcard?: boolean;
    default?: string;
    import: string[];
    from: string;
};

export type ConstantDescriptor = {
    type: "constant";
    doc?: DocCommentDescriptor;
    export?: ExportDescriptor;
    keyword?: "var" | "let" | "const";
    id: string;
    expr: string;
};

export type FunctionDescriptor = {
    type: "function";
    docs: DocCommentDescriptor[];
    export?: ExportDescriptor;
    async: boolean;
    id: string;
    arguments: string[];
};

export type ClassDescriptor = {
    type: "class";
    doc?: DocCommentDescriptor;
    export?: ExportDescriptor;
    id: string;
    extends?: string;
    members: MemberDescriptor[];
    methods: Omit<MethodDescriptor, "memberDefinitions">[];
};

export type MemberDescriptor = {
    doc?: DocCommentDescriptor;
    static: boolean;
    private: boolean;
    id: string;
};

export type MethodDescriptor = {
    property?: "get" | "set";
    docs: DocCommentDescriptor[];
    static: boolean;
    async: boolean;
    private: boolean;
    id: string;
    arguments: string[];
    memberDefinitions: MemberDescriptor[];
};

export type ExportDescriptor = {
    default: boolean;
};

const PATH = path.join(import.meta.dirname, "../../grammars/ES2022.ohm");

const file = fs.readFileSync(PATH, "utf-8");

export const ES2022 = ohm.grammar(file, { JSDOC });

export const semanticsES2022 = ES2022.extendSemantics(semanticsJSDOC).extendOperation<any>("eval", {
    File({ children }) {
        const file: FileDescriptor = {
            importStatements: [],
            exportStatements: [],
            components: []
        };

        for (const child of children) {
            switch (child.ctorName) {
                case "ImportStatement":
                    file.importStatements.push(child.eval());
                    break;

                case "ExportStatement":
                    file.exportStatements.push(child.eval());
                    break;

                case "Component":
                    file.components.push(child.eval());
                    break;
            }
        }

        return file;
    },

    ImportStatement_import(_, _1, _import, _3, _4, from) {
        return {
            type: "import",
            import: _import.eval(),
            from: from.eval()
        };
    },

    ImportStatement_importWithDefault(_, id, _2, _3, _import, _5, _6, from) {
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

    ExportStatement(_, _1, _2, _3, _4, _5) {
        return this.sourceString;
    },

    Constant_export(doc, _export, keyword, id, _4, expr) {
        return {
            type: "constant",
            doc: doc.eval(),
            export: _export.numChildren > 0 ? { default: false } : undefined,
            keyword: keyword.sourceString,
            id: id.eval(),
            expr: expr.eval()
        };
    },

    Constant_exportDefault(doc, _1, _2, id, _4, expr) {
        return {
            type: "constant",
            doc: doc.eval(),
            export: { default: true },
            keyword: "const",
            id: id.eval(),
            expr: expr.sourceString
        };
    },

    Function(docs, _export, _async, _3, id, _5, _arguments, _7, _8) {
        return {
            type: "function",
            docs: docs.eval(),
            export: _export.eval(),
            async: _async.numChildren > 0,
            id: id.eval(),
            arguments: _arguments.eval()
        }
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
        }
    },

    ClassBody(_, body, _2) {
       const members = [];

       const methods = [];

        for (const child of body.children) {
            switch (child.ctorName) {
                case "Member":
                    members.push(child.eval());
                    break;

                case "Method":
                case "Get":
                case "Set":
                    methods.push(child.eval());
                    break;
            }
        }

        for (const method of methods) {
            for (const member of method.memberDefinitions) {
                const index = members.findIndex(({ id }) => id == member.id);

                if (!members[index] || (!members[index].doc && member.doc)) {
                    index >= 0
                        ? members[index] = member
                        : members.push(member);
                }
            }

            delete method.memberDefinitions;
        }

        return { members, methods };
    },

    Member(doc, _static, hashtag, id) {
        return {
            doc: doc.eval(),
            static: _static.numChildren > 0,
            private: hashtag.numChildren > 0,
            id: id.eval()
        };
    },

    Method(docs, _static, _async, hashtag, id, _5, _arguments, _7, block) {
        return {
            docs: docs.eval(),
            static: _static.numChildren > 0,
            async: _async.numChildren > 0,
            private: hashtag.numChildren > 0,
            id: id.eval(),
            arguments: _arguments.eval(),
            memberDefinitions: block.eval()
        };
    },

    Get(doc, _1, hashtag, id, _4, _5, block) {
        return {
            property: "get",
            docs: [doc.eval()],
            async: false,
            private: hashtag.numChildren > 0,
            id: id.eval(),
            arguments: [],
            memberDefinitions: block.eval()
        };
    },

    Set(doc, _1, hashtag, id, _4, argument, _6, block) {
        return {
            property: "set",
            docs: [doc.eval()],
            async: false,
            private: hashtag.numChildren > 0,
            id: id.eval(),
            arguments: [argument.eval()],
            memberDefinitions: block.eval()
        };
    },

    MethodBlock(_, body, _2) {
        const members = [];

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

    MemberDefinition(doc, _1, _2, hashtag, id, _5, _6) {
        return {
            doc: doc.eval(),
            private: hashtag.numChildren > 0,
            id: id.eval()
        };
    },

    Export(_, _default) {
        return {
            default: _default.numChildren > 0
        };
    },

    IdWithAlias(id, _1, alias) {
        if (alias.numChildren > 0) {
            return alias.eval();
        }

        return id.eval();
    },

    Argument(argument, _1, _2) {
        return argument.sourceString;
    },

    String(_, _1, _2) {
        return this.sourceString;
    },

    Expr(_) {
        return this.sourceString;
    }
});
