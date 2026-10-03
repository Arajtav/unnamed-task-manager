import { createContext, useContext } from "solid-js";

export type AlertType = "info" | "success" | "warning" | "error";

export const AlertContext = createContext<{
    addAlert: (message: string, type: AlertType, duration?: number) => void;
}>();

export function useAlert() {
    const context = useContext(AlertContext);

    if (!context) {
        throw new Error("useAlert must be used inside AlertContext.Provider");
    }

    return context;
}
