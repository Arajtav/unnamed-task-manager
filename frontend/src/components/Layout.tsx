import { createContext, createSignal, For, onMount, Show, useContext } from "solid-js";
import { createStore } from "solid-js/store";
import { RouteSectionProps, useLocation } from "@solidjs/router";
import { meQuery } from "../graphql/client";
import { handleAuthError } from "../auth";
import { GqlMe } from "../graphql/types";
import Navbar from "./Navbar";

const MeContext = createContext<ReturnType<typeof createStore<GqlMe>>>();
const AlertContext = createContext<{
    addAlert: (message: string, type: AlertType, duration?: number) => void;
}>();

type AlertType = "info" | "success" | "warning" | "error";

// TODO: this is wrong actually. It should accept translation keys not output strings.
export function useAlert() {
    const context = useContext(AlertContext);

    if (!context) {
        throw new Error("useAlert must be used inside MeContext.Provider");
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

    let [gAlert, setGAlert] = createSignal<{ id: symbol; message: string; type: AlertType }[]>([]);

    function addAlert(message: string, type: AlertType, duration: number = 10000) {
        switch (type) {
            case "info": { console.info(message); break; }
            case "success": { console.debug(message);  break; }
            case "warning": { console.warn(message);  break; }
            case "error": { console.error(message);  break; }
        };

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
                        <MeContext.Provider value={store}>
                            <Navbar></Navbar>
                            <div class="flex-1 overflow-auto">{props.children}</div>
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
