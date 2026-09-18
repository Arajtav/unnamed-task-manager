import { createContext, createResource, Resource, Show, useContext } from "solid-js";
import { RouteSectionProps, useLocation } from "@solidjs/router";
import { meQuery } from "../graphql/client";
import Navbar from "./Navbar";
import { handleAuthError } from "../auth";
import { GqlUser } from "../graphql/types";

const MeContext = createContext<Resource<GqlUser | null | undefined>>();

export function useMe() {
    const context = useContext(MeContext);

    if (!context) {
        throw new Error("useMe must be used inside MeContext.Provider");
    }

    return context;
}

export default function Layout(props: RouteSectionProps) {
    const location = useLocation();

    const isAuthPage = () => location.pathname == "/login" || location.pathname == "/join";

    const [me] = createResource(async () => {
        if (isAuthPage()) {
            return null;
        }

        const result = await meQuery();

        if (handleAuthError(result.error)) return undefined;

        return result.data?.me ?? null;
    });

    return (
        <div class="flex flex-col h-screen w-screen">
            <Show when={me.loading}>
                <div id="layout_spinner" class="flex items-center justify-center w-full h-full">
                    <span class="loading loading-spinner loading-lg" />
                </div>
            </Show>
            <Show when={!me.loading}>
                <Show when={!isAuthPage() && me()}>{user => <Navbar me={user()} />}</Show>
                <MeContext.Provider value={me}>
                    <div class="flex-1 overflow-auto">{props.children}</div>
                </MeContext.Provider>
            </Show>
        </div>
    );
}
