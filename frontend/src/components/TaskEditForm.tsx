import { gql } from "@urql/core";
import { createEffect, createMemo, createSignal, For, on, Show } from "solid-js";
import { handleAuthError } from "../auth";
import { useAlert } from "../contexts/alertContext";
import { useAppData } from "../contexts/appDataContext";
import { useBoard } from "../contexts/boardContext";
import { gqlClient } from "../graphql";
import User from "../newComponents/User";
import Badge from "../newComponents/Badge";
import BadgeButton from "../newComponents/BadgeButton";
import { CircleXIcon, PlusIcon, XIcon } from "lucide-solid";
import {
    BaseUser,
    CompleteTask,
    CompleteTaskRaw,
    PRIORITIES,
    processCompleteTask,
} from "../gqlTypes";
import { parseOneAddress } from "email-addresses";

export function newValueOrUndefined<T>(value: T, original: T) {
    return value !== original ? value : undefined;
}

export default function TaskEditForm(props: {
    task: CompleteTask;
    onSaved: (task: CompleteTask) => void;
    onCancel: () => void;
}) {
    const { addAlert } = useAlert();
    const [appData] = useAppData();
    const [board, setBoard] = useBoard();

    const task = props.task;
    const [title, setTitle] = createSignal(task.title);
    const [description, setDescription] = createSignal(task.description ?? "");
    const [status, setStatus] = createSignal(task.status);
    const originalAssignees = new Set(task.assignees.map(a => a.email.email));
    const [assignees, setAssignees] = createSignal(new Set(originalAssignees));
    const [assigneeSearch, setAssigneeSearch] = createSignal("");
    const [isArchived, setIsArchived] = createSignal(task.archivedAt != null);
    const [saving, setSaving] = createSignal(false);
    const originalLabels = new Set(task.labels.map(l => l.trim().toLowerCase()));
    const [labels, setLabels] = createSignal(new Set(originalLabels));
    const [priority, setPriority] = createSignal(task.priority);

    const labelDiff = createMemo(() => ({
        add: [...labels()].filter(l => !originalLabels.has(l)),
        remove: [...originalLabels].filter(l => !labels().has(l)),
    }));

    const assigneeDiff = createMemo(() => ({
        add: [...assignees()].filter(email => !originalAssignees.has(email)),
        remove: [...originalAssignees].filter(email => !assignees().has(email)),
    }));

    const knownUsers = createMemo(() => {
        const map = new Map<string, BaseUser>();
        for (const { email } of task.assignees) if (email.user) map.set(email.email, email.user);
        for (const user of appData.users) {
            for (const email of user.emails) map.set(email, user);
        }
        return map;
    });

    const assigneeUser = (email: string) => ({ ...knownUsers().get(email), emails: [email] });

    const assigneeResults = createMemo(() => {
        const query = assigneeSearch().trim().toLowerCase();

        return board.access.flatMap(({ user }) =>
            user.emails.filter(
                email => !assignees().has(email) && email.toLowerCase().includes(query)
            )
        );
    });

    const typedEmail = createMemo(() => {
        const value = assigneeSearch().trim();
        if (!value || assignees().has(value)) return undefined;
        if (parseOneAddress(value) == null) return undefined;
        if (assigneeResults().some(email => email == value)) return undefined;
        return value;
    });

    function addAssignee(email: string) {
        setAssignees(prev => new Set(prev).add(email));
    }

    function removeAssignee(email: string) {
        setAssignees(prev => {
            const next = new Set(prev);
            next.delete(email);
            return next;
        });
    }

    const hasLabelChanges = () => labelDiff().add.length > 0 || labelDiff().remove.length > 0;

    const hasAssigneeChanges = () =>
        assigneeDiff().add.length > 0 || assigneeDiff().remove.length > 0;

    function addLabel() {
        const name = prompt("Label")?.trim().toLowerCase();
        if (!name) return;

        if ([...name].length > 64) {
            addAlert({
                type: "error",
                title: "Label too long",
                content: "Labels can be at most 64 characters.",
                icon: CircleXIcon,
            });
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

    const isUserAdminOrModerator = () =>
        appData.me.isAdmin ||
        board.access.some(access => access.user.id == appData.me.id && access.isModerator);

    const isEditing = createMemo(
        () =>
            title() != task.title ||
            description() != (task.description ?? "") ||
            status() != task.status ||
            priority() != task.priority ||
            hasLabelChanges() ||
            hasAssigneeChanges()
    );

    const canKeepArchived = () => isUserAdminOrModerator() || !isEditing();

    createEffect(
        on(
            [title, description, status, assigneeDiff, priority, labelDiff],
            () => {
                if (!canKeepArchived()) setIsArchived(false);
            },
            { defer: true }
        )
    );

    async function submit(e: SubmitEvent) {
        e.preventDefault();

        const { add: labelAdd, remove: labelRemove } = labelDiff();
        const { add: assigneeAdd, remove: assigneeRemove } = assigneeDiff();

        const fields = {
            title: newValueOrUndefined(title(), task.title),
            description: newValueOrUndefined(description(), task.description),
            status: newValueOrUndefined(status(), task.status),
            priority: newValueOrUndefined(priority(), task.priority),
            isArchived: newValueOrUndefined(isArchived(), task.archivedAt != null),
            addLabels: labelAdd.length > 0 ? labelAdd : undefined,
            removeLabels: labelRemove.length > 0 ? labelRemove : undefined,
            addAssignees: assigneeAdd.length > 0 ? assigneeAdd : undefined,
            removeAssignees: assigneeRemove.length > 0 ? assigneeRemove : undefined,
        };

        if (Object.values(fields).every(value => value === undefined)) {
            props.onCancel();
            return;
        }

        setSaving(true);

        const result = await gqlClient.mutation<{
            updateTask: CompleteTaskRaw;
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
                        assignees {
                            email {
                                email
                                user {
                                    id
                                    handle
                                }
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
            addAlert({
                type: "error",
                title: "Failed to update task",
                content: "Try again later.",
                icon: CircleXIcon,
            });
            return;
        }

        const updated = result.data!.updateTask;
        const saved = processCompleteTask(updated);

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
                        <Show when={assignees().size > 0}>
                            <ul class="list bg-base-100 rounded-box mb-2">
                                <For each={[...assignees()]}>
                                    {email => (
                                        <li class="list-row items-center">
                                            <div class="list-col-grow">
                                                <User user={assigneeUser(email)} />
                                            </div>

                                            <button
                                                type="button"
                                                class="btn btn-square btn-ghost btn-sm"
                                                onClick={() => removeAssignee(email)}
                                            >
                                                <XIcon strokeWidth={1.5} />
                                            </button>
                                        </li>
                                    )}
                                </For>
                            </ul>
                        </Show>

                        <div class="dropdown w-full">
                            <input
                                type="text"
                                inputMode="email"
                                class="input w-full"
                                placeholder="Add assignee..."
                                value={assigneeSearch()}
                                onInput={e => setAssigneeSearch(e.currentTarget.value)}
                                onKeyDown={e => {
                                    if (e.key != "Enter") return;
                                    e.preventDefault();
                                    const email = typedEmail() ?? assigneeResults()[0];
                                    if (email) addAssignee(email);
                                }}
                            />

                            <Show when={assigneeResults().length > 0 || typedEmail()}>
                                <ul
                                    class="dropdown-content menu bg-base-200 rounded-box mt-2 w-full"
                                    onPointerDown={e => e.preventDefault()}
                                >
                                    <For each={assigneeResults()}>
                                        {email => (
                                            <li>
                                                <div class="flex w-full items-center gap-2">
                                                    <div class="flex-1">
                                                        <User user={assigneeUser(email)} />
                                                    </div>
                                                    <button
                                                        type="button"
                                                        class="btn btn-square btn-ghost"
                                                        onClick={() => addAssignee(email)}
                                                    >
                                                        <PlusIcon strokeWidth={1.5} />
                                                    </button>
                                                </div>
                                            </li>
                                        )}
                                    </For>

                                    <Show when={typedEmail()}>
                                        {email => (
                                            <li>
                                                <button
                                                    type="button"
                                                    onClick={() => addAssignee(email())}
                                                >
                                                    <PlusIcon strokeWidth={1.5} />
                                                    Add {email()}
                                                </button>
                                            </li>
                                        )}
                                    </Show>
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

                        <label class="label">Priority</label>
                        <select
                            class="select w-full"
                            value={priority()}
                            onChange={e => setPriority(Number(e.currentTarget.value))}
                        >
                            <For each={PRIORITIES}>
                                {p => (
                                    <option value={p.value} selected={p.value === priority()}>
                                        {p.label}
                                    </option>
                                )}
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
