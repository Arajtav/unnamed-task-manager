import { createContext, createSignal, useContext } from "solid-js";

export const BoardsContext = createContext<ReturnType<typeof createSignal<Map<string, string>>>>();

export function useBoards() {
    const context = useContext(BoardsContext);

    if (!context) {
        throw new Error("useBoards must be used inside BoardsContext.Provider");
    }

    return context;
}
