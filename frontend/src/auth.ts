import { initClient, initContract } from "@ts-rest/core";
import type { CombinedError } from "@urql/core";
import z from "zod";

const c = initContract();

const LoginRequest = z.object({
    email: z.string(),
});

export const contract = c.router({
    login: {
        method: "POST",
        path: "/auth/login",
        body: LoginRequest,
        responses: {
            204: z.void(),
            401: z.literal("WRONG_ACCOUNT"),
        },
    },
    logout: {
        method: "POST",
        path: "/auth/logout",
        body: z.void(),
        responses: {
            204: z.void(),
        },
    },
});

export const client = initClient(contract, {
    baseUrl: "http://localhost:8080",
    throwOnUnknownStatus: true,
    validateResponse: true,
    credentials: "include",
});

export function handleAuthError(error: CombinedError | undefined): boolean {
    if (!error) return false;

    if (error.response?.status === 401) {
        const location = window.location;
        const url = location.pathname + location.search;

        location.assign(`/login?back=${encodeURIComponent(url)}`);
    }

    return true;
}
