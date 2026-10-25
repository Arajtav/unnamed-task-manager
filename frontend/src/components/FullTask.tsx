import { createStore } from "solid-js/store";
import { createEffect, createSignal, Show } from "solid-js";
import { gqlClient } from "../graphql";
import { gql } from "@urql/core";
import { handleAuthError } from "../auth";
import { useAlert } from "../contexts/alertContext";
import TaskDetails from "./TaskDetails";
import TaskEditForm from "./TaskEditForm";
import TimeEditForm from "./TimeEditForm";
import { useAppData } from "../contexts/appDataContext";
import {
    CompleteTask,
    CompleteTaskRaw,
    processCompleteTask,
    processTimeTrackingEntry,
    TimeTrackingEntry,
    TimeTrackingEntryRaw,
} from "../gqlTypes";
import { CircleXIcon } from "lucide-solid";

export default function FullTask(props: { id: number; setId: (id: number | null) => any }) {
    const { addAlert } = useAlert();
    const [appData] = useAppData();

    const [task, setTask] = createStore({} as { task: CompleteTask; time: TimeTrackingEntry[] });
    const [loading, setLoading] = createSignal(true);
    const [editing, setEditing] = createSignal(false);
    const [timeLogging, setTimeLogging] = createSignal(false);

    createEffect(async () => {
        const result = await gqlClient.query<{
            task: CompleteTaskRaw;
            timeEntries: TimeTrackingEntryRaw[];
        }>(
            gql`
                query TaskAndTimeEntries($userId: UUID!, $taskId: Int!) {
                    task(id: $taskId) {
                        id
                        title
                        createdAt
                        description
                        author {
                            email
                            user {
                                id
                                handle
                            }
                        }
                        status
                        assignees {
                            email {
                                email
                                user {
                                    id
                                    handle
                                }
                            }
                        }
                        timeLogged {
                            time
                            user {
                                id
                                handle
                                emails
                            }
                        }
                        archivedAt
                        blockedBy {
                            id
                            title
                            status
                            archivedAt
                        }
                        labels
                        priority
                    }
                    timeEntries(userId: $userId, taskId: $taskId) {
                        id
                        startedAt
                        finishedAt
                        description
                    }
                }
            `,
            { taskId: props.id, userId: appData.me.id },
            // I guess if cache is available it should be used while this loads in the background.
            { requestPolicy: "network-only" }
        );

        if (handleAuthError(result.error)) {
            addAlert({
                type: "error",
                title: "Could not load task",
                content: "Try again later.",
                icon: CircleXIcon,
            });
            return;
        }

        const task = result.data!.task;
        const time = result.data!.timeEntries.map(time => processTimeTrackingEntry(time));

        setTask({
            task: processCompleteTask(task),
            time,
        });
        setLoading(false);
    });

    return (
        <dialog open class="modal">
            <Show
                when={!loading()}
                fallback={
                    <span class="loading loading-spinner loading-lg row-start-1 col-start-1" />
                }
            >
                <Show
                    when={editing()}
                    fallback={
                        <Show
                            when={timeLogging()}
                            fallback={
                                <div class="modal-box">
                                    <TaskDetails
                                        task={task.task}
                                        save={setTask}
                                        onEdit={() => setEditing(true)}
                                        onClose={() => props.setId(null)}
                                        onLogTime={() => setTimeLogging(true)}
                                    />
                                </div>
                            }
                        >
                            <TimeEditForm
                                time={task.time}
                                taskId={task.task.id}
                                save={setTask}
                                onCancel={() => setTimeLogging(false)}
                            />
                        </Show>
                    }
                >
                    <TaskEditForm
                        task={task.task}
                        onSaved={updated => {
                            setTask("task", updated);
                            setEditing(false);
                        }}
                        onCancel={() => setEditing(false)}
                    />
                </Show>
            </Show>

            <div class="modal-backdrop" onClick={() => props.setId(null)} />
        </dialog>
    );
}
