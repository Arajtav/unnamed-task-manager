import { createContext, useContext } from "solid-js";
import { createStore } from "solid-js/store";

export type BoardNavSettings = {
    createTask: string;
    search: string;
};

type BoardNavStore = ReturnType<typeof createStore<BoardNavSettings>>;

export const BoardNavContext = createContext<BoardNavStore>();

export function useBoardNav() {
    const context = useContext(BoardNavContext);

    if (!context) {
        throw new Error("useBoardNav must be used inside BoardNavContext.Provider");
    }

    return context;
}
