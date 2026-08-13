import type { Class, Constant, File, Member, Method, Type } from "./types.js";

import type { DocCommentDescriptor } from "./grammars/JSDOC.js";

import type { ClassDescriptor, ConstantDescriptor, FileDescriptor, MemberDescriptor, MethodDescriptor } from "./grammars/ES2022.js";

function getKeyword(classDescriptor: ClassDescriptor): "class" | "abstract class" | "interface" {
    if (classDescriptor.doc?.getTag("@interface")) {
        return "interface";
    }

    if (classDescriptor.doc?.getTag("@abstract")) {
        return "abstract class";
    }

    return "class";
}

function getVisibilityModifier(docCommentDescriptor?: DocCommentDescriptor): "public" | "protected" | "private" {
    if (docCommentDescriptor?.getTag("@private")) {
        return "private";
    }

    if (docCommentDescriptor?.getTag("@protected")) {
        return "protected";
    }

    return "public";
}

function includesReferenceToName(file: Pick<File, "constants" | "classes" | "types">, name?: string): boolean {
    const pattern = /[A-Za-z_$][A-Za-z0-9_$]*/g;

    if (!name) {
        return false;
    }

    for (const constant of file.constants) {
        if (constant.type.match(pattern)?.includes(name)) {
            return true;
        }
    }

    for (const _class of file.classes) {
        if (_class.extends.includes(name) || _class.implements.includes(name)) {
            return true;
        }

        for (const member of _class.members) {
            if (member.type.match(pattern)?.includes(name)) {
                return true;
            }
        }

        for (const method of _class.methods) {
            for (const argument of method.arguments) {
                if (argument.type.match(pattern)?.includes(name)) {
                    return true;
                }
            }

            if (method.returns?.match(pattern)?.includes(name)) {
                return true;
            }
        }
    }

    for (const _type of file.types) {
        if (_type.type.match(pattern)?.includes(name)) {
            return true;
        }

        for (const property of _type.properties) {
            if (property.type.match(pattern)?.includes(name)) {
                return true;
            }
        }
    }

    return false;
}

function preProcessConstant(constantDescriptor: ConstantDescriptor): Constant {
    return {
        id: constantDescriptor.id,
        type: constantDescriptor.doc?.getTag("@type")?.arguments[0] ?? "any",
        keyword: constantDescriptor.keyword,
        documentation: constantDescriptor.doc?.raw,
        export: {
            default: constantDescriptor.export!.default
        }
    };
}

function preProcessClass(classDescriptor: ClassDescriptor): Class {
    const docCommentDescriptor = classDescriptor.doc;

    const _extends = new Set(
        docCommentDescriptor
            ? docCommentDescriptor.getTags("@extends").map(({ arguments: [id] }) => id)
            : []
    );

    const _implements = new Set(
        docCommentDescriptor
            ? docCommentDescriptor.getTags("@implements").map(({ arguments: [id] }) => id)
            : []
    );

    const members = classDescriptor.members
        .filter(memberDescriptor => !memberDescriptor.doc?.getTag("@private") && !memberDescriptor.private)
        .map(memberDescriptor => preProcessClassMember(memberDescriptor));

    const methods = [];

    for (const methodDecriptor of classDescriptor.methods) {
        if (methodDecriptor.private) {
            continue;
        }

        for (const [index, docCommentDescriptor] of methodDecriptor.docs.entries()) {
            if (docCommentDescriptor.getTag("@private") || index == methodDecriptor.docs.length - 1) {
                continue;
            }

            if (docCommentDescriptor.getTag("@overload")) {
                methods.push(preProcessClassMethod(docCommentDescriptor, methodDecriptor));
            }
        }

        methods.push(preProcessClassMethod(methodDecriptor.docs[methodDecriptor.docs.length - 1], methodDecriptor));
    }

    return {
        id: classDescriptor.id,
        keyword: getKeyword(classDescriptor),
        extends: [ ...!classDescriptor.extends ? _extends : _extends.add(classDescriptor.extends)],
        implements: [..._implements],
        members,
        methods,
        documentation: classDescriptor.doc?.raw,
        genericTypes: classDescriptor.doc?.getTags("@template").map(({ arguments: [_type, id, _default] }) => ({
            id,
            type: _type,
            default: _default
        })),
        export: {
            default: classDescriptor.export!.default
        }
    }
}

function preProcessClassMember(memberDescriptor: MemberDescriptor): Member {
    return {
        id: memberDescriptor.id,
        type: memberDescriptor.doc?.getTag("@type")?.arguments[0] ?? "any",
        static: memberDescriptor.static,
        visibility: getVisibilityModifier(memberDescriptor.doc),
        documentation: memberDescriptor.doc?.raw
    };
}

function preProcessClassMethod(docCommentDescriptor: DocCommentDescriptor | undefined, methodDescriptor: Omit<MethodDescriptor, "docs" | "memberDefinitions">): Method {
    const _arguments = methodDescriptor.arguments.map((argument, index) => {
        const param = docCommentDescriptor?.getTags("@param")[index]

        const isOptional = param?.arguments[1].startsWith("[") && param?.arguments[1].endsWith("]");

        return {
            id: argument,
            type: param?.arguments[0] ?? "any",
            optional: !!isOptional
        };
    });

    const _returns =  methodDescriptor.id == "constructor" || methodDescriptor.property == "set"
        ? undefined
        : methodDescriptor.property == "get"
            ? docCommentDescriptor?.getTag("@type")?.arguments[0] ?? "any"
            : docCommentDescriptor?.getTag("@returns")?.arguments[0] ?? "any";

    return {
        id: methodDescriptor.id,
        static: methodDescriptor.static,
        visibility: getVisibilityModifier(docCommentDescriptor),
        abstract: !!docCommentDescriptor?.getTag("@abstract"),
        arguments: _arguments,
        returns: _returns,
        property: methodDescriptor.property,
        documentation: docCommentDescriptor?.raw,
        genericTypes: docCommentDescriptor?.getTags("@template").map(({ arguments: [_type, id, _default] }) => ({
            id,
            type: _type,
            default: _default
        }))
    };
}

function preProcessType(docCommentDescriptor: DocCommentDescriptor): Type {
    const typedef = docCommentDescriptor.getTag("@typedef");

    return {
        id: typedef!.arguments[1],
        type: typedef!.arguments[0],
        documentation: docCommentDescriptor.raw,
        properties: docCommentDescriptor.getTags("@property").map(({ arguments: [_type, id] }) => {
            const isOptional = id.startsWith("[") && id.endsWith("]");

            return {
                id: !isOptional ? id : id.slice(1, id.length - 1),
                type: _type,
                optional: isOptional
            }
        })
    };
}

export function preProcess(fileDescriptor: FileDescriptor): File {
    const file: Pick<File, "constants" | "classes" | "types"> = {
        constants: [],
        classes: [],
        types: []
    };

    for (const component of fileDescriptor.components) {
        switch (component.type) {
            case "constant":
                if (!component.export || component.doc?.getTag("@internal")) {
                    continue;
                }

                file.constants.push(preProcessConstant(component));

                break;

            case "class":
                if (!component.export || component.doc?.getTag("@internal")) {
                    continue;
                }

                file.classes.push(preProcessClass(component));

                break;

            case "doc-comment":
                if (!component.getTag("@typedef") || component.getTag("@internal")) {
                    continue;
                }

                file.types.push(preProcessType(component));

                break;
        }
    }

    return {
        ...file,
        importStatements: fileDescriptor.importStatements
            .map(importStatementDescriptor => ({
                wildcard: importStatementDescriptor.wildcard,
                default: includesReferenceToName(file, importStatementDescriptor.default) ? importStatementDescriptor.default : undefined,
                import: importStatementDescriptor.import.filter(name => includesReferenceToName(file, name)),
                from: importStatementDescriptor.from
            }))
            .filter(importStatement => importStatement.default || importStatement.import.length > 0),
        exportStatements: fileDescriptor.exportStatements
    }
}
