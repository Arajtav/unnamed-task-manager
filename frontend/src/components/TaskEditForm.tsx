import { createEffect, createSignal, For, on } from "solid-js";
import { gqlClient } from "../graphql";
import { gql } from "@urql/core";
import { handleAuthError } from "../auth";
import { useMe } from "../contexts/meContext";
import { useBoard } from "../contexts/boardContext";
import { useAlert } from "../contexts/alertContext";
import { Task } from "./FullTask";

function newValueOrUndefined<T>(value: T, original: T) {
    return value !== original ? value : undefined;
}

export default function TaskEditForm(props: { task: Task; onSaved: (task: Task) => void; onCancel: () => void }) {
    const { addAlert } = useAlert();
    const [me] = useMe();
    const [board, setBoard] = useBoard();

    const task = props.task;
    const [title, setTitle] = createSignal(task.title);
    const [description, setDescription] = createSignal(task.description ?? "");
    const [status, setStatus] = createSignal(task.status);
    const [assignee, setAssignee] = createSignal(task.assignee?.email ?? "");
    const [isArchived, setIsArchived] = createSignal(task.isArchived);
    const [saving, setSaving] = createSignal(false);

    const canArchive = () => me.isAdmin || board.access.some((access) => access.user.id == me.id && access.isModerator);

    createEffect(on([title, description, status, assignee], () => setIsArchived(false), { defer: true }));

    async function submit(e: SubmitEvent) {
        e.preventDefault();

        const fields = {
            title: newValueOrUndefined(title(), task.title),
            description: newValueOrUndefined(description(), task.description),
            status: newValueOrUndefined(status(), task.status),
            assignee: newValueOrUndefined(assignee() || null, task.assignee?.email ?? null),
            isArchived: newValueOrUndefined(isArchived(), task.isArchived),
        };

        if (Object.values(fields).every((value) => value === undefined)) {
            props.onCancel();
            return;
        }

        setSaving(true);

        const result = await gqlClient.mutation<{
            updateTask: Omit<Task, "createdAt"> & {
                createdAt: string;
            };
        }>(
            gql`
                mutation UpdateTask(
                    $id: Int!
                    $title: String
                    $description: String
                    $status: String
                    $assignee: String
                    $isArchived: Boolean
                ) {
                    updateTask(
                        id: $id
                        title: $title
                        description: $description
                        status: $status
                        assignee: $assignee
                        isArchived: $isArchived
                    ) {
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
            { id: task.id, ...fields },
        );

        setSaving(false);

        if (handleAuthError(result.error)) {
            // TODO: Pre-check title uniqueness against board.tasks before submitting, also in TaskForm.
            addAlert("Failed to update task", "error");
            return;
        }

        const updated = result.data!.updateTask;
        const saved = { ...updated, createdAt: new Date(updated.createdAt) };

        setBoard("tasks", (task) => task.id == saved.id, saved);
        props.onSaved(saved);
    }

    return (
        <div class="card bg-base-100 border border-base-200 w-full max-w-sm shrink-0 row-start-1 col-start-1">
            <div class="card-body">
                <h2 class="card-title">Edit Task</h2>

                <form onSubmit={submit} id="edit-task-form">
                    <fieldset class="fieldset">
                        <label class="label">Title</label>
                        <input
                            class="input w-full"
                            type="text"
                            value={title()}
                            onInput={(e) => setTitle(e.currentTarget.value)}
                            required
                        />

                        <label class="label">Description</label>
                        <textarea
                            class="textarea w-full max-h-50"
                            value={description()}
                            onInput={(e) => setDescription(e.currentTarget.value)}
                        />

                        <label class="label">Assigned to</label>
                        <select
                            class="select w-full"
                            value={assignee()}
                            onChange={(e) => setAssignee(e.currentTarget.value)}
                        >
                            <option value="">No one</option>
                            <For
                                each={board.access.flatMap((access) =>
                                    access.user.emails.map((email) => ({ email, handle: access.user.handle })),
                                )}
                            >
                                {(user) => (
                                    <option value={user.email}>
                                        {user.handle ? `${user.handle} (${user.email})` : user.email}
                                    </option>
                                )}
                            </For>
                        </select>

                        <label class="label">Status</label>
                        <select
                            class="select w-full"
                            value={status()}
                            onChange={(e) => setStatus(e.currentTarget.value)}
                        >
                            <For each={board.taskStatus}>
                                {(status) => <option value={status.name}>{status.name}</option>}
                            </For>
                        </select>

                        <label class="label mt-2">
                            <input
                                type="checkbox"
                                class="checkbox"
                                checked={isArchived()}
                                onChange={(e) => setIsArchived(e.currentTarget.checked)}
                                disabled={!canArchive()}
                            />
                            Archived
                        </label>
                    </fieldset>
                </form>

                <div class="card-actions mt-4">
                    <button class="btn btn-warning" onClick={props.onCancel}>
                        Cancel
                    </button>
                    <button class="btn btn-primary" type="submit" form="edit-task-form" disabled={saving()}>
                        Save
                    </button>
                </div>
            </div>
        </div>
    );
}
