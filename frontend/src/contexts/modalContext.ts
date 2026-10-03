import { createContext, JSXElement, useContext } from "solid-js";

export type ModalButton = {
    label: string;
    class?: string;
    onClick?: () => void | Promise<void>;
};

export type ModalOptions = {
    title: string;
    content: JSXElement;
    buttons?: ModalButton[];
};

export const ModalContext = createContext<{
    openModal: (options: ModalOptions) => void;
    closeModal: () => void;
}>();

export function useModal() {
    const context = useContext(ModalContext);

    if (!context) {
        throw new Error("useModal must be used inside ModalContext.Provider");
    }

    return context;
}
