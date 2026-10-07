import { createSignal, For, Setter, Show } from "solid-js";
import FullTask from "../components/FullTask";
import { Task, useBoard } from "../contexts/boardContext";
import { useBoardNav } from "../contexts/boardNavContext";
import TaskColumn from "../components/TaskColumn";
import { gqlClient } from "../graphql";
import { gql } from "@urql/core";
import { handleAuthError } from "../auth";
import { useAlert } from "../contexts/alertContext";

export default function Board() {
    const [board, setBoard] = useBoard();
    const [boardNav] = useBoardNav();
    const { addAlert } = useAlert();

    const [viewTask, setViewTask] = createSignal<number | null>(null);

    async function moveTask(taskId: number, status: string) {
        let task = board.tasks.find(task => task.id == taskId);

        if (!task || task.status == status || task.isArchived) {
            return;
        }

        const result = await gqlClient.mutation<{
            updateTask: Replace<Task, "createdAt", string>;
        }>(
            gql`
                mutation UpdateTask($id: Int!, $status: String) {
                    updateTask(id: $id, status: $status) {
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
                }
            `,
            {
                id: task.id,
                status,
            }
        );

        if (handleAuthError(result.error)) {
            addAlert("Failed to move task", "error");
            return;
        }

        const updated = result.data!.updateTask;

        const saved = {
            ...updated,
            createdAt: new Date(updated.createdAt),
        };

        setBoard("tasks", task => task.id == saved.id, saved);
    }

    return (
        <>
            <div class="flex flex-row w-full h-auto gap-4 m-4">
                <For each={board.taskStatus}>
                    {status => (
                        <TaskColumn
                            status={status}
                            setViewTask={setViewTask as Setter<number>}
                            onMoveTask={moveTask}
                            tasks={board.tasks.filter(
                                task =>
                                    task.status == status.name &&
                                    (boardNav.showArchived || !task.isArchived)
                            )}
                        />
                    )}
                </For>
            </div>

            <Show when={viewTask() != null}>
                {_ => <FullTask id={viewTask()!} setId={setViewTask} />}
            </Show>
        </>
    );
}

// TODO: using clipboard api for this is terrible
