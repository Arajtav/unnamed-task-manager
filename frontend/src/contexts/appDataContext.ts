import { createContext, useContext } from "solid-js";
import { createStore } from "solid-js/store";
import { FullUser, Me } from "../gqlTypes";

export type AppData = {
    boards: Map<number, string>;
    users: FullUser[];
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
