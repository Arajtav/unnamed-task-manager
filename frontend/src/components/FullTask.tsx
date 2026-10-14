import { createStore } from "solid-js/store";
import { createEffect, createSignal, Setter, Show } from "solid-js";
import { gqlClient } from "../graphql";
import { gql } from "@urql/core";
import { handleAuthError } from "../auth";
import { UserFromEmail } from "../contexts/boardContext";
import { useAlert } from "../contexts/alertContext";
import TaskDetails from "./TaskDetails";
import TaskEditForm from "./TaskEditForm";
import TimeEditForm from "./TimeEditForm";
import { useAppData } from "../contexts/appDataContext";

export type Task = {
    id: number;
    title: string;
    description: string;
    createdAt: Date;
    author: UserFromEmail;
    status: string;
    assignee?: UserFromEmail;
    isArchived: boolean;
    timeLogged: {
        time: number;
        user: {
            id: string;
            handle: string | null;
            emails: string[];
        } | null;
    }[];
};

export type TimeEntry = {
    id: number;
    startedAt: Date;
    finishedAt: Date;
    description: string;
};

export default function FullTask({ id, setId }: { id: number; setId: Setter<number | null> }) {
    const { addAlert } = useAlert();
    const [{ me }] = useAppData();

    const [task, setTask] = createStore({} as { task: Task; time: TimeEntry[] });
    const [loading, setLoading] = createSignal(true);
    const [editing, setEditing] = createSignal(false);
    const [timeLogging, setTimeLogging] = createSignal(false);

    createEffect(async () => {
        const result = await gqlClient.query<{
            task: Replace<Task, "createdAt", string>;
            timeEntries: Replace<Replace<TimeEntry, "startedAt", string>, "finishedAt", string>[];
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
                        assignee {
                            email
                            user {
                                id
                                handle
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
                        isArchived
                    }
                    timeEntries(userId: $userId, taskId: $taskId) {
                        id
                        startedAt
                        finishedAt
                        description
                    }
                }
            `,
            { taskId: id, userId: me.id },
            // I guess if cache is available it should be used while this loads in the background.
            { requestPolicy: "network-only" }
        );

        if (handleAuthError(result.error)) {
            addAlert("Failed to load task", "error");
            return;
        }

        const task = result.data!.task;
        const time = result.data!.timeEntries.map(time => ({
            ...time,
            startedAt: new Date(time.startedAt),
            finishedAt: new Date(time.finishedAt),
        }));

        setTask({
            task: { ...task, createdAt: new Date(task.createdAt) },
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
                                        onEdit={() => setEditing(true)}
                                        onClose={() => setId(null)}
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

            <div class="modal-backdrop" onClick={() => setId(null)} />
        </dialog>
    );
}
