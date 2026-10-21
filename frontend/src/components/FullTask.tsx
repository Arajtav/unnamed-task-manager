import { createStore } from "solid-js/store";
import { createEffect, createSignal, Show } from "solid-js";
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
    archivedAt: Date | null;
    timeLogged: {
        time: number;
        user: {
            id: string;
            handle: string | null;
            emails: string[];
        } | null;
    }[];
    blockedBy: { id: number; title: string; status: string; archivedAt: Date | null }[];
    labels: string[];
};

export type TaskRaw = Replace<
    Replace<
        Replace<
            Task,
            "blockedBy",
            Replace<Task["blockedBy"][number], "archivedAt", string | null>[]
        >,
        "archivedAt",
        string | null
    >,
    "createdAt",
    string
>;

export type TimeEntry = {
    id: number;
    startedAt: Date;
    finishedAt: Date;
    description: string;
};

export type TimeEntryRaw = Replace<Replace<TimeEntry, "startedAt", string>, "finishedAt", string>;

export default function FullTask(props: { id: number; setId: (id: number | null) => any }) {
    const { addAlert } = useAlert();
    const [appData] = useAppData();

    const [task, setTask] = createStore({} as { task: Task; time: TimeEntry[] });
    const [loading, setLoading] = createSignal(true);
    const [editing, setEditing] = createSignal(false);
    const [timeLogging, setTimeLogging] = createSignal(false);

    createEffect(async () => {
        const result = await gqlClient.query<{
            task: TaskRaw;
            timeEntries: TimeEntryRaw[];
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
                        archivedAt
                        blockedBy {
                            id
                            title
                            status
                            archivedAt
                        }
                        labels
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
            task: {
                ...task,
                createdAt: new Date(task.createdAt),
                archivedAt: task.archivedAt === null ? null : new Date(task.archivedAt),
                blockedBy: task.blockedBy.map(b => ({
                    ...b,
                    archivedAt: b.archivedAt === null ? null : new Date(b.archivedAt),
                })),
            },
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
