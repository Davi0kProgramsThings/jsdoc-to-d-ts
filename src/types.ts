export type File = {
    importStatements: ImportStatement[];
    exportStatements: ExportStatement[];
    enums: Enum[];
    constants: Constant[];
    functions: Function[];
    types: Type[];
    classes: Class[];
};

export type ImportStatement = {
    wildcard?: boolean;
    default?: string;
    import: {
        id: string;
        alias?: string;
    }[];
    from: string;
    typeOnly?: boolean;
};

export type ExportStatement = {
    raw?: string;
    default?: string;
    specifiers: {
        id: string;
        alias?: string;
    }[];
};

export type Enum = {
    id: string;
    members: {
        id: string;
        value: string;
        documentation?: string;
    }[];
    documentation?: string;
    export?: {
        default: boolean;
    };
};

export type Constant = {
    id: string;
    type: string;
    function?: FunctionType;
    keyword?: "var" | "let" | "const";
    documentation?: string;
    export?: {
        default: boolean;
    };
};

export type Function = {
    id?: string;
    arguments: Argument[];
    returns: string;
    documentation?: string;
    genericTypes?: GenericType[];
    export?: {
        default: boolean;
    };
};

export type Type = {
    id: string;
    type: string;
    genericTypes?: GenericType[];
    properties: {
        id: string;
        type: string;
        optional: boolean;
        description?: string;
    }[];
};

export type Class = {
    id?: string;
    keyword: "interface" | "abstract class" | "class";
    extends: string[];
    implements: string[];
    members: Member[];
    methods: Method[];
    documentation?: string;
    genericTypes?: GenericType[];
    export?: {
        default: boolean;
    };
};

export type Member = {
    id: string;
    type: string;
    function?: FunctionType;
    static: boolean;
    readonly: boolean;
    visibility: "public" | "protected" | "private";
    documentation?: string;
};

export type Method = {
    id: string;
    static: boolean;
    visibility: "public" | "protected" | "private";
    abstract: boolean;
    arguments: Argument[];
    returns?: string;
    property?: "get" | "set",
    documentation?: string;
    genericTypes?: GenericType[];
};

export type Argument = {
    id: string;
    type: string;
    optional: boolean;
    rest: boolean;
};

export type GenericType = {
    id: string;
    type?: string;
    default?: string;
};

export type FunctionType = {
    arguments: Argument[];
    returns: string;
    genericTypes?: GenericType[];
};
