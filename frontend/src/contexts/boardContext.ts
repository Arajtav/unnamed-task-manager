import { createContext, useContext } from "solid-js";
import { createStore } from "solid-js/store";
import { FullBoard } from "../gqlTypes";

type BoardStore = ReturnType<typeof createStore<FullBoard>>;

export const BoardContext = createContext<BoardStore>();

export function useBoard() {
    const context = useContext(BoardContext);

    if (!context) {
        throw new Error("useBoard must be used inside BoardContext.Provider");
    }

    return context;
}
