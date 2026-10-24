import { createContext, useContext } from "solid-js";
import { AlertProps } from "../newComponents/Alert";

export type AlertConfig = Omit<AlertProps, "onClose">;

export const AlertContext = createContext<{
    addAlert: (alert: AlertConfig, duration?: number) => symbol | undefined;
    removeAlert: (id: symbol, duration?: number) => void;
    addSingleAlert: (
        id: symbol | undefined,
        alert: AlertConfig,
        duration?: number
    ) => symbol | undefined;
}>();

export function useAlert() {
    const context = useContext(AlertContext);

    if (!context) {
        throw new Error("useAlert must be used inside AlertContext.Provider");
    }

    return context;
}
