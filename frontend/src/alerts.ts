import {
    CircleXIcon,
    GlobeOffIcon,
    RotateCwIcon,
    SearchXIcon,
    ServerCrashIcon,
    ShieldXIcon,
    UserRoundXIcon,
} from "lucide-solid";

export const SERVER_WRONG = {
    type: "error",
    title: "Server error",
    content: "Server sent invalid response.",
    icon: ServerCrashIcon,
} as const;

export const NETWORK = {
    type: "error",
    title: "Network error",
    content: "Check your internet connection and try again.",
    icon: GlobeOffIcon,
} as const;

export const ACCOUNT_NOT_FOUND = {
    type: "warning",
    title: "Account not found",
    content: "This account does not exist or is disabled.",
    icon: UserRoundXIcon,
} as const;

export const NO_PASSKEYS = {
    type: "normal",
    title: "No passkeys",
    content: "No passkeys found.",
    icon: SearchXIcon,
} as const;

export const AUTHENTICATOR_WRONG = {
    type: "error",
    title: "Something went wrong",
    content: "Check your authenticator and try again.",
    icon: CircleXIcon,
} as const;

export const UNABLE_TO_GET_PASSKEYS = {
    type: "error",
    title: "Unable to get any passkeys",
    content: "Check your authenticator and try again.",
    icon: CircleXIcon,
} as const;

export const PASSKEY_CREATION_FAILED = {
    type: "error",
    title: "Unable to create a passkey",
    content: "Check your authenticator and try again.",
    icon: CircleXIcon,
} as const;

export const INVITE_EXPIRED = {
    type: "error",
    title: "Code expired",
    content: "This code has expired or has been used while you were creating the passkey.",
    icon: ShieldXIcon,
} as const;
