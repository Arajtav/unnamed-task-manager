import { doIfNotNull, Replace } from "./ts";

export type BaseUser = {
    id: string;
    handle: string | null;
};

export type UserFromEmail = {
    email: string;
    user: BaseUser | null;
};

export type PreviewTask = {
    id: number;
    title: string;
    createdAt: Date;
    author: UserFromEmail;
    status: string;
    assignee?: UserFromEmail;
    archivedAt: Date | null;
    timeLogged: { time: number }[];
    // TODO: this goes stale, but I'd have to refetch all the tasks every time a block is added or removed otherwise. Requires a deeper refactor.
    isBlocked: boolean;
    labels: string[];
    priority: number;
};

export type PreviewTaskRaw = Replace<
    Replace<PreviewTask, "archivedAt", string | null>,
    "createdAt",
    string
>;

export function processPreviewTask(from: PreviewTaskRaw): PreviewTask {
    return {
        ...from,
        createdAt: new Date(from.createdAt),
        archivedAt: doIfNotNull(from.archivedAt, s => new Date(s)),
    };
}

export type UserWithEmails = BaseUser & { emails: string[] };

export type Access = {
    user: UserWithEmails;
    isModerator: boolean;
};

export type TaskStatus = {
    name: string;
    color: string;
    priority: number;
};

export type BaseBoard = {
    id: number;
    name: string;
};

export type FullBoard = BaseBoard & {
    tasks: PreviewTask[];
    access: Access[];
    taskStatus: TaskStatus[];
};

export type FullBoardRaw = Replace<FullBoard, "tasks", PreviewTaskRaw[]>;

export function processFullBoard(from: FullBoardRaw): FullBoard {
    return { ...from, tasks: from.tasks.map(t => processPreviewTask(t)) };
}

export type MinimalTask = {
    id: number;
    title: string;
    status: string;
    archivedAt: Date | null;
};

export type MinimalTaskRaw = Replace<MinimalTask, "archivedAt", string | null>;

export function processMinimalTask(from: MinimalTaskRaw): MinimalTask {
    return { ...from, archivedAt: doIfNotNull(from.archivedAt, s => new Date(s)) };
}

export type TimeLogged = {
    time: number;
    user: UserWithEmails | null;
};

export type CompleteTask = {
    id: number;
    title: string;
    description: string;
    createdAt: Date;
    author: UserFromEmail;
    status: string;
    assignee?: UserFromEmail;
    archivedAt: Date | null;
    timeLogged: TimeLogged[];
    blockedBy: MinimalTask[];
    labels: string[];
    priority: number;
};

export type CompleteTaskRaw = Replace<
    Replace<Replace<CompleteTask, "blockedBy", MinimalTaskRaw[]>, "archivedAt", string | null>,
    "createdAt",
    string
>;

export function processCompleteTask(from: CompleteTaskRaw): CompleteTask {
    return {
        ...from,
        createdAt: new Date(from.createdAt),
        archivedAt: doIfNotNull(from.archivedAt, s => new Date(s)),
        blockedBy: from.blockedBy.map(t => processMinimalTask(t)),
    };
}

export type TimeEntry = {
    id: number;
    startedAt: Date;
    finishedAt: Date;
    description: string;
};

export type TimeEntryRaw = Replace<Replace<TimeEntry, "startedAt", string>, "finishedAt", string>;

export function processTimeEntry(from: TimeEntryRaw): TimeEntry {
    return { ...from, startedAt: new Date(from.startedAt), finishedAt: new Date(from.finishedAt) };
}

export type FullUser = UserWithEmails & {
    isAdmin: boolean;
    isDisabled: boolean;
    createdAt: Date;
    invite: string | null;
};

export type FullUserRaw = Replace<FullUser, "createdAt", string>;

export function processFullUser(from: FullUserRaw): FullUser {
    return { ...from, createdAt: new Date(from.createdAt) };
}

export type Me = UserWithEmails & {
    isAdmin: boolean;
    invite: string | null;
};

export const PRIORITIES = [
    { value: 3, label: "Critical" },
    { value: 2, label: "Higher" },
    { value: 1, label: "High" },
    { value: 0, label: "Default" },
    { value: -1, label: "Low" },
    { value: -2, label: "Lower" },
    { value: -3, label: "Lowest" },
] as const;

export function priorityLabel(value: number) {
    return PRIORITIES.find(p => p.value == value)?.label ?? String(value);
}
