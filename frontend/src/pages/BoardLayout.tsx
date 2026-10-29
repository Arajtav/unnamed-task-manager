import { createEffect, createSignal, on, Show } from "solid-js";
import { RouteSectionProps, useParams } from "@solidjs/router";
import { handleAuthError } from "../auth";
import BoardNavbar from "../components/BoardNavbar";
import { createStore } from "solid-js/store";
import { gqlClient } from "../graphql";
import { gql } from "@urql/core";
import { BoardContext } from "../contexts/boardContext";
import { useAlert } from "../contexts/alertContext";
import { BoardNavContext, BoardNavSettings } from "../contexts/boardNavContext";
import { Title } from "@solidjs/meta";
import { FullBoard, FullBoardRaw, processFullBoard } from "../gqlTypes";
import { CircleXIcon, SearchXIcon } from "lucide-solid";

export default function BoardLayout(props: RouteSectionProps) {
    const params = useParams<{ id: string }>();
    const { addAlert } = useAlert();

    const [fullBoard, setFullBoard] = createStore({} as FullBoard);
    const [loading, setLoading] = createSignal<"yes" | "no" | "error">("yes");

    const bnDefault = { createTask: "", search: "archived:false" };
    const [boardNav, setBoardNav] = createStore<BoardNavSettings>({ ...bnDefault });

    // Actually when going to settings createTask should close to false TODO.
    createEffect(
        on(
            () => params.id,
            rawId => {
                const id = Number(rawId);

                setBoardNav({ ...bnDefault });
                setLoading("yes");

                fetchBoard(id).catch(console.error);
            }
        )
    );

    async function fetchBoard(id: number) {
        const result = await gqlClient.query<{
            board?: FullBoardRaw;
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
                            assignees {
                                email
                                user {
                                    id
                                    handle
                                }
                            }
                            timeLogged {
                                time
                            }
                            archivedAt
                            isBlocked
                            labels
                            priority
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
            addAlert({
                type: "error",
                title: "Something went wrong",
                content: "Try again later.",
                icon: CircleXIcon,
            });
            setLoading("error");
            return;
        }

        const board = result.data!.board;

        if (!board) {
            addAlert({
                type: "error",
                title: "Board not found",
                content: "Are you sure this board exists?",
                icon: SearchXIcon,
            });
            setLoading("error");
            return;
        }

        setFullBoard(processFullBoard(board));
        setLoading("no");
    }

    return (
        <div class="flex flex-col h-full">
            <Show when={loading() == "error"}>
                <Title>Something went wrong</Title>
            </Show>

            <Show when={loading() == "yes"}>
                <div class="w-full h-full items-center justify-center flex">
                    <span class="loading loading-spinner loading-lg" />
                </div>
            </Show>

            <Show when={loading() == "no"}>
                <BoardContext.Provider value={[fullBoard, setFullBoard]}>
                    <BoardNavContext.Provider value={[boardNav, setBoardNav]}>
                        <BoardNavbar />
                        <div class="flex-1 overflow-auto">{props.children}</div>
                    </BoardNavContext.Provider>
                </BoardContext.Provider>
            </Show>
        </div>
    );
}
