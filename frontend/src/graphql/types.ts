export type GqlUser = {
    id: string;
    createdAt: string;
    isAdmin: boolean;
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
