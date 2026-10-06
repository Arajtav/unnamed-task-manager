import { createStore } from "solid-js/store";
import { createEffect, createSignal, Setter, Show } from "solid-js";
import { gqlClient } from "../graphql";
import { gql } from "@urql/core";
import { handleAuthError } from "../auth";
import { UserFromEmail } from "../contexts/boardContext";
import { useAlert } from "../contexts/alertContext";
import TaskDetails from "./TaskDetails";
import TaskEditForm from "./TaskEditForm";

export type Task = {
    id: number;
    title: string;
    description: string;
    createdAt: Date;
    author: UserFromEmail;
    status: string;
    assignee?: UserFromEmail;
    isArchived: boolean;
};

export default function FullTask({ id, setId }: { id: number; setId: Setter<number | null> }) {
    const { addAlert } = useAlert();

    const [task, setTask] = createStore({} as Task);
    const [loading, setLoading] = createSignal(true);
    const [editing, setEditing] = createSignal(false);

    createEffect(async () => {
        const result = await gqlClient.query<{
            task: Omit<Task, "createdAt"> & {
                createdAt: string;
            };
        }>(
            gql`
                query Task($id: Int!) {
                    task(id: $id) {
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
                        isArchived
                    }
                }
            `,
            { id },
            // I guess if cache is available it should be used while this loads in the background.
            { requestPolicy: "network-only" },
        );

        if (handleAuthError(result.error)) {
            addAlert("Failed to load task", "error");
            return;
        }

        const task = result.data!.task;

        setTask({ ...task, createdAt: new Date(task.createdAt) });
        setLoading(false);
    });

    return (
        <dialog open class="modal">
            <Show
                when={!loading()}
                fallback={<span class="loading loading-spinner loading-lg row-start-1 col-start-1" />}
            >
                <Show
                    when={editing()}
                    fallback={
                        <div class="modal-box">
                            <TaskDetails task={task} onEdit={() => setEditing(true)} onClose={() => setId(null)} />
                        </div>
                    }
                >
                    <TaskEditForm
                        task={task}
                        onSaved={(updated) => {
                            setTask(updated);
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
