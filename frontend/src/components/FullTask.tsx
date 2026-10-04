import { createStore } from "solid-js/store";
import { createEffect, createSignal, Setter, Show } from "solid-js";
import { gqlClient } from "../graphql";
import { gql } from "@urql/core";
import { handleAuthError } from "../auth";
import { UserFromEmail } from "../contexts/boardContext";
import { useAlert } from "../contexts/alertContext";
import User from "../newComponents/User";

export type Task = {
    id: number;
    title: string;
    description: string;
    createdAt: Date;
    author: UserFromEmail;
    status: string;
    assignee?: UserFromEmail;
};

export default function FullTask({ id, setId }: { id: number; setId: Setter<number | null> }) {
    const { addAlert } = useAlert();

    const [task, setTask] = createStore({} as Task);
    const [loading, setLoading] = createSignal(true);

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
            { requestPolicy: "network-only" }
        );

        if (handleAuthError(result.error)) {
            addAlert("Failed to load task", "error");
            return;
        }

        const task = result.data!.task;

        setTask({ ...task, createdAt: new Date(task.createdAt) });
        setLoading(false);
    });

    // TODO: center the spinner
    return (
        <dialog open class="modal">
            <Show when={!loading()} fallback={<span class="loading loading-spinner loading-lg" />}>
                <div class="modal-box">
                    <h3 class="text-xl font-bold">{task.title}</h3>

                    <div class="divider" />

                    <div class="space-y-4">
                        <div>
                            <div class="text-sm font-semibold text-base-content/70">
                                Description
                            </div>
                            <p class="mt-1 whitespace-pre-wrap">
                                {task.description || "No description provided."}
                            </p>
                        </div>

                        <div>
                            <div class="text-sm font-semibold text-base-content/70">Author</div>
                            <User
                                user={{
                                    emails: [task.author.email],
                                    handle: task.author.user?.handle,
                                }}
                            />
                        </div>

                        <div>
                            <div class="text-sm font-semibold text-base-content/70">
                                Assigned to
                            </div>
                            <div>
                                <Show
                                    when={task.assignee}
                                    fallback={<p class="mt-2">No one</p>}
                                >
                                    {assignee => (
                                        <>
                                            <User
                                                user={{
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
                    </div>

                    <div class="modal-action">
                        <button class="btn btn-neutral" onClick={() => setId(null)}>
                            Close
                        </button>
                    </div>
                </div>
            </Show>

            <div class="modal-backdrop" onClick={() => setId(null)} />
        </dialog>
    );
}

// TODO: Do not allow editing when the task is archived.
