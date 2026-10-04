import { gql } from "@urql/core";
import { useAlert } from "../contexts/alertContext";
import { TaskStatus, useBoard } from "../contexts/boardContext";
import { gqlClient } from "../graphql";
import { createSignal, For, Show } from "solid-js";
import { GripVerticalIcon, PencilIcon } from "lucide-solid";

// TODO: Block everything with a spinner while stuff saves.
export default function TaskStatuses() {
    const [board, setBoard] = useBoard();
    const { addAlert } = useAlert();

    async function updateTaskStatus(
        name: string,
        changes: {
            newName?: string;
            color?: string;
            priority?: number;
        }
    ) {
        const result = await gqlClient.mutation<{
            updateTaskStatus: {
                taskStatus: TaskStatus[];
            };
        }>(
            gql`
                mutation UpdateTaskStatus(
                    $boardId: Int!
                    $name: String!
                    $newName: String
                    $color: String
                    $priority: Float
                ) {
                    updateTaskStatus(
                        boardId: $boardId
                        name: $name
                        newName: $newName
                        color: $color
                        priority: $priority
                    ) {
                        taskStatus {
                            name
                            priority
                            color
                        }
                    }
                }
            `,
            {
                boardId: board.id,
                name,
                newName: changes.newName,
                color: changes.color,
                priority: changes.priority,
            }
        );

        if (result.error) {
            addAlert("Failed to update task status.", "error");
            return false;
        }

        setBoard("taskStatus", result.data!.updateTaskStatus.taskStatus);
        return true;
    }

    async function moveStatus(from: number, to: number) {
        if (from == to) {
            return;
        }

        const statuses = [...board.taskStatus];
        const [moved] = statuses.splice(from, 1);

        const previous = statuses[to - 1];
        const next = statuses[to];

        let priority;

        if (previous && next) {
            priority = (previous.priority + next.priority) / 2;
        } else if (previous) {
            priority = previous.priority + 1;
        } else if (next) {
            priority = next.priority - 1;
        }

        await updateTaskStatus(moved.name, { priority });
    }

    async function setStatusColor(of: number, color: string) {
        const status = board.taskStatus[of]!;

        if (status.color == color) {
            return;
        }

        await updateTaskStatus(status.name, { color });
    }

    const [newStatusName, setNewStatusName] = createSignal("");
    const [newStatusColor, setNewStatusColor] = createSignal("#000000");
    const [addingStatus, setAddingStatus] = createSignal(false);

    async function addTaskStatus() {
        const statuses = board.taskStatus;
        const last = statuses[statuses.length - 1];

        const priority = last ? last.priority + 1 : 0;

        setAddingStatus(true);

        const result = await gqlClient.mutation<{
            addTaskStatus: {
                taskStatus: TaskStatus[];
            };
        }>(
            gql`
                mutation AddTaskStatus(
                    $boardId: Int!
                    $name: String!
                    $color: String!
                    $priority: Float!
                ) {
                    addTaskStatus(
                        boardId: $boardId
                        name: $name
                        color: $color
                        priority: $priority
                    ) {
                        taskStatus {
                            name
                            priority
                            color
                        }
                    }
                }
            `,
            {
                boardId: board.id,
                name: newStatusName().trim(),
                color: newStatusColor(),
                priority,
            }
        );

        if (result.error) {
            addAlert("Failed to add task status.", "error");
        } else {
            setNewStatusName("");
            setBoard("taskStatus", result.data!.addTaskStatus.taskStatus);
        }

        setAddingStatus(false);
    }

    return (
        <fieldset class="fieldset bg-base-200 border-base-300 w-xs border p-4">
            <legend class="fieldset-legend">Task statuses</legend>

            <Show
                when={board.taskStatus.length > 0}
                fallback={
                    <div class="alert alert-error">
                        <span>No task statuses configured.</span>
                    </div>
                }
            >
                <ul class="list bg-base-100 rounded-box">
                    <For each={board.taskStatus}>
                        {(status, index) => (
                            <li
                                class="list-row"
                                onDragOver={e => {
                                    e.preventDefault();
                                }}
                                onDrop={e => {
                                    e.preventDefault();

                                    // TODO: I do not like that at all.
                                    const from = Number(e.dataTransfer!.getData("text/plain"));

                                    moveStatus(from, index());
                                }}
                            >
                                <div
                                    class="cursor-grab active:cursor-grabbing self-center"
                                    draggable="true"
                                    onDragStart={e => {
                                        e.stopPropagation();
                                        e.dataTransfer!.setData("text/plain", String(index()));
                                    }}
                                >
                                    <GripVerticalIcon strokeWidth={1.5} />
                                </div>

                                <label
                                    class="size-6 cursor-pointer rounded-full self-center"
                                    style={{ "background-color": status.color }}
                                >
                                    <input
                                        type="color"
                                        value={status.color}
                                        class="size-0 opacity-0"
                                        onInput={e =>
                                            setStatusColor(index(), e.currentTarget.value)
                                        }
                                    />
                                </label>

                                <div class="self-center flex-1">{status.name}</div>

                                <button
                                    class="btn btn-square btn-ghost"
                                    onClick={async () => {
                                        const newName = prompt(
                                            "New status name",
                                            status.name
                                        )?.trim();

                                        if (newName) {
                                            await updateTaskStatus(status.name, {
                                                newName,
                                            });
                                        }
                                    }}
                                >
                                    <PencilIcon strokeWidth={1.5} />
                                </button>
                            </li>
                        )}
                    </For>
                </ul>
            </Show>

            <div class="join mt-4">
                <label
                    class="aspect-square h-full cursor-pointer"
                    style={{ "background-color": newStatusColor() }}
                >
                    <input
                        type="color"
                        value={newStatusColor()}
                        class="size-0 opacity-0"
                        onInput={e => setNewStatusColor(e.currentTarget.value)}
                        disabled={addingStatus()}
                    />
                </label>

                <input
                    type="text"
                    class="input join-item"
                    placeholder="New status"
                    required
                    value={newStatusName()}
                    onInput={e => setNewStatusName(e.currentTarget.value)}
                    disabled={addingStatus()}
                />

                <button
                    class="btn btn-primary join-item"
                    onClick={addTaskStatus}
                    disabled={addingStatus() || !newStatusName().trim()}
                >
                    {addingStatus() ? "Adding..." : "Add"}
                </button>
            </div>
        </fieldset>
    );
}
