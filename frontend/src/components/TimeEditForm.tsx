import { For, Show } from "solid-js";
import { useAlert } from "../contexts/alertContext";
import { format } from "date-fns";
import { gqlClient } from "../graphql";
import { gql } from "@urql/core";
import { handleAuthError } from "../auth";
import { createStore, SetStoreFunction } from "solid-js/store";
import { useBoard } from "../contexts/boardContext";
import { useModal } from "../contexts/modalContext";
import { newValueOrUndefined } from "./TaskEditForm";
import DateTime from "./DateTime";
import { useTimeTracking } from "../contexts/clientAppDataContext";
import { CompleteTask, processTimeTrackingEntry, TimeTrackingEntry, TimeTrackingEntryRaw, TimeLogged } from "../gqlTypes";
import { CircleCheckIcon, CircleXIcon } from "lucide-solid";

export default function TimeEditForm(props: {
    time: TimeTrackingEntry[];
    taskId: number;
    save: SetStoreFunction<{
        task: CompleteTask;
        time: TimeTrackingEntry[];
    }>;
    onCancel: () => void;
}) {
    const { addAlert } = useAlert();
    const { openModal } = useModal();
    const [_, setBoard] = useBoard();
    const timeTracking = useTimeTracking();

    const [edited, setEdited] = createStore<{
        id: number | null;
        startedAt: Date;
        finishedAt: Date;
        description: string;
    }>({
        id: null,
        startedAt: new Date(),
        finishedAt: new Date(),
        description: "",
    });

    function startEdit(entry: TimeTrackingEntry) {
        setEdited({
            id: entry.id,
            startedAt: new Date(entry.startedAt),
            finishedAt: new Date(entry.finishedAt),
            description: entry.description,
        });
    }

    function cancelEdit() {
        setEdited({
            id: null,
            startedAt: new Date(),
            finishedAt: new Date(),
            description: "",
        });
    }

    async function deleteEntry(entryId: number) {
        const result = await gqlClient.mutation<{
            removeTaskTimeTrackingEntry: { timeLogged: TimeLogged | null };
        }>(
            gql`
                mutation RemoveTaskTimeTrackingEntry($taskId: Int!, $id: Int!) {
                    removeTaskTimeTrackingEntry(taskId: $taskId, id: $id) {
                        timeLogged {
                            time
                            user {
                                id
                                handle
                                emails
                            }
                        }
                    }
                }
            `,
            { taskId: props.taskId, id: entryId }
        );

        const timeLogged = result.data?.removeTaskTimeTrackingEntry?.timeLogged;

        if (handleAuthError(result.error) || !timeLogged) {
            addAlert({
                type: "error",
                title: "Failed to delete time entry",
                content: "Try again later.",
                icon: CircleXIcon,
            });
            return;
        }

        props.save("time", e => e.filter(item => item.id != entryId));
        props.save("task", "timeLogged", timeLogged);
        setBoard("tasks", task => task.id == props.taskId, "timeLogged", timeLogged);

        if (edited.id == entryId) {
            cancelEdit();
        }

        addAlert({
            type: "normal",
            title: "Time entry deleted",
            content: "Successfully deleted time entry",
            icon: CircleCheckIcon,
        });
    }

    async function create(startedAt: Date, finishedAt: Date, description: string) {
        const fields = {
            startedAt,
            finishedAt,
            description,
        };

        const result = await gqlClient.mutation<{
            createTimeTrackingEntry: TimeTrackingEntryRaw & { task: { timeLogged: TimeLogged } };
        }>(
            gql`
                mutation CreateTimeTrackingEntry(
                    $taskId: Int!
                    $startedAt: DateTime!
                    $finishedAt: DateTime!
                    $description: String!
                ) {
                    createTimeTrackingEntry(
                        taskId: $taskId
                        startedAt: $startedAt
                        finishedAt: $finishedAt
                        description: $description
                    ) {
                        id
                        startedAt
                        finishedAt
                        description
                        task {
                            timeLogged {
                                time
                                user {
                                    id
                                    handle
                                    emails
                                }
                            }
                        }
                    }
                }
            `,
            {
                taskId: props.taskId,
                ...fields,
            }
        );

        if (handleAuthError(result.error) || !result.data?.createTimeTrackingEntry) {
            addAlert({
                type: "error",
                title: "Failed to log time",
                content: "Try again later.",
                icon: CircleXIcon,
            });
            return false;
        }

        const entry = result.data.createTimeTrackingEntry;

        props.save("time", e => [...e, processTimeTrackingEntry(entry)]);

        props.save("task", "timeLogged", entry.task.timeLogged);
        setBoard("tasks", task => task.id == props.taskId, "timeLogged", entry.task.timeLogged);

        addAlert({
            type: "normal",
            title: "Time logged",
            content: "Time entry added",
            icon: CircleCheckIcon,
        });
        return true;
    }

    async function submit(e: SubmitEvent) {
        e.preventDefault();

        if (edited.id == null) {
            if (await create(edited.startedAt, edited.finishedAt, edited.description)) {
                cancelEdit();
            }
        } else {
            const originalEntry = props.time.find(item => item.id == edited.id);

            const fields = {
                startedAt: newValueOrUndefined(
                    edited.startedAt.toISOString(),
                    originalEntry ? new Date(originalEntry.startedAt).toISOString() : ""
                ),
                finishedAt: newValueOrUndefined(
                    edited.finishedAt.toISOString(),
                    originalEntry ? new Date(originalEntry.finishedAt).toISOString() : ""
                ),
                description: newValueOrUndefined(
                    edited.description,
                    originalEntry ? originalEntry.description : ""
                ),
            };

            if (Object.values(fields).every(value => value === undefined)) {
                cancelEdit();
                return;
            }

            const result = await gqlClient.mutation<{
                updateTimeTrackingEntry: {
                    id: number;
                    startedAt: string;
                    finishedAt: string;
                    description: string;
                    task: { timeLogged: TimeLogged };
                };
            }>(
                gql`
                    mutation UpdateTimeTrackingEntry(
                        $id: Int!
                        $startedAt: DateTime
                        $finishedAt: DateTime
                        $description: String
                    ) {
                        updateTimeTrackingEntry(
                            id: $id
                            startedAt: $startedAt
                            finishedAt: $finishedAt
                            description: $description
                        ) {
                            id
                            startedAt
                            finishedAt
                            description
                            task {
                                timeLogged {
                                    time
                                    user {
                                        id
                                        handle
                                        emails
                                    }
                                }
                            }
                        }
                    }
                `,
                {
                    id: edited.id,
                    ...fields,
                }
            );

            if (handleAuthError(result.error) || !result.data?.updateTimeTrackingEntry) {
                addAlert({
                    type: "error",
                    title: "Failed to update time",
                    content: "Try again later.",
                    icon: CircleXIcon,
                });
                return;
            }

            const entry = result.data.updateTimeTrackingEntry;

            props.save("time", e => e.id == entry.id, processTimeTrackingEntry(entry));
            props.save("task", "timeLogged", entry.task.timeLogged);
            setBoard("tasks", task => task.id == props.taskId, "timeLogged", entry.task.timeLogged);

            addAlert({
                type: "normal",
                title: "Time updated",
                content: "Time entry updated",
                icon: CircleCheckIcon,
            });
            cancelEdit();
        }
    }

    return (
        <div class="card bg-base-100 border border-base-200 w-full max-w-sm shrink-0 row-start-1 col-start-1">
            <div class="card-body">
                <h2 class="card-title">Time entries</h2>

                <div class="max-h-[50vh] overflow-y-auto flex flex-col gap-2 pr-1">
                    <For each={props.time}>
                        {e => (
                            <div class="flex flex-col border-b border-base-200 pb-2 mb-2 gap-2">
                                <div class="flex flex-row">
                                    <div class="flex-1">Start time</div>
                                    <DateTime datetime={e.startedAt} />
                                </div>
                                <div class="flex flex-row">
                                    <div class="flex-1">End time</div>
                                    <DateTime datetime={e.finishedAt} />
                                </div>
                                <div class="flex flex-col">
                                    <div>Description:</div>
                                    <div>{e.description}</div>
                                </div>
                                <div class="flex flex-row gap-2 justify-end">
                                    <div
                                        class="btn btn-warning btn-sm"
                                        onClick={() => startEdit(e)}
                                    >
                                        Edit
                                    </div>
                                    <div
                                        class="btn btn-error btn-sm"
                                        onClick={() =>
                                            openModal({
                                                title: "Are you sure?",
                                                content: (
                                                    <p>
                                                        Are you sure you want to delete this time
                                                        entry?
                                                    </p>
                                                ),
                                                buttons: [
                                                    {
                                                        label: "No",
                                                        class: "btn-primary",
                                                    },
                                                    {
                                                        label: "Yes",
                                                        class: "btn-error",
                                                        onClick: () => deleteEntry(e.id),
                                                    },
                                                ],
                                            })
                                        }
                                    >
                                        Delete
                                    </div>
                                </div>
                            </div>
                        )}
                    </For>
                </div>

                <form class="flex flex-col mt-4 gap-2" onSubmit={submit}>
                    <div class="flex items-center justify-between">
                        <h3>{edited.id != null ? "Edit Time Entry" : "Add Time Entry"}</h3>
                        <Show when={edited.id != null}>
                            <button type="button" class="btn btn-ghost btn-xs" onClick={cancelEdit}>
                                Cancel
                            </button>
                        </Show>
                    </div>
                    <div class="flex flex-row">
                        <label class="flex-1">Start Time</label>
                        <input
                            type="datetime-local"
                            value={format(edited.startedAt, "yyyy-MM-dd'T'HH:mm")}
                            onInput={e => setEdited("startedAt", new Date(e.target.value))}
                        />
                    </div>
                    <div class="flex flex-row">
                        <label class="flex-1">End Time</label>
                        <input
                            type="datetime-local"
                            value={format(edited.finishedAt, "yyyy-MM-dd'T'HH:mm")}
                            onInput={e => setEdited("finishedAt", new Date(e.target.value))}
                        />
                    </div>
                    <div class="flex flex-col">
                        <label>Description:</label>
                        <textarea
                            placeholder="What did you work on?"
                            value={edited.description}
                            onInput={e => setEdited("description", e.target.value)}
                        />
                    </div>
                    <button type="submit" class="btn btn-primary mt-2">
                        {edited.id != null ? "Save Changes" : "Add Entry"}
                    </button>
                </form>
                <div class="divider" />
                <Show
                    when={!timeTracking.isTracking(props.taskId)}
                    fallback={
                        <div class="flex flex-row gap-2">
                            <button
                                class="btn btn-primary flex-1"
                                onClick={async () => {
                                    let descr = prompt("Description");
                                    if (descr === null) return;

                                    const startedAt = timeTracking.startedAt(props.taskId)!;

                                    if (await create(startedAt, new Date(), descr)) {
                                        timeTracking.clear(props.taskId);
                                    }
                                }}
                            >
                                Stop tracking
                            </button>
                            <button
                                class="btn btn-warning"
                                onClick={() =>
                                    openModal({
                                        title: "Are you sure?",
                                        content: (
                                            <p>Are you sure you want to cancel this session?</p>
                                        ),
                                        buttons: [
                                            {
                                                label: "No",
                                                class: "btn-primary",
                                            },
                                            {
                                                label: "Yes",
                                                class: "btn-error",
                                                onClick: () => timeTracking.clear(props.taskId),
                                            },
                                        ],
                                    })
                                }
                            >
                                Cancel
                            </button>
                        </div>
                    }
                >
                    <button
                        class="btn btn-primary"
                        onClick={() => timeTracking.start(props.taskId)}
                    >
                        Start tracking
                    </button>
                </Show>
            </div>
        </div>
    );
}
