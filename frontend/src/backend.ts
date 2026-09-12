import { initClient, initContract } from "@ts-rest/core";
import z from "zod";

const c = initContract();

const User = z.object({
    id: z.string(),
    created_at: z.coerce.date(),
});

const LoginRequest = z.object({
    email: z.string(),
});

const Board = z.object({
    id: z.number(),
    name: z.string(),
    created_at: z.coerce.date(),
});

const CreateBoard = z.object({
    name: z.string(),
});

const UpdateBoard = z.object({
    name: z.string().optional(),
});

const Task = z.object({
    id: z.number(),
    title: z.string(),
    description: z.string(),
    created_at: z.coerce.date(),
    author: z.string(),
});

const CreateTask = z.object({
    board_id: z.number(),
    title: z.string(),
    description: z.string().optional(),
    author: z.string(),
});

const UpdateTask = z.object({
    title: z.string().optional(),
    description: z.string().optional(),
});

const Email = z.object({
    email: z.string(),
});

export const contract = c.router({
    login: {
        method: "POST",
        path: "/auth/login",
        body: LoginRequest,
        responses: {
            200: User,
            401: z.literal("WRONG_ACCOUNT"),
        },
    },
    logout: {
        method: "POST",
        path: "/auth/logout",
        body: z.void(),
        responses: {
            200: z.unknown(),
        },
    },
    me: {
        method: "GET",
        path: "/auth/me",
        responses: {
            200: User,
            401: z.unknown(),
        },
    },

    createBoard: {
        method: "POST",
        path: "/boards",
        body: CreateBoard,
        responses: {
            201: Board,
            401: z.unknown(),
            409: z.literal("NAME"),
        },
    },
    getBoards: {
        method: "GET",
        path: "/boards",
        query: z.object({
            name: z.string().optional(),
        }),
        responses: {
            200: z.array(Board),
            401: z.unknown(),
        },
    },
    getBoard: {
        method: "GET",
        path: "/boards/:id",
        pathParams: z.object({
            id: z.coerce.number(),
        }),
        responses: {
            200: Board,
            401: z.unknown(),
            404: z.unknown(),
        },
    },
    updateBoard: {
        method: "PATCH",
        path: "/boards/:id",
        pathParams: z.object({
            id: z.coerce.number(),
        }),
        body: UpdateBoard,
        responses: {
            200: Board,
            401: z.unknown(),
            409: z.literal("NAME"),
            404: z.unknown(),
        },
    },
    deleteBoard: {
        method: "DELETE",
        path: "/boards/:id",
        pathParams: z.object({
            id: z.coerce.number(),
        }),
        responses: {
            200: z.unknown(),
            401: z.unknown(),
            404: z.unknown(),
        },
    },

    createTask: {
        method: "POST",
        path: "/tasks",
        body: CreateTask,
        responses: {
            201: Task,
            401: z.unknown(),
            403: z.literal("AUTHOR"),
            404: z.unknown(),
            409: z.literal("TITLE"),
        },
    },
    getTask: {
        method: "GET",
        path: "/tasks/:id",
        pathParams: z.object({
            id: z.coerce.number(),
        }),
        responses: {
            200: Task,
            401: z.unknown(),
            404: z.unknown(),
        },
    },
    getTasks: {
        method: "GET",
        path: "/tasks",
        query: z.object({
            title: z.string().optional(),
            board: z.coerce.number().optional(),
        }),
        responses: {
            200: z.array(Task),
            401: z.unknown(),
        },
    },
    updateTask: {
        method: "PATCH",
        path: "/tasks/:id",
        pathParams: z.object({
            id: z.coerce.number(),
        }),
        body: UpdateTask,
        responses: {
            200: Task,
            401: z.unknown(),
            404: z.unknown(),
            409: z.literal("TITLE"),
        },
    },
    deleteTask: {
        method: "DELETE",
        path: "/tasks/:id",
        pathParams: z.object({
            id: z.coerce.number(),
        }),
        responses: {
            200: z.unknown(),
            401: z.unknown(),
            404: z.unknown(),
        },
    },

    createUser: {
        method: "POST",
        path: "/users",
        body: z.undefined(),
        responses: {
            201: User,
            401: z.unknown(),
        },
    },
    getUsers: {
        method: "GET",
        path: "/users",
        responses: {
            200: z.array(User),
            401: z.unknown(),
        },
    },
    getUser: {
        method: "GET",
        path: "/users/:id",
        pathParams: z.object({
            id: z.string(),
        }),
        responses: {
            200: User,
            401: z.unknown(),
            404: z.unknown(),
        },
    },
    deleteUser: {
        method: "DELETE",
        path: "/users/:id",
        pathParams: z.object({
            id: z.string(),
        }),
        responses: {
            200: z.unknown(),
            401: z.unknown(),
            404: z.unknown(),
        },
    },

    createEmail: {
        method: "POST",
        path: "/users/:id/emails",
        pathParams: z.object({
            id: z.string(),
        }),
        body: Email,
        responses: {
            201: Email,
            400: z.literal("EMAIL"),
            401: z.unknown(),
            404: z.unknown(),
            409: z.unknown(),
        },
    },
    getEmails: {
        method: "GET",
        path: "/users/:id/emails",
        pathParams: z.object({
            id: z.string(),
        }),
        responses: {
            200: z.array(Email),
            401: z.unknown(),
            404: z.unknown(),
        },
    },
    deleteEmail: {
        method: "DELETE",
        path: "/users/:id/emails/:email",
        pathParams: z.object({
            id: z.string(),
            email: z.string(),
        }),
        responses: {
            200: z.unknown(),
            401: z.unknown(),
            404: z.unknown(),
        },
    },
});

export const client = initClient(contract, {
    baseUrl: "http://localhost:8080",
    throwOnUnknownStatus: true,
    validateResponse: true,
    credentials: "include",
});
