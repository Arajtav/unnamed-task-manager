import { createSignal, For, Show } from "solid-js";
import { A } from "@solidjs/router";
import { gqlClient } from "../graphql";
import { gql } from "@urql/core";
import { useBoard } from "../contexts/boardContext";
import { useBoardNav } from "../contexts/boardNavContext";
import { useAppData } from "../contexts/appDataContext";
import { useAlert } from "../contexts/alertContext";
import Badge from "../newComponents/Badge";
import BadgeButton from "../newComponents/BadgeButton";
import { PlusIcon } from "lucide-solid";
import { PreviewTaskRaw, PRIORITIES, processPreviewTask } from "../gqlTypes";

export default function TaskForm() {
    const { addAlert } = useAlert();
    const [appData] = useAppData();
    const [board, setBoard] = useBoard();
    const [boardNav, setBoardNav] = useBoardNav();

    const [title, setTitle] = createSignal("");
    const [description, setDescription] = createSignal("");
    const [author, setAuthor] = createSignal(appData.me.emails[0] ?? "");
    const [labels, setLabels] = createSignal(new Set<string>());
    const [priority, setPriority] = createSignal(0);

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

    async function submit(e: SubmitEvent) {
        e.preventDefault();

        const result = await gqlClient.mutation<{
            createTask: PreviewTaskRaw;
        }>(
            gql`
                mutation CreateTask(
                    $boardId: Int!
                    $title: String!
                    $description: String
                    $author: String!
                    $status: String!
                    $labels: [String!]
                    $priority: Int!
                ) {
                    createTask(
                        boardId: $boardId
                        title: $title
                        description: $description
                        author: $author
                        status: $status
                        labels: $labels
                        priority: $priority
                    ) {
                        id
                        title
                        createdAt
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
                        }
                        archivedAt
                        isBlocked
                        labels
                        priority
                    }
                }
            `,
            {
                boardId: board.id,
                title: title(),
                description: description() || null,
                author: author(),
                status: boardNav.createTask,
                labels: [...labels()],
                priority: priority(),
            }
        );

        if (result.error) {
            console.error(result.error);
            return;
        }

        let task = result.data!.createTask;

        setTitle("");
        setDescription("");
        setAuthor("");
        setLabels(new Set<string>());
        setBoard("tasks", tasks => [...tasks, processPreviewTask(task)]);
        setBoardNav("createTask", "");
        setPriority(0);
    }

    return (
        <div class="card bg-base-100 border border-base-200 w-full max-w-sm shrink-0">
            <div class="card-body">
                <h2 class="card-title">Create Task</h2>

                <Show
                    when={appData.me.emails.length}
                    fallback={
                        <A href="/settings" class="text-warning text-sm">
                            You need to link an email first.
                        </A>
                    }
                >
                    <form onSubmit={submit} id="create-task-form">
                        <fieldset class="fieldset">
                            <label class="label">Title</label>
                            <input
                                class="input"
                                type="text"
                                placeholder="Title"
                                value={title()}
                                onInput={e => setTitle(e.currentTarget.value)}
                                required
                            />

                            <label class="label">Description</label>
                            <textarea
                                class="textarea"
                                placeholder="Description"
                                value={description()}
                                onInput={e => setDescription(e.currentTarget.value)}
                            />

                            <label class="label">Author email</label>
                            <select
                                class="select w-full"
                                value={author()}
                                onChange={e => setAuthor(e.currentTarget.value)}
                                disabled={appData.me.emails.length == 1}
                                required
                            >
                                <For each={appData.me.emails}>
                                    {email => <option value={email}>{email}</option>}
                                </For>
                            </select>

                            <label class="label">Status</label>
                            <select
                                class="select w-full"
                                onChange={e => setBoardNav("createTask", e.currentTarget.value)}
                                disabled={board.taskStatus.length == 1}
                                required
                            >
                                <For each={board.taskStatus}>
                                    {status => (
                                        <option
                                            value={status.name}
                                            selected={status.name == boardNav.createTask}
                                        >
                                            {status.name}
                                        </option>
                                    )}
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
                                        <option value={p.value} selected={p.value == priority()}>
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
                        </fieldset>
                    </form>
                </Show>
                <div class="card-actions">
                    <button
                        class="btn btn-warning mt-4"
                        onClick={() => setBoardNav("createTask", "")}
                    >
                        Cancel
                    </button>
                    <Show when={appData.me.emails.length}>
                        <button class="btn btn-primary mt-4" type="submit" form="create-task-form">
                            Create
                        </button>
                    </Show>
                </div>
            </div>
        </div>
    );
}

// TODO: This should be more dialog like on error. So you can close it by clicking outside.
// Also all dialogs are wrong I think, ESC should close them.
