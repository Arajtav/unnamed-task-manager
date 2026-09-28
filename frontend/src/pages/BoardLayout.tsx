import { Accessor, createContext, createResource, createSignal, onMount, Show, useContext } from "solid-js";
import { RouteSectionProps, useParams } from "@solidjs/router";
import { handleAuthError } from "../auth";
import { boardQuery, boardsQuery } from "../graphql/client";
import type { GqlFullBoard } from "../graphql/types";
import BoardNavbar from "../components/BoardNavbar";
import { useAlert } from "../components/Layout";
import { createStore } from "solid-js/store";

const BoardContext = createContext<ReturnType<typeof createStore<GqlFullBoard>>>();

export function useBoard() {
    const context = useContext(BoardContext);

    if (!context) throw new Error("useBoard must be used inside BoardLayout");

    return context;
}

export default function BoardLayout(props: RouteSectionProps) {
    const { id } = useParams<{ id: string }>();
    let { addAlert } = useAlert();

    const store = createStore<GqlFullBoard>({} as GqlFullBoard);
    const [loading, setLoading] = createSignal("yes");

    onMount(async () => {
        const result = await boardQuery(Number(id));

        if (handleAuthError(result.error)) {
            addAlert("Something went wrong.", "error");
            setLoading("error");
            return;
        }

        let board = result.data?.board;

        if (!board) {
            addAlert("Something went wrong.", "error");
            setLoading("error");
            return;
        }

        store[1](board);
        setLoading("no");
    });

    return (
        <>
            <Show when={loading() == "yes"}>
                <div class="w-full h-full items-center justify-center flex">
                    <span class="loading loading-spinner loading-lg" />
                </div>
            </Show>

            <Show when={loading() == "no"}>
                <BoardContext.Provider value={store}>
                    <BoardNavbar boardId={store[0].id} />
                    {props.children}
                </BoardContext.Provider>
            </Show>
        </>
    );
}
