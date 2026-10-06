import { createSignal, For, onMount, Show } from "solid-js";
import { createStore } from "solid-js/store";
import { RouteSectionProps, useLocation } from "@solidjs/router";
import { handleAuthError } from "../auth";
import Navbar from "./Navbar";
import { gqlClient } from "../graphql";
import { gql } from "@urql/core";
import { AlertContext, AlertType } from "../contexts/alertContext";
import { ModalContext, ModalOptions } from "../contexts/modalContext";
import { dbg } from "../debug";
import { AppData, AppDataContext, Me, User } from "../contexts/appDataContext";

export default function Layout(props: RouteSectionProps) {
    const location = useLocation();
    const [loading, setLoading] = createSignal(true);

    const isAuthPage = () => location.pathname == "/login" || location.pathname == "/join";

    const appData = createStore({} as AppData);

    onMount(async () => {
        if (isAuthPage()) return;

        const result = await gqlClient.query<{
            me: Me;
            boards: {
                id: string;
                name: string;
            }[];
            users: User[];
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
                        isAdmin
                        isDisabled
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
                users,
            })
        );

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
            <AlertContext.Provider value={alerts}>
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
                                <Navbar></Navbar>
                                <div class="flex-1 overflow-scroll h-full">{props.children}</div>
                            </AppDataContext.Provider>
                        </Show>
                    </Show>
                </ModalContext.Provider>
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
