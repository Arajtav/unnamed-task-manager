import { createContext, createEffect, createSignal, Show, useContext } from "solid-js";
import { RouteSectionProps, useParams } from "@solidjs/router";
import { handleAuthError } from "../auth";
import BoardNavbar from "../components/BoardNavbar";
import { useAlert } from "../components/Layout";
import { createStore } from "solid-js/store";
import { gqlClient } from "../graphql";
import { gql } from "@urql/core";

export type Task = {
    id: string;
    title: string;
    createdAt: Date;
    author: UserFromEmail;
    status?: string;
    assignee?: UserFromEmail;
};

export type Access = {
    user: User;
    isModerator: boolean;
};

export type FullBoard = {
    id: number;
    name: string;
    tasks: Task[];
    access: Access[];
};

export type User = {
    id: string;
    handle?: string;
};

export type UserFromEmail = {
    email: string;
    user?: User;
};

const BoardContext = createContext<ReturnType<typeof createStore<FullBoard>>>();

export function useBoard() {
    const context = useContext(BoardContext);

    if (!context) throw new Error("useBoard must be used inside BoardLayout");

    return context;
}

export default function BoardLayout(props: RouteSectionProps) {
    const params = useParams<{ id: string }>();
    const { addAlert } = useAlert();

    const store = createStore({} as FullBoard);
    const [loading, setLoading] = createSignal<"yes" | "no" | "error">("yes");

    createEffect(async () => {
        const id = Number(params.id);

        setLoading("yes");

        await fetchBoard(id);
    });

    async function fetchBoard(id: number) {
        const result = await gqlClient.query<{
            board: Omit<FullBoard, "tasks"> & {
                tasks: (Omit<Task, "createdAt"> & {
                    createdAt: string;
                })[];
            };
        }>(
            gql`
                query Board($id: Int!) {
                    board(id: $id) {
                        id
                        name
                        tasks {
                            id
                            title
                            createdAt
                            author {
                                email
                                user {
                                    id
                                    handle
                                }
                            }
                            status
                            assignee {
                                email
                                user {
                                    id
                                    handle
                                }
                            }
                        }
                        access {
                            user {
                                id
                                handle
                            }
                            isModerator
                        }
                    }
                }
            `,
            { id }
        );

        if (handleAuthError(result.error)) {
            addAlert("Something went wrong.", "error");
            setLoading("error");
            return;
        }

        const board = result.data?.board;

        if (!board) {
            addAlert("Board not found.", "error");
            setLoading("error");
            return;
        }

        const fullBoard: FullBoard = {
            ...board,
            tasks: board.tasks.map(task => ({ ...task, createdAt: new Date(task.createdAt) })),
        };

        store[1](fullBoard);
        setLoading("no");
    }

    return (
        <>
            <Show when={loading() == "yes"}>
                <div class="w-full h-full items-center justify-center flex">
                    <span class="loading loading-spinner loading-lg" />
                </div>
            </Show>

            <Show when={loading() == "no"}>
                <BoardContext.Provider value={store}>
                    <BoardNavbar />
                    {props.children}
                </BoardContext.Provider>
            </Show>
        </>
    );
}
