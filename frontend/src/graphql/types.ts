export type GqlMe = {
    id: string;
    createdAt: string;
    isAdmin: boolean;
    emails: GqlEmail[];
    handle: string | null;
};

export type GqlUser = {
    id: string;
    createdAt: string;
    isAdmin: boolean;
};

export type GqlEmail = {
    email: string;
};

export type GqlBoard = {
    id: number;
    name: string;
    createdAt: string;
};

export type GqlTask = {
    id: number;
    title: string;
    description: string;
    createdAt: string;
    author: string;
};
