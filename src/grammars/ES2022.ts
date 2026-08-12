import fs from "fs";

import * as ohm from "ohm-js";

import { JSDOC, semanticsJSDOC } from "./JSDOC.js";

import type { DocCommentDescriptor } from "./JSDOC.js";

export type FileDescriptor = (ConstantDescriptor | ClassDescriptor | DocCommentDescriptor)[];

export type ConstantDescriptor = {
    type: "constant";
    doc?: DocCommentDescriptor;
    export?: ExportDescriptor;
    keyword?: "var" | "let" | "const";
    id: string;
};

export type ClassDescriptor = {
    type: "class";
    doc?: DocCommentDescriptor;
    export?: ExportDescriptor;
    id: string;
    extends: string[];
    members: MemberDescriptor[];
    methods: Omit<MethodDescriptor, "members">[];
};

export type MemberDescriptor = {
    doc?: DocCommentDescriptor;
    private: boolean;
    id: string;
};

export type MethodDescriptor = {
    doc?: DocCommentDescriptor;
    async: boolean;
    id: string;
    arguments: string[];
    members: MemberDescriptor[];
};

export type ExportDescriptor = {
    default: boolean;
};

const file = fs.readFileSync("grammars/ES2022.ohm", "utf-8");

export const ES2022 = ohm.grammar(file, { JSDOC });

export const semanticsES2022 = ES2022.extendSemantics(semanticsJSDOC).extendOperation<any>("eval", {
    File(file) {
        return file.children
            .filter(child => child.ctorName == "Component")
            .map(child => child.eval());
    },

    Constant_export(doc, _export, keyword, id) {
        return {
            type: "constant",
            doc: doc.eval(),
            export: _export.numChildren > 0 ? { default: false } : undefined,
            keyword: keyword.sourceString,
            id: id.eval()
        };
    },

    Constant_export_default(doc, _1, _2, id) {
        return {
            type: "constant",
            doc: doc.eval(),
            export: { default: true },
            keyword: "const",
            id: id.eval()
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
                    methods.push(child.eval());
                    break;
            }
        }

        for (const method of methods) {
            for (const member of members) {
                const index = members.findIndex(({ id }) => id == member.id);

                if (!members[index] || (!members[index].doc && member.doc)) {
                    index >= 0
                        ? members[index] = member
                        : members.push(member);
                }
            }

            delete method.members;
        }

        return { members, methods };
    },

    Member(doc, hashtag, id, _3) {
        return {
            doc: doc.eval(),
            private: hashtag.numChildren > 0,
            id: id.eval()
        };
    },

    Method(doc, _async, id, _3, _arguments, _5, block) {
        return {
            doc: doc.eval(),
            async: _async.numChildren > 0,
            id: id.eval(),
            arguments: _arguments.eval(),
            members: block.eval()
        };
    },

    Block(_, body, _2) {
        const members = [];

        for (const child of body.children) {
            switch (child.ctorName) {
                case "MemberDefinition":
                    members.push(child.eval());
                    break;

                case "Block":
                    members.push(...child.eval());
                    break;
            }
        }

        return members;
    },

    MemberDefinition(doc, _1, _2, hashtag, id, _5) {
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
    }
});
