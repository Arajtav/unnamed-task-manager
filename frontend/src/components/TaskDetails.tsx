import { createSignal, For, Show } from "solid-js";
import User from "../newComponents/User";
import { Task, TimeEntry } from "./FullTask";
import { formatDuration } from "../format";
import { XIcon } from "lucide-solid";
import { useBoard } from "../contexts/boardContext";
import { gqlClient } from "../graphql";
import { gql } from "@urql/core";
import { handleAuthError } from "../auth";
import { useAlert } from "../contexts/alertContext";
import { SetStoreFunction } from "solid-js/store";

export default function TaskDetails(props: {
    task: Task;
    onEdit: () => void;
    onClose: () => void;
    onLogTime: () => void;
    save: SetStoreFunction<{
        task: Task;
        time: TimeEntry[];
    }>;
}) {
    const [{ tasks }] = useBoard();
    const { addAlert } = useAlert();
    const task = props.task;

    const [selectedTaskId, setSelectedTaskId] = createSignal("");

    async function block(by: number) {
        const result = await gqlClient.mutation<{
            addTaskBlock: Pick<Task, "blockedBy">;
        }>(
            gql`
                mutation AddTaskBlock($taskId: Int!, $blockedBy: Int!) {
                    addTaskBlock(taskId: $taskId, blockedBy: $blockedBy) {
                        blockedBy {
                            id
                            title
                            status
                            isArchived
                        }
                    }
                }
            `,
            { taskId: task.id, blockedBy: by }
        );

        if (handleAuthError(result.error) || !result.data) {
            addAlert("Failed to add task block", "error");
            return null;
        }

        const updated = result.data.addTaskBlock.blockedBy;

        props.save("task", "blockedBy", updated);
    }

    async function unblock(by: number) {
        const result = await gqlClient.mutation<{
            removeTaskBlock: Pick<Task, "blockedBy">;
        }>(
            gql`
                mutation RemoveTaskBlock($taskId: Int!, $blockedBy: Int!) {
                    removeTaskBlock(taskId: $taskId, blockedBy: $blockedBy) {
                        blockedBy {
                            id
                            title
                            status
                            isArchived
                        }
                    }
                }
            `,
            { taskId: task.id, blockedBy: by }
        );

        if (handleAuthError(result.error) || !result.data) {
            addAlert("Failed to add task block", "error");
            return null;
        }

        const updated = result.data.removeTaskBlock.blockedBy;

        props.save("task", "blockedBy", updated);
    }

    return (
        <>
            <h3 class="text-xl font-bold">{task.title}</h3>

            <div class="divider" />

            <div class="space-y-4">
                <div>
                    <div class="text-sm font-semibold text-base-content/70">Description</div>
                    <p class="mt-1 whitespace-pre-wrap">
                        {task.description || "No description provided."}
                    </p>
                </div>

                <div>
                    <div class="text-sm font-semibold text-base-content/70">Author</div>
                    <User
                        user={{
                            id: task.author.user?.id,
                            emails: [task.author.email],
                            handle: task.author.user?.handle,
                        }}
                    />
                </div>

                <div>
                    <div class="text-sm font-semibold text-base-content/70">Assigned to</div>
                    <div>
                        <Show when={task.assignee} fallback={<p class="mt-2">No one</p>}>
                            {assignee => (
                                <>
                                    <User
                                        user={{
                                            id: assignee().user?.id,
                                            emails: [assignee().email],
                                            handle: assignee().user?.handle,
                                        }}
                                    />
                                </>
                            )}
                        </Show>
                    </div>
                </div>

                <div>
                    <div class="text-sm font-semibold text-base-content/70">Status</div>
                    <div class="mt-1">{task.status}</div>
                </div>

                <div>
                    <div class="text-sm font-semibold text-base-content/70">Created</div>
                    <div class="mt-1">{task.createdAt.toLocaleString()}</div>
                </div>

                <div>
                    <div class="text-sm font-semibold text-base-content/70">Blocked by</div>
                    <ul class="mt-1 list bg-base-100 rounded-box mb-4">
                        <For each={task.blockedBy}>
                            {taskBlock => (
                                <li class="list-row">
                                    <div class="list-col-grow">{taskBlock.title}</div>

                                    <div></div>

                                    <button
                                        class="btn btn-square btn-ghost"
                                        onClick={() => unblock(taskBlock.id)}
                                    >
                                        <XIcon strokeWidth={1.5} />
                                    </button>
                                </li>
                            )}
                        </For>
                    </ul>
                    <div class="flex gap-2 items-center w-full">
                        <select
                            class="select flex-1"
                            value={selectedTaskId()}
                            onInput={e => setSelectedTaskId(e.currentTarget.value)}
                        >
                            <option disabled selected value="">
                                Select a task...
                            </option>
                            <For
                                each={tasks.filter(
                                    t =>
                                        !t.isArchived &&
                                        t.id != task.id &&
                                        !task.blockedBy.some(b => b.id == t.id)
                                )}
                            >
                                {t => <option value={t.id}>{t.title}</option>}
                            </For>
                        </select>
                        <button
                            class="btn btn-accent"
                            onClick={() => {
                                block(Number(selectedTaskId()));
                                setSelectedTaskId("");
                            }}
                            disabled={selectedTaskId() == ""}
                        >
                            Add
                        </button>
                    </div>
                </div>

                <div>
                    <div class="text-sm font-semibold text-base-content/70">Time logged</div>
                    <div class="flex flex-col w-full mt-2">
                        <For each={task.timeLogged}>
                            {e => (
                                <div class="flex flex-row w-full">
                                    <div class="flex-1">
                                        <User user={e.user}></User>
                                    </div>
                                    <div class="self-center">{formatDuration(e.time)}</div>
                                </div>
                            )}
                        </For>
                    </div>
                </div>
            </div>

            <div class="flex flex-row gap-2">
                <div class="modal-action">
                    <button class="btn btn-primary" onClick={props.onEdit}>
                        Edit
                    </button>
                    <button class="btn btn-primary" onClick={props.onLogTime}>
                        Log time
                    </button>
                </div>
            </div>
        </>
    );
}
