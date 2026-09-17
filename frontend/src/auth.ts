import type { CombinedError } from "@urql/core";

async function request<T>(path: string, options: RequestInit = {}) {
    const response = await fetch(`${import.meta.env.VITE_BACKEND}${path}`, {
        credentials: "include",
        ...options,
        headers: { "Content-Type": "application/json", ...options.headers },
    });

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    if (response.status == 204) {
        return null as T;
    }

    return (await response.json()) as T;
}

export const client = {
    loginStart(): Promise<PublicKeyCredentialRequestOptionsJSON> {
        return request("/auth/login/start", { method: "POST" });
    },

    loginFinish(credential: PublicKeyCredentialJSON): Promise<void> {
        return request("/auth/login/finish", { method: "POST", body: JSON.stringify(credential) });
    },

    logout(): Promise<void> {
        return request("/auth/logout", { method: "POST" });
    },

    registerStart(invite: string, name: string): Promise<PublicKeyCredentialCreationOptionsJSON> {
        return request("/auth/register/start", {
            method: "POST",
            body: JSON.stringify({ invite, name }),
        });
    },

    registerFinish(credential: PublicKeyCredentialJSON) {
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

        location.assign(`/login?back=${encodeURIComponent(url)}`);
    }

    return true;
}
