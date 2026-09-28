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
    emails: GqlEmail[];
};

export type GqlEmail = {
    email: string;
};

export type GqlFullBoard = GqlBoard & { tasks: GqlTask[]; access: GqlAccess[] };

export type GqlBoard = {
    id: number;
    name: string;
    createdAt: string;
};

export type GqlAccess = {
    userId: string;
    isModerator: boolean;
};

export type GqlTask = {
    id: number;
    title: string;
    description: string;
    createdAt: string;
    author: string;
};
