import { Client, cacheExchange, fetchExchange } from "@urql/core";
import { createSignal } from "solid-js";
import type { GqlBoard, GqlTask, GqlUser } from "./types";
import {
    ME_QUERY,
    MY_EMAILS_QUERY,
    USERS_QUERY,
    USER_QUERY,
    BOARDS_QUERY,
    BOARD_QUERY,
    CREATE_BOARD_MUTATION,
    TASKS_QUERY,
    TASK_QUERY,
    CREATE_TASK_MUTATION,
} from "./queries";

export const gqlClient = new Client({
    url: `${import.meta.env.VITE_BACKEND}/graphql`,
    exchanges: [cacheExchange, fetchExchange],
    preferGetMethod: false,
    fetchOptions: {
        credentials: "include",
    },
});

// Users

export function meQuery() {
    return gqlClient.query<{ me: GqlUser }>(ME_QUERY, {}).toPromise();
}

export function myEmailsQuery() {
    return gqlClient.query<{ me: { emails: { email: string }[] } }>(MY_EMAILS_QUERY, {}).toPromise();
}
export function usersQuery() {
    return gqlClient.query<{ users: GqlUser[] }>(USERS_QUERY, {}).toPromise();
}

export function userQuery(id: string) {
    return gqlClient.query<{ user: GqlUser | null }>(USER_QUERY, { id }).toPromise();
}

// Boards

export const [boardsRefreshTick, setBoardsRefreshTick] = createSignal(0);

export function boardsQuery(name?: string) {
    return gqlClient.query<{ boards: GqlBoard[] }>(BOARDS_QUERY, { name }).toPromise();
}

export function boardQuery(id: number) {
    return gqlClient.query<{ board: (GqlBoard & { tasks: GqlTask[] }) | null }>(BOARD_QUERY, { id }).toPromise();
}

export async function createBoard(name: string) {
    const result = await gqlClient.mutation<{ createBoard: GqlBoard }>(CREATE_BOARD_MUTATION, { name }).toPromise();

    if (!result.error) {
        setBoardsRefreshTick((v) => v + 1);
    }

    return result;
}

// Tasks

export function tasksQuery(title?: string) {
    return gqlClient.query<{ tasks: GqlTask[] }>(TASKS_QUERY, { title }).toPromise();
}

export function taskQuery(id: number) {
    return gqlClient.query<{ task: GqlTask | null }>(TASK_QUERY, { id }).toPromise();
}

export function createTask(boardId: number, title: string, author: string, description?: string) {
    return gqlClient
        .mutation<{ createTask: GqlTask }>(CREATE_TASK_MUTATION, { boardId, title, description, author })
        .toPromise();
}
