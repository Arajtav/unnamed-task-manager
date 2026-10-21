import { gql } from "@urql/core";
import { createEffect, createMemo, createSignal, For, on, Show } from "solid-js";
import { handleAuthError } from "../auth";
import { useAlert } from "../contexts/alertContext";
import { useAppData } from "../contexts/appDataContext";
import { useBoard } from "../contexts/boardContext";
import { gqlClient } from "../graphql";
import User from "../newComponents/User";
import { Task } from "./FullTask";
import Badge from "../newComponents/Badge";
import BadgeButton from "../newComponents/BadgeButton";
import { PlusIcon } from "lucide-solid";

export function newValueOrUndefined<T>(value: T, original: T) {
    return value !== original ? value : undefined;
}

export default function TaskEditForm(props: {
    task: Task;
    onSaved: (task: Task) => void;
    onCancel: () => void;
}) {
    const { addAlert } = useAlert();
    const [appData] = useAppData();
    const [board, setBoard] = useBoard();

    const task = props.task;
    const [title, setTitle] = createSignal(task.title);
    const [description, setDescription] = createSignal(task.description ?? "");
    const [status, setStatus] = createSignal(task.status);
    const [assignee, setAssignee] = createSignal(task.assignee?.email ?? "");
    const [isArchived, setIsArchived] = createSignal(task.isArchived);
    const [saving, setSaving] = createSignal(false);
    const originalLabels = new Set(task.labels.map(l => l.trim().toLowerCase()));
    const [labels, setLabels] = createSignal(new Set(originalLabels));

    const labelDiff = createMemo(() => ({
        add: [...labels()].filter(l => !originalLabels.has(l)),
        remove: [...originalLabels].filter(l => !labels().has(l)),
    }));

    const hasLabelChanges = () => labelDiff().add.length > 0 || labelDiff().remove.length > 0;

    function addLabel() {
        const name = prompt("Label")?.trim().toLowerCase();
        if (!name) return;

        if ([...name].length > 64) {
            addAlert("Label can be at most 64 characters", "error");
            return;
        }

        setLabels(prev => new Set(prev).add(name));
    }

    function removeLabel(label: string) {
        setLabels(prev => {
            const next = new Set(prev);
            next.delete(label);
            return next;
        });
    }

    const filteredEmails = createMemo(() => {
        const query = assignee().trim().toLowerCase();

        if (!query) return [];

        return board.access.flatMap(({ user }) =>
            user.emails
                .filter(userEmail => userEmail.toLowerCase().includes(query))
                .map(userEmail => ({
                    user: {
                        id: user.id,
                        emails: [userEmail],
                        handle: user.handle,
                    },
                    email: userEmail,
                }))
        );
    });

    const isUserAdminOrModerator = () =>
        appData.me.isAdmin || board.access.some(access => access.user.id == appData.me.id && access.isModerator);

    const isEditing = createMemo(
        () =>
            title() != task.title ||
            description() != (task.description ?? "") ||
            status() != task.status ||
            assignee() != (task.assignee?.email ?? "") ||
            hasLabelChanges()
    );

    const canKeepArchived = () => isUserAdminOrModerator() || !isEditing();

    createEffect(
        on(
            [title, description, status, assignee, labelDiff],
            () => {
                if (!canKeepArchived()) setIsArchived(false);
            },
            { defer: true }
        )
    );

    async function submit(e: SubmitEvent) {
        e.preventDefault();

        const { add, remove } = labelDiff();

        const fields = {
            title: newValueOrUndefined(title(), task.title),
            description: newValueOrUndefined(description(), task.description),
            status: newValueOrUndefined(status(), task.status),
            assignee: newValueOrUndefined(assignee() || null, task.assignee?.email ?? null),
            isArchived: newValueOrUndefined(isArchived(), task.isArchived),
            addLabels: add.length > 0 ? add : undefined,
            removeLabels: remove.length > 0 ? remove : undefined,
        };

        if (Object.values(fields).every(value => value === undefined)) {
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
                mutation UpdateTask($id: Int!, $input: UpdateTaskInput!) {
                    updateTask(id: $id, input: $input) {
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
                        blockedBy {
                            id
                            title
                            status
                            isArchived
                        }
                        labels
                    }
                }
            `,
            {
                id: task.id,
                input: fields,
            }
        );

        setSaving(false);

        if (handleAuthError(result.error)) {
            // TODO: Pre-check title uniqueness against board.tasks before submitting, also in TaskForm.
            addAlert("Failed to update task", "error");
            return;
        }

        const updated = result.data!.updateTask;
        const saved = { ...updated, createdAt: new Date(updated.createdAt) };

        setBoard("tasks", task => task.id == saved.id, saved);
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
                            onInput={e => setTitle(e.currentTarget.value)}
                            required
                        />

                        <label class="label">Description</label>
                        <textarea
                            class="textarea w-full max-h-50"
                            value={description()}
                            onInput={e => setDescription(e.currentTarget.value)}
                        />

                        <label class="label">Assigned to</label>
                        <div class="dropdown w-full">
                            <input
                                type="text"
                                inputMode="email"
                                class="input w-full"
                                placeholder="No one"
                                value={assignee()}
                                onInput={e => setAssignee(e.currentTarget.value)}
                            />

                            <Show when={filteredEmails().length > 0}>
                                <ul class="dropdown-content menu bg-base-100 rounded-box mt-2 w-full">
                                    <For each={filteredEmails()}>
                                        {item => (
                                            <li>
                                                <button onClick={() => setAssignee(item.email)}>
                                                    <div class="flex w-full items-center gap-2">
                                                        <User user={item.user} />
                                                    </div>
                                                </button>
                                            </li>
                                        )}
                                    </For>
                                </ul>
                            </Show>
                        </div>

                        <label class="label">Status</label>
                        <select
                            class="select w-full"
                            value={status()}
                            onChange={e => setStatus(e.currentTarget.value)}
                        >
                            <For each={board.taskStatus}>
                                {status => <option value={status.name}>{status.name}</option>}
                            </For>
                        </select>

                        <label class="label">Labels</label>
                        <div class="flex flex-wrap gap-2">
                            <For each={[...labels()]}>
                                {label => (
                                    <Badge
                                        text={label}
                                        class="border-base-300/50"
                                        onClick={() => removeLabel(label)}
                                    />
                                )}
                            </For>
                            <BadgeButton
                                icon={<PlusIcon strokeWidth={1.5} />}
                                class="border-base-300/50"
                                onClick={addLabel}
                            />
                        </div>

                        <label class="label mt-2">
                            <input
                                type="checkbox"
                                class="checkbox"
                                checked={isArchived()}
                                onChange={e => setIsArchived(e.currentTarget.checked)}
                                disabled={!canKeepArchived()}
                            />
                            Archived
                        </label>
                    </fieldset>
                </form>

                <div class="card-actions mt-4">
                    <button class="btn btn-warning" onClick={props.onCancel}>
                        Cancel
                    </button>
                    <button
                        class="btn btn-primary"
                        type="submit"
                        form="edit-task-form"
                        disabled={saving()}
                    >
                        Save
                    </button>
                </div>
            </div>
        </div>
    );
}
