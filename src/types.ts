export type File = {
    importStatements: ImportStatement[];
    exportStatements: string[];
    constants: Constant[];
    types: Type[];
    classes: Class[];
};

export type ImportStatement = {
    wildcard?: boolean;
    default?: string;
    import: string[];
    from: string;
};

export type Constant = {
    id: string;
    type: string;
    keyword?: "var" | "let" | "const";
    documentation?: string;
    export: {
        default: boolean;
    };
};

export type Type = {
    id: string;
    type: string;
    properties: {
        id: string;
        type: string;
        optional: boolean;
        description?: string;
    }[];
};

export type Class = {
    id: string;
    keyword: "interface" | "abstract class" | "class";
    extends: string[];
    implements: string[];
    members: Member[];
    methods: Method[];
    documentation?: string;
    genericTypes?: {
        id: string;
        type?: string;
        default?: string;
    }[];
    export: {
        default: boolean;
    };
};

export type Member = {
    id: string;
    type: string;
    static: boolean;
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
    genericTypes?: {
        id: string;
        type?: string;
        default?: string;
    }[];
};

export type Argument = {
    id: string;
    type: string;
    optional: boolean;
};
