import type { CombinedError } from "@urql/core";

export type ApiError =
    | {
          type: "http";
          status: number;
          statusText: string;
      }
    | { type: "network" }
    | {
          type: "parse";
      };

export type ApiResult<T> = { data: T; error: null } | { data: null; error: ApiError };

async function request<T>(path: string, options: RequestInit = {}): Promise<ApiResult<T>> {
    let response;
    try {
        response = await fetch(`${import.meta.env.VITE_BACKEND}${path}`, {
            credentials: "include",
            ...options,
            headers: { "Content-Type": "application/json", ...options.headers },
        });
    } catch (_) {
        return {
            data: null,
            error: { type: "network" },
        };
    }

    if (!response.ok) {
        return {
            data: null,
            error: { type: "http", status: response.status, statusText: response.statusText },
        };
    }

    if (response.status == 204) {
        return { data: null as T, error: null };
    }

    try {
        const data = (await response.json()) as T;
        return { data, error: null };
    } catch (_) {
        return {
            data: null,
            error: { type: "parse" },
        };
    }
}

export const client = {
    loginStart(): Promise<ApiResult<PublicKeyCredentialRequestOptionsJSON>> {
        return request("/auth/login/start", { method: "POST" });
    },

    loginFinish(credential: PublicKeyCredentialJSON): Promise<ApiResult<null>> {
        return request("/auth/login/finish", { method: "POST", body: JSON.stringify(credential) });
    },

    logout(): Promise<ApiResult<null>> {
        return request("/auth/logout", { method: "POST" });
    },

    registerStart(
        invite: string,
        name: string
    ): Promise<ApiResult<PublicKeyCredentialCreationOptionsJSON>> {
        return request("/auth/register/start", {
            method: "POST",
            body: JSON.stringify({ invite, name }),
        });
    },

    registerFinish(credential: PublicKeyCredentialJSON): Promise<ApiResult<null>> {
        return request("/auth/register/finish", {
            method: "POST",
            body: JSON.stringify(credential),
        });
    },
};

export function handleAuthError(error: CombinedError | undefined): boolean {
    if (!error) return false;

    if (error.response?.status == 401) {
        const location = window.location;
        const url = location.pathname + location.search;

        location.assign(`/login?auto=1&back=${encodeURIComponent(url)}`);
    }

    return true;
}

export type PasskeyError = { type: "not_allowed" } | { type: "unknown" };

export type PasskeyResult<T> = { data: T; error: null } | { data: null; error: PasskeyError };

export async function getPasskeyCredential(
    options: PublicKeyCredentialRequestOptions
): Promise<PasskeyResult<PublicKeyCredential | null>> {
    try {
        const credential = await navigator.credentials.get({
            publicKey: options,
            mediation: "required",
        });

        return { data: credential as PublicKeyCredential | null, error: null };
    } catch (error) {
        return {
            data: null,
            error: {
                type:
                    error instanceof Error && error.name == "NotAllowedError"
                        ? "not_allowed"
                        : "unknown",
            },
        };
    }
}
