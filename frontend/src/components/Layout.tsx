import { createEffect, createSignal, For, Show } from "solid-js";
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

    createEffect(async () => {
        if (isAuthPage()) return;
        if (appData[0].me) return;

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

        const forbiddenInvites = new Set<number>();

        const otherErrors = (result.error?.graphQLErrors ?? []).filter(err => {
            const [root, index, field] = err.path ?? [];

            if (
                root === "users" &&
                typeof index === "number" &&
                field === "invite" &&
                err.extensions?.code === "FORBIDDEN"
            ) {
                forbiddenInvites.add(index);
                return false;
            }

            return true;
        });

        if (result.error?.networkError || otherErrors.length > 0 || !result.data) {
            if (handleAuthError(result.error)) return;
            if (!result.data) return;
        }

        const me = result.data!.me;
        const boards = result.data!.boards;
        const users = result.data!.users;

        appData[1](
            dbg({
                me,
                boards: new Map(boards.map(board => [board.id, board.name])),
                users: users.map((user, i) =>
                    processFullUser(forbiddenInvites.has(i) ? { ...user, invite: undefined } : user)
                ),
            })
        );

        setLoading(false);
    });

    let [alerts, setAlerts] = createSignal<
        { id: symbol; alert: AlertConfig; timeout: number | undefined }[]
    >([]);

    function addAlert(alert: AlertConfig, duration?: number) {
        LogAlert(alert);
        if (duration && duration < 0.1) return;

        const id = Symbol();

        let timeout: number | undefined;
        if (duration) {
            timeout = setTimeout(() => {
                removeAlert(id);
            }, duration * 1000);
        }

        setAlerts(alerts => [...alerts, { id, alert, timeout }]);

        return id;
    }

    function removeAlert(id: symbol, duration: number = 0) {
        setAlerts(alerts => {
            if (duration <= 0) {
                return alerts.filter(a => a.id != id);
            }

            return alerts.map(a => {
                if (a.id != id) return a;
                clearTimeout(a.timeout);
                return { ...a, timeout: setTimeout(() => removeAlert(id), duration * 1000) };
            });
        });
    }

    function addSingleAlert(id: symbol | undefined, alert: AlertConfig, duration?: number) {
        const a = id ? alerts().find(a => a.id == id) : undefined;
        if (a) {
            removeAlert(a.id, duration);
            return a.id;
        } else {
            return addAlert(alert, duration);
        }
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
        <div class="flex flex-col h-screen w-screen accent-accent">
            <AlertContext.Provider value={{ addAlert, removeAlert, addSingleAlert }}>
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
