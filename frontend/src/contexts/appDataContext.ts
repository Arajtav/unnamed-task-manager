import { createContext, useContext } from "solid-js";
import { createStore } from "solid-js/store";

export type User = {
    id: string;
    emails: string[];
    handle: string | null;
    isAdmin: boolean;
    isDisabled: boolean;
};

export type Me = {
    id: string;
    emails: string[];
    handle: string | null;
    isAdmin: boolean;
};

export type AppData = {
    boards: Map<string, string>;
    users: User[];
    me: Me;
};

export const AppDataContext = createContext<ReturnType<typeof createStore<AppData>>>();

export function useAppData() {
    const context = useContext(AppDataContext);

    if (!context) {
        throw new Error("useAppData must be used inside AppDataContext.Provider");
    }

    return context;
}
