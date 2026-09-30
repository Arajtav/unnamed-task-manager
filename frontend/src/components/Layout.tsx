import { createContext, createSignal, For, onMount, Show, useContext } from "solid-js";
import { createStore } from "solid-js/store";
import { RouteSectionProps, useLocation } from "@solidjs/router";
import { handleAuthError } from "../auth";
import Navbar from "./Navbar";
import { gqlClient } from "../graphql";
import { gql } from "@urql/core";

type Me = {
    id: string;
    isAdmin: boolean;
    emails: string[];
    handle?: string;
};

const MeContext = createContext<ReturnType<typeof createStore<Me>>>();

type AlertType = "info" | "success" | "warning" | "error";

const AlertContext = createContext<{
    addAlert: (message: string, type: AlertType, duration?: number) => void;
}>();

const BoardsContext = createContext<ReturnType<typeof createSignal<Map<string, string>>>>();

// Idk what to call it really.
const ColdAppDataContext = createContext<{
    users: { id: string; emails: string[]; handle: string }[];
}>();

export function useAlert() {
    const context = useContext(AlertContext);

    if (!context) {
        throw new Error("useAlert must be used inside AlertContext.Provider");
    }

    return context;
}

export function useMe() {
    const context = useContext(MeContext);

    if (!context) {
        throw new Error("useMe must be used inside MeContext.Provider");
    }

    return context;
}

export function useBoards() {
    const context = useContext(BoardsContext);

    if (!context) {
        throw new Error("useBoards must be used inside BoardsContext.Provider");
    }

    return context;
}

export function useColdAppDataContext() {
    const context = useContext(ColdAppDataContext);

    if (!context) {
        throw new Error("useColdAppDataContext must be used inside ColdAppDataContext.Provider");
    }

    return context;
}

export default function Layout(props: RouteSectionProps) {
    const location = useLocation();
    const [loading, setLoading] = createSignal(true);

    const isAuthPage = () => location.pathname == "/login" || location.pathname == "/join";

    const meStore = createStore({} as Me);
    const boardsSignal = createSignal({} as Map<string, string>);
    let coldAppData;

    onMount(async () => {
        if (isAuthPage()) return;

        const result = await gqlClient.query<{
            me: {
                id: string;
                isAdmin: boolean;
                emails: string[];
                handle: string | null;
            };
            boards: {
                id: string;
                name: string;
            }[];
            users: {
                id: string;
                handle?: string;
                emails: string[];
            }[];
        }>(
            gql`
                query Me {
                    me {
                        id
                        isAdmin
                        emails
                        handle
                    }
                    boards {
                        id
                        name
                    }
                    users {
                        id
                        handle
                        emails
                    }
                }
            `,
            {}
        );

        if (handleAuthError(result.error)) return;

        const me = result.data?.me;
        const boards = result.data?.boards;
        const users = result.data?.users;

        if (!me || !boards || !users) {
            throw new Error("Expected authenticated user");
        }

        meStore[1]({
            id: me.id,
            isAdmin: me.isAdmin,
            emails: me.emails,
            handle: me.handle ?? undefined,
        });

        boardsSignal[1](new Map(boards.map(board => [board.id, board.name])));

        coldAppData = { users };

        setLoading(false);
    });

    let [gAlert, setGAlert] = createSignal<{ id: symbol; message: string; type: AlertType }[]>([]);

    function addAlert(message: string, type: AlertType, duration: number = 10000) {
        switch (type) {
            case "info": {
                console.info(message);
                break;
            }
            case "success": {
                console.debug(message);
                break;
            }
            case "warning": {
                console.warn(message);
                break;
            }
            case "error": {
                console.error(message);
                break;
            }
        }

        const id = Symbol();

        setGAlert(gAlerts => [...gAlerts, { id, message: message, type }]);

        setTimeout(() => {
            setGAlert(gAlerts => gAlerts.filter(a => a.id != id));
        }, duration);
    }

    const alerts = { addAlert };

    return (
        <div class="flex flex-col h-screen w-screen">
            <AlertContext.Provider value={alerts}>
                <Show
                    when={isAuthPage() || !loading()}
                    fallback={
                        <div
                            id="layout_spinner"
                            class="flex items-center justify-center w-full h-full"
                        >
                            <span class="loading loading-spinner loading-lg" />
                        </div>
                    }
                >
                    <Show
                        when={!isAuthPage()}
                        fallback={<div class="flex-1 overflow-auto">{props.children}</div>}
                    >
                        <MeContext.Provider value={meStore}>
                            <ColdAppDataContext.Provider value={coldAppData}>
                                <BoardsContext.Provider value={boardsSignal}>
                                    <Navbar></Navbar>
                                    <div class="flex-1 overflow-auto">{props.children}</div>
                                </BoardsContext.Provider>
                            </ColdAppDataContext.Provider>
                        </MeContext.Provider>
                    </Show>
                </Show>
            </AlertContext.Provider>
            <div class="toast">
                <For each={gAlert()}>
                    {a => (
                        <div role="alert" class={`alert alert-${a.type}`}>
                            <span>{a.message}</span>
                        </div>
                    )}
                </For>
            </div>
        </div>
    );
}
