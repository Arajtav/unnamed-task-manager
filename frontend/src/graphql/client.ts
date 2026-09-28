import { Client, cacheExchange, fetchExchange } from "@urql/core";
import { createSignal } from "solid-js";
import type { GqlAccess, GqlBoard, GqlFullBoard, GqlEmail, GqlMe, GqlTask, GqlUser } from "./types";
import {
    ME_QUERY,
    USERS_QUERY,
    USER_QUERY,
    BOARDS_QUERY,
    BOARD_QUERY,
    CREATE_BOARD_MUTATION,
    TASKS_QUERY,
    TASK_QUERY,
    CREATE_TASK_MUTATION,
    ADD_USER_EMAIL,
    DELETE_USER_EMAIL,
    SET_USER_HANDLE,
    ADD_ACCESS_MUTATION,
    REMOVE_ACCESS_MUTATION,
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
    return gqlClient.query<{ me: GqlMe }>(ME_QUERY, {}).toPromise();
}

export function usersQuery() {
    return gqlClient.query<{ users: GqlUser[] }>(USERS_QUERY, {}).toPromise();
}

export function userQuery(id: string) {
    return gqlClient.query<{ user: GqlUser | null }>(USER_QUERY, { id }).toPromise();
}

export function setUserHandle(userId: string, handle: string | null) {
    return gqlClient
        .mutation<{ setUserHandle: GqlMe }>(SET_USER_HANDLE, {
            userId,
            handle,
        })
        .toPromise();
}

// Boards

export const [boardsRefreshTick, setBoardsRefreshTick] = createSignal(0);

export function boardsQuery(name?: string) {
    return gqlClient.query<{ boards: GqlBoard[] }>(BOARDS_QUERY, { name }).toPromise();
}

export function boardQuery(id: number) {
    return gqlClient.query<{ board: GqlFullBoard | null }>(BOARD_QUERY, { id }).toPromise();
}

export function addAccess(boardId: number, userId: string, isModerator: boolean) {
    return gqlClient
        .mutation<{ addAccess: GqlAccess }>(ADD_ACCESS_MUTATION, { boardId, userId, isModerator })
        .toPromise();
}

export function removeAccess(boardId: number, userId: string) {
    return gqlClient
        .mutation<{ removeAccess: boolean }>(REMOVE_ACCESS_MUTATION, { boardId, userId })
        .toPromise();
}

export async function createBoard(name: string) {
    const result = await gqlClient
        .mutation<{ createBoard: GqlBoard }>(CREATE_BOARD_MUTATION, { name })
        .toPromise();

    if (!result.error) {
        setBoardsRefreshTick(v => v + 1);
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
        .mutation<{ createTask: GqlTask }>(CREATE_TASK_MUTATION, {
            boardId,
            title,
            description,
            author,
        })
        .toPromise();
}

// Emails

export function addUserEmail(userId: string, email: string) {
    return gqlClient
        .mutation<{ addUserEmail: GqlEmail }>(ADD_USER_EMAIL, { userId, email })
        .toPromise();
}

export function deleteUserEmail(userId: string, email: string) {
    return gqlClient
        .mutation<{ deleteUserEmail: boolean }>(DELETE_USER_EMAIL, { userId, email })
        .toPromise();
}
