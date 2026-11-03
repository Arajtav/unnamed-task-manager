import { priorityLabel, type Invite } from "../gqlTypes";

export const dict = {
    title: "TITLE",
    // DO NOT USE THIS PLEASE.
    genericError: "GENERIC ERROR",
    permissions: {
        admin: "PERMISSION ADMIN",
        moderator: "PERMISSION MODERATOR",
    },
    boardMembers: {
        title: "BOARD MEMBERS",
        // Actually this like cannot ever render?
        empty: "BOARD MEMBERS EMPTY",
        kick: "KICK",
        removeModerator: "REMOVE MODERATOR",
        makeModerator: "MAKE MODERATOR",
        searchNoResults: "SEARCH NO RESULTS",
    },
    boardNavbar: {
        search: "SEARCH",
    },
    emailAddresses: {
        title: "EMAIL ADDRESSES",
        noEmails: "NO EMAILS",
        adding: "ADDING",
        emailPlaceholder: "EMAIL PLACEHOLDER",
        add: "ADD",
    },
    yourHandle: {
        title: "YOUR HANDLE",
        invalid: "INVALID HANDLE",
        saving: "SAVING",
        save: "SAVE",
    },
    taskStatuses: {
        title: "TASK STATUSES",
        noStatuses: "NO TASK STATUSES",
        adding: "ADDING",
        add: "ADD",
        newStatusPlaceholder: "NEW STATUS PLACEHOLDER",
    },
    users: {
        title: "USERS",
        createAccount: "CREATE ACCOUNT",
        table: {
            invite: "INVITE",
            user: "USER",
            emails: "EMAILS",
            badges: "BADGES",
            createdAt: "CREATED AT",
        },
        invite: (invite: Invite) => {
            switch (invite.type) {
                case "present":
                    return `INVITE PRESENT ${invite.invite}`;
                case "not-present":
                    return "INVITE NOT PRESENT";
                case "forbidden":
                    return "INVITE FORBIDDEN";
            }
        },
        user: (handle: string | null) => (handle === null ? "HANDLE MISSING" : `HANDLE ${handle}`),
        copyId: "COPY ID",
        setHandle: "SET HANDLE",
        generateInvite: "GENERATE INVITE",
        removeInvite: "REMOVE INVITE",
        disable: "DISABLE",
        reenable: "REENABLE",
    },
    settings: {
        title: "SETTINGS",
        tabs: {
            account: {
                title: "ACCOUNT",
            },
        },
        language: {
            label: "Language",
        },
    },
    login: {
        title: "LOGIN",
        loginWithAPasskey: "LOGIN WITH A PASSKEY",
        // TODO: that's one string, it should not be split.
        or: "OR",
        join: "JOIN",
    },
    join: {
        title: "JOIN",
        inviteCode: "INVITE CODE",
        invitePlaceholder: "INVITE PLACEHOLDER",
        displayName: "DISPLAY NAME",
        displayNamePlaceholder: "DISPLAY NAME PLACEHOLDER",
        createAPasskey: "CREATE A PASSKEY",
        // TODO: that's one string, it should not be split.
        or: "OR",
        login: "LOGIN",
    },
    boardSettings: {
        title: (boardName: string) => `BOARD SETTINGS ${boardName}`,
        tabs: {
            members: {
                title: "MEMBERS",
            },
        },
    },
    navbar: {
        settings: "SETTINGS",
        logOut: "LOG OUT",
    },
    components: {
        user: {
            unknown: "UNKNOWN USER",
            unnamed: "UNNAMED USER",
            handle: (handle: string) => `HANDLE ${handle}`,
            email: (emails: string[]) =>
                emails.length > 1 ? `EMAIL AND MORE ${emails[0]}` : `EMAIL ${emails[0]}`,
        },
    },
    timeGraph: {
        presets: {
            thisWeek: "THIS WEEK",
            thisMonth: "THIS MONTH",
            last12Months: "LAST 12 MONTHS",
        },
    },
    task: {
        timeLogged: (seconds: number) => `TIME LOGGED ${formatDuration(seconds)}`,
        archived: "ARCHIVED",
        created: "CREATED",
        priority: (priority: number) => `PRIORITY ${priorityLabel(priority)}`,
        assignee: "ASSIGNEE",
        author: "AUTHOR",
    },
    boardForm: {
        title: "NEW BOARD",
        createBoard: "CREATE BOARD",
        name: "NAME",
        placeholder: "PLACEHOLDER",
        create: "CREATE",
    },
    taskDetails: {
        descriptionLabel: "DESCRIPTION",
        description: (description: string) => (description ? description : "NO DESCRIPTION"),
        author: "AUTHOR",
        assignedTo: "ASSIGNED TO",
        noOne: "NO ONE",
        status: "STATUS",
        priorityLabel: "PRIORITY",
        priority: (priority: number) => priorityLabel(priority),
        estimatedTimeLabel: "ESTIMATED TIME",
        estimatedTime: (seconds: number) => formatDuration(seconds),
        created: "CREATED",
        archived: "ARCHIVED",
        blockedBy: "BLOCKED BY",
        selectTask: "SELECT TASK",
        add: "ADD",
        timeLoggedLabel: "TIME LOGGED",
        edit: "EDIT",
        logTime: "LOG TIME",
        timeLogged: (seconds: number) => formatDuration(seconds),
    },
    taskForm: {
        title: "CREATE TASK",
        linkEmailFirst: "LINK EMAIL FIRST",
        titleLabel: "TITLE",
        titlePlaceholder: "TITLE PLACEHOLDER",
        descriptionLabel: "DESCRIPTION",
        descriptionPlaceholder: "DESCRIPTION PLACEHOLDER",
        authorEmail: "AUTHOR EMAIL",
        status: "STATUS",
        priority: "PRIORITY",
        labels: "LABELS",
        cancel: "CANCEL",
        create: "CREATE",
    },
    taskEditForm: {
        title: "EDIT TASK",
        titleLabel: "TITLE",
        descriptionLabel: "DESCRIPTION",
        assignedTo: "ASSIGNED TO",
        addAssigneePlaceholder: "ADD ASSIGNEE PLACEHOLDER",
        addAssignee: (email: string) => `ADD ASSIGNEE ${email}`,
        status: "STATUS",
        priority: "PRIORITY",
        estimatedTime: "ESTIMATED TIME",
        labels: "LABELS",
        archived: "ARCHIVED",
        cancel: "CANCEL",
        save: "SAVE",
    },
    timeEditForm: {
        title: "TIME ENTRIES",
        startTime: "START TIME",
        endTime: "END TIME",
        description: "DESCRIPTION",
        edit: "EDIT",
        delete: "DELETE",
        editEntry: "EDIT TIME ENTRY",
        addEntry: "ADD TIME ENTRY",
        cancel: "CANCEL",
        descriptionPlaceholder: "DESCRIPTION PLACEHOLDER",
        saveChanges: "SAVE CHANGES",
        submitNew: "ADD ENTRY",
        stopTracking: "STOP TRACKING",
        startTracking: "START TRACKING",
    },
};

export type RawDictionary = typeof dict;

import { Temporal } from "temporal-polyfill/full";

// TODO: do not export
export function formatDuration(seconds: number) {
    if (seconds <= 0) {
        return "None";
    }

    const duration = Temporal.Duration.from({ seconds }).round({ largestUnit: "hour" });

    if (duration.total("minutes") < 1) {
        return `${duration.seconds}s`;
    }

    if (duration.total("hours") < 1) {
        return `${duration.minutes}m`;
    }

    return `${duration.hours}h ${duration.minutes}m`;
}
