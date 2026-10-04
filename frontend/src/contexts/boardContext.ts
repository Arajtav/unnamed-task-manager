import { createContext, useContext } from "solid-js";
import { createStore } from "solid-js/store";

export type Task = {
    id: number;
    title: string;
    createdAt: Date;
    author: UserFromEmail;
    status: string;
    assignee?: UserFromEmail;
    isArchived: boolean;
};

export type Access = {
    user: User & { emails: string[] };
    isModerator: boolean;
};

export type TaskStatus = {
    name: string;
    color: string;
    priority: number;
};

export type FullBoard = {
    id: number;
    name: string;
    tasks: Task[];
    access: Access[];
    taskStatus: TaskStatus[];
};

export type User = {
    id: string;
    handle?: string;
};

export type UserFromEmail = {
    email: string;
    user?: User;
};

export type BoardStore = ReturnType<typeof createStore<FullBoard>>;

export const BoardContext = createContext<BoardStore>();

export function useBoard() {
    const context = useContext(BoardContext);

    if (!context) {
        throw new Error("useBoard must be used inside BoardLayout");
    }

    return context;
}
