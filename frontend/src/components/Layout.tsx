import { createContext, createSignal, onMount, Show, useContext } from "solid-js";
import { createStore } from "solid-js/store";
import { RouteSectionProps, useLocation } from "@solidjs/router";
import { meQuery } from "../graphql/client";
import { handleAuthError } from "../auth";
import { GqlMe } from "../graphql/types";
import Navbar from "./Navbar";

const MeContext = createContext<ReturnType<typeof createStore<GqlMe>>>();

export function useMe() {
    const context = useContext(MeContext);

    if (!context) {
        throw new Error("useMe must be used inside MeContext.Provider");
    }

    return context;
}

export default function Layout(props: RouteSectionProps) {
    const location = useLocation();
    const [loading, setLoading] = createSignal(true);

    const isAuthPage = () => location.pathname == "/login" || location.pathname == "/join";

    const store = createStore<GqlMe>({} as GqlMe);

    onMount(async () => {
        if (isAuthPage()) return;

        const result = await meQuery();

        if (handleAuthError(result.error)) return;

        if (!result.data?.me) {
            throw new Error("Expected authenticated user");
        }

        store[1](result.data.me);
        setLoading(false);
    });

    return (
        <div class="flex flex-col h-screen w-screen">
            <Show
                when={isAuthPage() || !loading()}
                fallback={
                    <div id="layout_spinner" class="flex items-center justify-center w-full h-full">
                        <span class="loading loading-spinner loading-lg" />
                    </div>
                }
            >
                <Show
                    when={!isAuthPage()}
                    fallback={<div class="flex-1 overflow-auto">{props.children}</div>}
                >
                    <MeContext.Provider value={store}>
                        <Navbar></Navbar>
                        <div class="flex-1 overflow-auto">{props.children}</div>
                    </MeContext.Provider>
                </Show>
            </Show>
        </div>
    );
}
