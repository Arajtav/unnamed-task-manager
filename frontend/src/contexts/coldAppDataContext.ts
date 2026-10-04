// Idk what to call it really.

import { createContext, useContext } from "solid-js";

export const ColdAppDataContext = createContext<{
    users: { id: string; emails: string[]; handle?: string }[];
}>();

export function useColdAppData() {
    const context = useContext(ColdAppDataContext);

    if (!context) {
        throw new Error("useColdAppData must be used inside ColdAppDataContext.Provider");
    }

    return context;
}
