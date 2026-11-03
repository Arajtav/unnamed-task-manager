import { priorityLabel, type Invite } from "../gqlTypes";

export const dict: RawDictionary = {
    title: "Task Manager",
    genericError: "Something went wrong",
    permissions: {
        admin: "Admin",
        moderator: "Moderator",
    },
    boardMembers: {
        title: "Board members",
        empty: "This board has no members yet",
        kick: "Kick",
        removeModerator: "Remove moderator",
        makeModerator: "Make moderator",
        searchNoResults: "No users found",
    },
    boardNavbar: {
        search: "Search...",
    },
    emailAddresses: {
        title: "Email addresses",
        noEmails: "No email addresses linked",
        adding: "Adding…",
        emailPlaceholder: "email@example.org",
        add: "Add",
    },
    yourHandle: {
        title: "Your handle",
        invalid: "Invalid handle",
        saving: "Saving…",
        save: "Save",
    },
    taskStatuses: {
        title: "Task statuses",
        noStatuses: "No task statuses yet",
        adding: "Adding…",
        add: "Add",
        newStatusPlaceholder: "New status name",
    },
    users: {
        title: "Users",
        createAccount: "Create account",
        table: {
            invite: "Invite",
            user: "User",
            emails: "Emails",
            badges: "Info",
            createdAt: "Created at",
        },
        invite: (invite: Invite) => {
            switch (invite.type) {
                case "present":
                    return invite.invite;
                case "not-present":
                    return "No invite";
                case "forbidden":
                    return "";
            }
        },
        user: (handle: string | null) => (handle ? `@${handle}` : "No handle"),
        copyId: "Copy ID",
        setHandle: "Set handle",
        generateInvite: "Generate invite",
        removeInvite: "Remove invite",
        disable: "Disable",
        reenable: "Re-enable",
    },
    settings: {
        title: "Settings",
        tabs: {
            account: {
                title: "Account",
            },
        },
        language: {
            label: "Language",
        },
    },
    login: {
        title: "Log in",
        loginWithAPasskey: "Log in with a passkey",
        or: "or",
        join: "Join",
    },
    join: {
        title: "Join",
        inviteCode: "Invite code",
        invitePlaceholder: "XXXX-XXXX-XXXX",
        displayName: "Passkey display name",
        displayNamePlaceholder: "Me",
        createAPasskey: "Create a passkey",
        or: "or",
        login: "Log in",
    },
    boardSettings: {
        title: (boardName: string) => `${boardName} - Settings`,
        tabs: {
            members: {
                title: "Members",
            },
        },
    },
    navbar: {
        settings: "Settings",
        logOut: "Log out",
    },
    components: {
        user: {
            unknown: "Unknown user",
            unnamed: "This user has no name",
            handle: (handle: string) => `@${handle}`,
            email: (emails: string[]) => (emails.length > 1 ? `${emails[0]} and more` : emails[0]),
        },
    },
    timeGraph: {
        presets: {
            thisWeek: "This week",
            thisMonth: "This month",
            last12Months: "Last 12 months",
        },
    },
    task: {
        timeLogged: (seconds: number) => `Time logged: ${formatDuration(seconds)}`,
        archived: "Archived",
        created: "Created",
        priority: (priority: number) => `Priority: ${priorityLabel(priority)}`,
        assignee: "Assignee",
        author: "Author",
    },
    boardForm: {
        title: "New board",
        createBoard: "Create board",
        name: "Name",
        placeholder: "Board name",
        create: "Create",
    },
    taskDetails: {
        descriptionLabel: "Description",
        description: (description: string) =>
            description ? description : "No description provided.",
        author: "Author",
        assignedTo: "Assigned to",
        noOne: "No one",
        status: "Status",
        priorityLabel: "Priority",
        priority: (priority: number) => priorityLabel(priority),
        estimatedTimeLabel: "Estimated time",
        estimatedTime: (seconds: number) => formatDuration(seconds),
        created: "Created",
        archived: "Archived",
        blockedBy: "Blocked by",
        selectTask: "Select a task",
        add: "Add",
        timeLoggedLabel: "Time logged",
        edit: "Edit",
        logTime: "Log time",
        timeLogged: (seconds: number) => formatDuration(seconds),
    },
    taskForm: {
        title: "Create task",
        linkEmailFirst: "Link an email address first",
        titleLabel: "Title",
        titlePlaceholder: "Task title",
        descriptionLabel: "Description",
        descriptionPlaceholder: "Describe the task here",
        authorEmail: "Author email",
        status: "Status",
        priority: "Priority",
        labels: "Labels",
        cancel: "Cancel",
        create: "Create",
    },
    taskEditForm: {
        title: "Edit task",
        titleLabel: "Title",
        descriptionLabel: "Description",
        assignedTo: "Assigned to",
        addAssigneePlaceholder: "Search by email or handle",
        addAssignee: (email: string) => `Add ${email} as assignee`,
        status: "Status",
        priority: "Priority",
        estimatedTime: "Estimated time",
        labels: "Labels",
        archived: "Archived",
        cancel: "Cancel",
        save: "Save",
    },
    timeEditForm: {
        title: "Time entries",
        startTime: "Start time",
        endTime: "End time",
        description: "Description",
        edit: "Edit",
        delete: "Delete",
        editEntry: "Edit time entry",
        addEntry: "Add time entry",
        cancel: "Cancel",
        descriptionPlaceholder: "What did you work on?",
        saveChanges: "Save changes",
        submitNew: "Add entry",
        stopTracking: "Stop tracking",
        startTracking: "Start tracking",
    },
};

import { Temporal } from "temporal-polyfill/full";
import { RawDictionary } from "./debug";

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
