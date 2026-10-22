import { createSignal, For, onMount, Show } from "solid-js";
import { createStore } from "solid-js/store";
import { RouteSectionProps, useLocation } from "@solidjs/router";
import { handleAuthError } from "../auth";
import Navbar from "./Navbar";
import { gqlClient } from "../graphql";
import { gql } from "@urql/core";
import { AlertConfig, AlertContext } from "../contexts/alertContext";
import { ModalContext, ModalOptions } from "../contexts/modalContext";
import { dbg } from "../debug";
import { AppData, AppDataContext } from "../contexts/appDataContext";
import { ClientAppDataContext, createClientAppData } from "../contexts/clientAppDataContext";
import { BaseBoard, FullUserRaw, Me, processFullUser } from "../gqlTypes";
import Alert, { LogAlert } from "../newComponents/Alert";

export default function Layout(props: RouteSectionProps) {
    const location = useLocation();
    const [loading, setLoading] = createSignal(true);

    const isAuthPage = () => location.pathname == "/login" || location.pathname == "/join";

    const appData = createStore({} as AppData);

    onMount(async () => {
        if (isAuthPage()) return;

        const result = await gqlClient.query<{
            me: Me;
            boards: BaseBoard[];
            users: FullUserRaw[];
        }>(
            gql`
                query Me {
                    me {
                        id
                        isAdmin
                        emails
                        handle
                        invite
                    }
                    boards {
                        id
                        name
                    }
                    users {
                        id
                        handle
                        emails
                        isAdmin
                        isDisabled
                        createdAt
                        invite
                    }
                }
            `,
            {}
        );

        if (handleAuthError(result.error)) return;

        const me = result.data!.me;
        const boards = result.data!.boards;
        const users = result.data!.users;

        appData[1](
            dbg({
                me,
                boards: new Map(boards.map(board => [board.id, board.name])),
                users: users.map(user => processFullUser(user)),
            })
        );

        setLoading(false);
    });

    let [alerts, setAlerts] = createSignal<{ id: symbol; alert: AlertConfig }[]>([]);

    function addAlert(alert: AlertConfig, duration?: number) {
        LogAlert(alert);

        const id = Symbol();

        setAlerts(alerts => [...alerts, { id, alert }]);

        if (duration) {
            setTimeout(() => {
                removeAlert(id);
            }, duration);
        }

        return id;
    }

    function removeAlert(id: symbol) {
        setAlerts(alerts => alerts.filter(a => a.id != id));
    }

    const [modal, setModal] = createSignal<ModalOptions | null>(null);

    let modalDialog!: HTMLDialogElement;

    function openModal(options: ModalOptions) {
        setModal(options);
        modalDialog.showModal();
    }

    function closeModal() {
        modalDialog.close();
        setModal(null);
    }

    const modalContext = {
        openModal,
        closeModal,
    };

    return (
        <div class="flex flex-col h-screen w-screen">
            <AlertContext.Provider value={{ addAlert, removeAlert }}>
                <ModalContext.Provider value={modalContext}>
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
                            fallback={
                                <div class="flex-1 h-full overflow-auto">{props.children}</div>
                            }
                        >
                            <AppDataContext.Provider value={appData}>
                                <ClientAppDataContext.Provider
                                    value={createClientAppData(appData[0].me.id)}
                                >
                                    <Navbar></Navbar>
                                    <div class="flex-1 overflow-scroll h-full">
                                        {props.children}
                                    </div>
                                </ClientAppDataContext.Provider>
                            </AppDataContext.Provider>
                        </Show>
                    </Show>
                </ModalContext.Provider>
            </AlertContext.Provider>

            <div class="toast">
                <For each={alerts()}>
                    {a => (
                        <Alert
                            onClose={() => removeAlert(a.id)}
                            buttons={a.alert.buttons}
                            title={a.alert.title}
                            content={a.alert.content}
                            icon={a.alert.icon}
                            type={a.alert.type}
                        />
                    )}
                </For>
            </div>

            <dialog ref={modalDialog} class="modal">
                <Show when={modal()}>
                    {m => (
                        <div class="modal-box">
                            <Show when={m().title}>
                                <h3 class="text-lg font-bold">{m().title}</h3>
                            </Show>

                            <div class="py-4">{m().content}</div>

                            <div class="modal-action">
                                <form method="dialog" class="flex gap-2">
                                    <For each={m().buttons}>
                                        {button => (
                                            <button
                                                class={`btn ${button.class ?? ""}`}
                                                onClick={button.onClick}
                                            >
                                                {button.label}
                                            </button>
                                        )}
                                    </For>
                                </form>
                            </div>
                        </div>
                    )}
                </Show>

                <form method="dialog" class="modal-backdrop">
                    <button>close</button>
                </form>
            </dialog>
        </div>
    );
}
