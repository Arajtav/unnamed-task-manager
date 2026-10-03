import { createContext, useContext } from "solid-js";
import { createStore } from "solid-js/store";

export type Me = {
    id: string;
    isAdmin: boolean;
    emails: string[];
    handle?: string;
};

export const MeContext = createContext<ReturnType<typeof createStore<Me>>>();

export function useMe() {
    const context = useContext(MeContext);

    if (!context) {
        throw new Error("useMe must be used inside MeContext.Provider");
    }

    return context;
}
