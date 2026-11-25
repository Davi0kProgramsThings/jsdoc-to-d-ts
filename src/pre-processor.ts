import type { Argument, Class, Constant, Enum, File, Function, FunctionType, GenericType, Member, Method, Type } from "./types.ts";

import type { DocCommentDescriptor, TagDescriptor } from "./grammars/JSDOC.ts";

import type { ArgumentDescriptor, ClassDescriptor, ConstantDescriptor, FunctionExpressionDescriptor, FileDescriptor, FunctionDescriptor, MemberDescriptor, MethodDescriptor } from "./grammars/ES2022.ts";

type Property = {
    id: string;
    type: string;
    optional: boolean;
    description?: string;
    properties: Property[];
};

function getDescription(description?: string): string | undefined {
    const content = description?.replace(/^[ *\n-]+|[ *\n-]+$/g, "");

    return content ? "/**\n * " + content.replace(/\n\s*\*/g, "\n *") + "\n */" : undefined;
}

function getProperties(tags: TagDescriptor[]): Property[] {
    const properties: Property[] = [];

    for (const { arguments: [type, name, description] } of tags) {
        const optional = name.startsWith("[") && name.endsWith("]");

        const path = (optional ? name.slice(1, -1) : name)
            .split(".")
            .map(segment => segment.replace(/\[\]$/, ""));

        const siblings = path
            .slice(0, -1)
            .reduce<Property[] | undefined>((siblings, segment) => siblings?.find(({ id }) => id == segment)?.properties, properties);

        siblings?.push({
            id: path[path.length - 1],
            type,
            optional,
            description,
            properties: []
        });
    }

    return properties;
}

function getObjectTypeSuffix(type: string): string | undefined {
    if (/^Array\.?<\s*(Object|object)\s*>$/.test(type)) {
        return "[]";
    }

    return /^(?:Object|object)((?:\[\])*)$/.exec(type)?.[1];
}

function getType(property: Property, documented: boolean): string {
    const suffix = getObjectTypeSuffix(property.type);

    if (property.properties.length == 0 || suffix === undefined) {
        return property.type;
    }

    const lines = property.properties.flatMap(child => {
        const description = documented ? getDescription(child.description) : undefined;

        const declaration = `${child.id}${child.optional ? "?" : ""}: ${getType(child, documented)};`;

        return [...description?.split("\n") ?? [], ...declaration.split("\n")];
    });

    return ["{", ...lines.map(line => "    " + line), "}"].join("\n") + suffix;
}

function requiresParentheses(type: string): boolean {
    let depth = 0;

    for (const character of type) {
        if ("([{<".includes(character)) {
            depth++;
        } else if (")]}>".includes(character)) {
            depth--;
        } else if (depth == 0 && /[\s|&?:=]/.test(character)) {
            return true;
        }
    }

    return false;
}

function getVariadicType(type: string): string {
    const element = type.slice(3).trim();

    if (element == "*") {
        return "any[]";
    }

    return (requiresParentheses(element) ? `(${element})` : element) + "[]";
}

function getArgument(property: Property, rest: boolean, optional: boolean): Argument {
    const type = getType(property, false);

    return {
        id: property.id,
        type: type.startsWith("...") ? getVariadicType(type) : type,
        optional: (property.optional || optional) && !rest,
        rest
    };
}

function getArguments(docCommentDescriptor: DocCommentDescriptor | undefined, argumentDescriptors: ArgumentDescriptor[]): Argument[] {
    const properties = getProperties(docCommentDescriptor?.getTags("@param") ?? []);

    if (docCommentDescriptor?.getTag("@overload")) {
        return properties.map(property => getArgument(property, property.type.startsWith("..."), false));
    }

    const names = new Set(argumentDescriptors.map(({ id }) => id));

    return argumentDescriptors.map(({ id, rest, optional }, index) => {
        const isBindingPattern = id.startsWith("{") || id.startsWith("[");

        const property = isBindingPattern
            ? properties[index] && !names.has(properties[index].id) ? properties[index] : undefined
            : properties.find(property => property.id == id);

        if (!property) {
            return {
                id,
                type: rest ? "any[]" : "any",
                optional,
                rest
            };
        }

        return getArgument(property, rest, optional);
    });
}

function getGenericTypes(docCommentDescriptor?: DocCommentDescriptor): GenericType[] | undefined {
    return docCommentDescriptor?.getTags("@template").map(({ arguments: [_type, id, _default] }) => ({
        id,
        type: _type,
        default: _default
    }));
}

function getReturns(docCommentDescriptor?: DocCommentDescriptor): string {
    return docCommentDescriptor?.getTags(["@returns", "@return"])[0]?.arguments[0] ?? "any";
}

function getSignatures(docCommentDescriptors: DocCommentDescriptor[]): DocCommentDescriptor[] {
    const overloads = docCommentDescriptors.filter(docCommentDescriptor => docCommentDescriptor.getTag("@overload"));

    return overloads.length > 0 ? overloads : docCommentDescriptors;
}

function getDefaultName(fileDescriptor: FileDescriptor): string {
    const names = new Set([
        ...fileDescriptor.components.map(component => component.type == "doc-comment"
            ? component.getTag("@typedef")?.arguments[1].split("<")[0]
            : component.id),
        ...fileDescriptor.importStatements.flatMap(({ default: _default, import: specifiers }) => [
            _default,
            ...specifiers.map(({ id, alias }) => alias ?? id)
        ])
    ]);

    let name = "_default";

    for (let index = 1; names.has(name); index++) {
        name = `_default_${index}`;
    }

    return name;
}

function getFunctionType(docCommentDescriptor: DocCommentDescriptor | undefined, functionExpressionDescriptor?: FunctionExpressionDescriptor): FunctionType | undefined {
    if (!functionExpressionDescriptor || docCommentDescriptor?.getTag("@type")) {
        return undefined;
    }

    return {
        arguments: getArguments(docCommentDescriptor, functionExpressionDescriptor.arguments),
        returns: getReturns(docCommentDescriptor),
        genericTypes: getGenericTypes(docCommentDescriptor)
    };
}

function getKeyword(classDescriptor: ClassDescriptor): "class" | "abstract class" | "interface" {
    if (classDescriptor.doc?.getTag("@interface")) {
        return "interface";
    }

    if (classDescriptor.doc?.getTag("@abstract")) {
        return "abstract class";
    }

    return "class";
}

function getExtends(classDescriptor: ClassDescriptor): string[] {
    if (!classDescriptor.extends) {
        return [];
    }

    const type = classDescriptor.doc?.getTags(["@extends", "@augments"])[0]?.arguments[0];

    if (type && type.split("<")[0].trim() == classDescriptor.extends) {
        return [type];
    }

    return [classDescriptor.extends];
}

function getVisibilityModifier(docCommentDescriptor?: DocCommentDescriptor): "public" | "protected" {
    if (docCommentDescriptor?.getTag("@protected")) {
        return "protected";
    }

    return "public";
}

function includesReferenceToName(file: Omit<File, "importStatements">, name?: string): boolean {
    const pattern = /[A-Za-z_$][A-Za-z0-9_$]*/g;

    if (!name) {
        return false;
    }

    for (const exportStatement of file.exportStatements) {
        if (exportStatement.default == name || exportStatement.specifiers.some(({ id }) => id == name)) {
            return true;
        }
    }

    for (const constant of file.constants) {
        if (constant.type.match(pattern)?.includes(name)) {
            return true;
        }
    }

    for (const _function of file.functions) {
        for (const argument of _function.arguments) {
            if (argument.type.match(pattern)?.includes(name)) {
                return true;
            }
        }

        if (_function.returns.match(pattern)?.includes(name)) {
            return true;
        }

        for (const genericType of _function.genericTypes ?? []) {
            if (genericType.type?.match(pattern)?.includes(name) || genericType.default?.match(pattern)?.includes(name)) {
                return true;
            }
        }
    }

    for (const _class of file.classes) {
        for (const type of [..._class.extends, ..._class.implements]) {
            if (type.match(pattern)?.includes(name)) {
                return true;
            }
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

            for (const genericType of method.genericTypes ?? []) {
                if (genericType.type?.match(pattern)?.includes(name) || genericType.default?.match(pattern)?.includes(name)) {
                    return true;
                }
            }
        }

        for (const genericType of _class.genericTypes ?? []) {
            if (genericType.type?.match(pattern)?.includes(name) || genericType.default?.match(pattern)?.includes(name)) {
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

function preProcessEnum(constantDescriptor: ConstantDescriptor & { id: string }): Enum {
    return {
        id: constantDescriptor.id,
        members: constantDescriptor.properties!.map(({ doc, id, value }) => ({
            id,
            value,
            documentation: doc?.raw
        })),
        documentation: constantDescriptor.doc?.raw,
        export: constantDescriptor.export
    };
}

function preProcessConstant(constantDescriptor: ConstantDescriptor & { id: string }): Constant {
    return {
        id: constantDescriptor.id,
        type: constantDescriptor.doc?.getTag("@type")?.arguments[0] ?? "any",
        function: getFunctionType(constantDescriptor.doc, constantDescriptor.function),
        keyword: constantDescriptor.keyword,
        documentation: constantDescriptor.doc?.raw,
        export: constantDescriptor.export
    };
}

function preProcessFunction(docCommentDescriptor: DocCommentDescriptor | undefined, functionDescriptor: FunctionDescriptor): Function {
    const _arguments = getArguments(docCommentDescriptor, functionDescriptor.arguments);

    const _returns = getReturns(docCommentDescriptor);

    return {
        id: functionDescriptor.id,
        arguments: _arguments,
        returns: _returns,
        documentation: docCommentDescriptor?.raw,
        genericTypes: getGenericTypes(docCommentDescriptor),
        export: functionDescriptor.export
    };
}

function preProcessClass(classDescriptor: ClassDescriptor): Class {
    const docCommentDescriptor = classDescriptor.doc;

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

        if (methodDecriptor.docs.length == 0) {
            methods.push(preProcessClassMethod(undefined, methodDecriptor));
        }

        for (const docCommentDescriptor of getSignatures(methodDecriptor.docs)) {
            if (docCommentDescriptor.getTag("@private")) {
                continue;
            }

            methods.push(preProcessClassMethod(docCommentDescriptor, methodDecriptor));
        }
    }

    return {
        id: classDescriptor.id,
        keyword: getKeyword(classDescriptor),
        extends: getExtends(classDescriptor),
        implements: [..._implements],
        members,
        methods,
        documentation: classDescriptor.doc?.raw,
        genericTypes: getGenericTypes(classDescriptor.doc),
        export: classDescriptor.export
    }
}

function preProcessClassMember(memberDescriptor: MemberDescriptor): Member {
    return {
        id: memberDescriptor.id,
        type: memberDescriptor.doc?.getTag("@type")?.arguments[0] ?? "any",
        function: getFunctionType(memberDescriptor.doc, memberDescriptor.function),
        static: memberDescriptor.static,
        readonly: !!memberDescriptor.doc?.getTag("@readonly"),
        visibility: getVisibilityModifier(memberDescriptor.doc),
        documentation: memberDescriptor.doc?.raw
    };
}

function preProcessClassMethod(docCommentDescriptor: DocCommentDescriptor | undefined, methodDescriptor: Omit<MethodDescriptor, "docs" | "memberDefinitions">): Method {
    const _arguments = getArguments(docCommentDescriptor, methodDescriptor.arguments);

    const _returns =  methodDescriptor.id == "constructor" || methodDescriptor.property == "set"
        ? undefined
        : methodDescriptor.property == "get"
            ? docCommentDescriptor?.getTag("@type")?.arguments[0] ?? "any"
            : getReturns(docCommentDescriptor);

    return {
        id: methodDescriptor.id,
        static: methodDescriptor.static,
        visibility: getVisibilityModifier(docCommentDescriptor),
        abstract: !!docCommentDescriptor?.getTag("@abstract"),
        arguments: _arguments,
        returns: _returns,
        property: methodDescriptor.property,
        documentation: docCommentDescriptor?.raw,
        genericTypes: getGenericTypes(docCommentDescriptor)
    };
}

function preProcessType(docCommentDescriptor: DocCommentDescriptor): Type {
    const typedef = docCommentDescriptor.getTag("@typedef");

    return {
        id: typedef!.arguments[1],
        type: typedef!.arguments[0],
        genericTypes: typedef!.arguments[1].includes("<") ? undefined : getGenericTypes(docCommentDescriptor),
        properties: getProperties(docCommentDescriptor.getTags(["@prop", "@property"])).map(property => ({
            id: property.id,
            type: getType(property, true),
            optional: property.optional,
            description: getDescription(property.description)
        }))
    };
}

export function preProcess(fileDescriptor: FileDescriptor): File {
    const exportedNames = new Set<string | undefined>(fileDescriptor.exportStatements
        .filter(({ from }) => !from)
        .flatMap(({ default: _default, specifiers }) => _default ? [_default] : specifiers.map(({ id }) => id)));

    const internalNames = new Set<string | undefined>();

    const file: Omit<File, "importStatements"> = {
        exportStatements: [],
        enums: [],
        constants: [],
        functions: [],
        classes: [],
        types: []
    };

    const defaultName = getDefaultName(fileDescriptor);

    for (const component of fileDescriptor.components) {
        switch (component.type) {
            case "constant":
                if (!component.export && !exportedNames.has(component.id)) {
                    continue;
                }

                if (component.doc?.getTag("@internal")) {
                    internalNames.add(component.id);

                    continue;
                }

                const constant = { ...component, id: component.id ?? defaultName };

                constant.doc?.getTag("@enum") && constant.properties
                    ? file.enums.push(preProcessEnum(constant))
                    : file.constants.push(preProcessConstant(constant));

                break;

            case "function":
                if (!component.export && !exportedNames.has(component.id)) {
                    continue;
                }

                const signatures = getSignatures(component.docs);

                if (signatures.length > 0 && signatures.every(docCommentDescriptor => docCommentDescriptor.getTag("@internal"))) {
                    internalNames.add(component.id);

                    continue;
                }

                if (signatures.length == 0) {
                    file.functions.push(preProcessFunction(undefined, component));
                }

                for (const docCommentDescriptor of signatures) {
                    if (docCommentDescriptor.getTag("@internal")) {
                        continue;
                    }

                    file.functions.push(preProcessFunction(docCommentDescriptor, component));
                }

                break;

            case "class":
                if (!component.export && !exportedNames.has(component.id)) {
                    continue;
                }

                if (component.doc?.getTag("@internal")) {
                    internalNames.add(component.id);

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

    file.exportStatements = fileDescriptor.exportStatements.flatMap(({ raw, from, default: _default, specifiers }) => {
        if (from) {
            return [{ raw, specifiers: [] }];
        }

        if (_default) {
            return internalNames.has(_default) ? [] : [{ default: _default, specifiers: [] }];
        }

        const visibleSpecifiers = specifiers.filter(({ id }) => !internalNames.has(id));

        return specifiers.length > 0 && visibleSpecifiers.length == 0 ? [] : [{ specifiers: visibleSpecifiers }];
    });

    return {
        ...file,
        importStatements: fileDescriptor.importStatements
            .map(importStatementDescriptor => ({
                wildcard: importStatementDescriptor.wildcard,
                default: includesReferenceToName(file, importStatementDescriptor.default) ? importStatementDescriptor.default : undefined,
                import: importStatementDescriptor.import.filter(({ id, alias }) => includesReferenceToName(file, alias ?? id)),
                from: importStatementDescriptor.from,
                typeOnly: importStatementDescriptor.typeOnly
            }))
            .filter(importStatement => importStatement.default || importStatement.import.length > 0)
            .flatMap(importStatement => importStatement.typeOnly && importStatement.default && importStatement.import.length > 0
                ? [{ ...importStatement, import: [] }, { ...importStatement, default: undefined }]
                : [importStatement])
    }
}
