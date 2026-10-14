import { createSignal, For } from "solid-js";
import { useAlert } from "../contexts/alertContext";
import { Task, TimeEntry } from "./FullTask";
import { format } from "date-fns";
import { gqlClient } from "../graphql";
import { gql } from "@urql/core";
import { handleAuthError } from "../auth";
import { SetStoreFunction } from "solid-js/store";
import { useBoard } from "../contexts/boardContext";

export default function TimeEditForm(props: {
    time: TimeEntry[];
    taskId: number;
    save: SetStoreFunction<{
        task: Task;
        time: TimeEntry[];
    }>;
    onCancel: () => void;
}) {
    const { addAlert } = useAlert();
    const [_, setBoard] = useBoard();

    const [startedAt, setStartedAt] = createSignal(Date.now());
    const [finishedAt, setFinishedAt] = createSignal(Date.now());
    const [description, setDescription] = createSignal("");

    async function submit(e: SubmitEvent) {
        e.preventDefault();

        // TODO: fetch task too for time logged update
        const result = await gqlClient.mutation<{
            createTimeTrackingEntry: Replace<
                Replace<TimeEntry, "startedAt", string>,
                "finishedAt",
                string
            > & { task: Pick<Task, "timeLogged"> };
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
                startedAt: new Date(startedAt()).toISOString(),
                finishedAt: new Date(finishedAt()).toISOString(),
                description: description(),
            }
        );

        if (handleAuthError(result.error)) {
            addAlert("Failed to add entry", "error");
            return;
        }

        const entry = result.data!.createTimeTrackingEntry;

        props.save("time", e => [
            ...e,
            {
                ...entry,
                startedAt: new Date(entry.startedAt),
                finishedAt: new Date(entry.finishedAt),
            },
        ]);
        props.save("task", "timeLogged", entry.task.timeLogged);
        setBoard("tasks", task => task.id == props.taskId, "timeLogged", entry.task.timeLogged);
    }

    return (
        <div class="card bg-base-100 border border-base-200 w-full max-w-sm shrink-0 row-start-1 col-start-1">
            <div class="card-body">
                <h2 class="card-title">Time entries</h2>

                <For each={props.time}>
                    {e => (
                        <div class="flex flex-col">
                            <div class="flex flex-row">
                                <div class="flex-1">Start time</div>
                                <div>{e.startedAt.toISOString()}</div>
                            </div>
                            <div class="flex flex-row">
                                <div class="flex-1">End time</div>
                                <div>{e.finishedAt.toISOString()}</div>
                            </div>
                            <div class="flex flex-col">
                                <div>Description:</div>
                                <div>{e.description}</div>
                            </div>
                        </div>
                    )}
                </For>

                <form class="flex flex-col" onSubmit={submit}>
                    <h3>Add Time Entry</h3>
                    <div class="flex flex-row">
                        <label class="flex-1">Start Time</label>
                        <input
                            type="datetime-local"
                            value={format(startedAt(), "yyyy-MM-dd'T'HH:mm")}
                            onInput={e => setStartedAt(new Date(e.target.value).getTime())}
                        />
                    </div>
                    <div class="flex flex-row">
                        <label class="flex-1">End Time</label>
                        <input
                            type="datetime-local"
                            value={format(finishedAt(), "yyyy-MM-dd'T'HH:mm")}
                            onInput={e => setFinishedAt(new Date(e.target.value).getTime())}
                        />
                    </div>
                    <div class="flex flex-col">
                        <label>Description:</label>
                        <textarea
                            placeholder="What did you work on?"
                            value={description()}
                            onInput={e => setDescription(e.target.value)}
                        />
                    </div>
                    <button type="submit">Add Entry</button>
                </form>
            </div>
        </div>
    );
}
