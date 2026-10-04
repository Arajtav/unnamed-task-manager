import { createEffect, createSignal, Show } from "solid-js";
import { RouteSectionProps, useParams } from "@solidjs/router";
import { handleAuthError } from "../auth";
import BoardNavbar from "../components/BoardNavbar";
import { createStore } from "solid-js/store";
import { gqlClient } from "../graphql";
import { gql } from "@urql/core";
import TaskForm from "../components/TaskForm";
import { BoardContext, FullBoard, Task } from "../contexts/boardContext";
import { useAlert } from "../contexts/alertContext";
import { BoardNavContext, BoardNavSettings } from "../contexts/boardNavContext";

export default function BoardLayout(props: RouteSectionProps) {
    const params = useParams<{ id: string }>();
    const { addAlert } = useAlert();

    const store = createStore({} as FullBoard);
    const [loading, setLoading] = createSignal<"yes" | "no" | "error">("yes");

    const bnDefault = { createTask: false, showArchived: false };
    const boardNavStore = createStore<BoardNavSettings>({ ...bnDefault });

    // Actually when going to settings createTask should close to false TODO.
    createEffect(async () => {
        const id = Number(params.id);

        boardNavStore[1]({ ...bnDefault });
        setLoading("yes");

        await fetchBoard(id);
    });

    async function fetchBoard(id: number) {
        const result = await gqlClient.query<{
            board?: Omit<FullBoard, "tasks"> & {
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
                            isArchived
                        }
                        access {
                            user {
                                id
                                handle
                                emails
                            }
                            isModerator
                        }
                        taskStatus {
                            name
                            priority
                            color
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

        const board = result.data!.board;

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
        <div class="flex flex-col h-full">
            <Show when={loading() == "yes"}>
                <div class="w-full h-full items-center justify-center flex">
                    <span class="loading loading-spinner loading-lg" />
                </div>
            </Show>

            <Show when={loading() == "no"}>
                <BoardContext.Provider value={store}>
                    <BoardNavContext.Provider value={boardNavStore}>
                        <BoardNavbar />
                        <div class="flex-1 overflow-auto">{props.children}</div>
                        <Show when={boardNavStore[0].createTask}>
                            {_ => (
                                <div class="fixed inset-0 h-screen w-screen flex items-center justify-center">
                                    <TaskForm />
                                </div>
                            )}
                        </Show>
                    </BoardNavContext.Provider>
                </BoardContext.Provider>
            </Show>
        </div>
    );
}
