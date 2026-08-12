export type File = {
    constants: Constant[];
    types: Type[];
    classes: Class[];
}

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
    description?: string;
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
    export: {
        default: boolean;
    };
};

export type Member = {
    id: string;
    type: string;
    visibility: "public" | "protected" | "private";
    documentation?: string;
};

export type Method = {
    id: string;
    visibility: "public" | "protected" | "private";
    abstract: boolean;
    arguments: Argument[];
    returns: string;
    documentation?: string;
};

export type Argument = {
    id: string;
    type: string;
    optional: boolean;
};
