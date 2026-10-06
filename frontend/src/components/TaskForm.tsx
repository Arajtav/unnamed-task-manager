import { createSignal, For, Show } from "solid-js";
import { A } from "@solidjs/router";
import { gqlClient } from "../graphql";
import { gql } from "@urql/core";
import { Task, useBoard } from "../contexts/boardContext";
import { useBoardNav } from "../contexts/boardNavContext";
import { useAppData } from "../contexts/appDataContext";

export default function TaskForm() {
    const [{ me }] = useAppData();
    const [board, setBoard] = useBoard();
    const [_, setBoardNav] = useBoardNav();

    const [title, setTitle] = createSignal("");
    const [description, setDescription] = createSignal("");
    const [author, setAuthor] = createSignal(me.emails[0] ?? "");
    const [status, setStatus] = createSignal(board.taskStatus[0]?.name ?? "");

    async function submit(e: SubmitEvent) {
        e.preventDefault();

        const result = await gqlClient.mutation<{
            createTask: Omit<Task, "createdAt"> & {
                createdAt: string;
            };
        }>(
            gql`
                mutation CreateTask(
                    $boardId: Int!
                    $title: String!
                    $description: String
                    $author: String!
                    $status: String!
                ) {
                    createTask(
                        boardId: $boardId
                        title: $title
                        description: $description
                        author: $author
                        status: $status
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
            {
                boardId: board.id,
                title: title(),
                description: description() || null,
                author: author(),
                status: status(),
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
        setBoard("tasks", tasks => [...tasks, { ...task, createdAt: new Date(task.createdAt) }]);
        setBoardNav("createTask", false);
    }

    return (
        <div class="card bg-base-100 border border-base-200 w-full max-w-sm shrink-0">
            <div class="card-body">
                <h2 class="card-title">Create Task</h2>

                <Show
                    when={board.taskStatus.length}
                    fallback={
                        <div class="text-error text-sm">
                            The board is configured improperly, at least one Status is required.
                        </div>
                    }
                >
                    <Show
                        when={me.emails.length}
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
                                    disabled={me.emails.length == 1}
                                    required
                                >
                                    <For each={me.emails}>
                                        {email => <option value={email}>{email}</option>}
                                    </For>
                                </select>

                                <label class="label">Status</label>
                                <select
                                    class="select w-full"
                                    value={status()}
                                    onChange={e => setStatus(e.currentTarget.value)}
                                    disabled={board.taskStatus.length == 1}
                                    required
                                >
                                    <For each={board.taskStatus}>
                                        {status => (
                                            <option value={status.name}>{status.name}</option>
                                        )}
                                    </For>
                                </select>
                            </fieldset>
                        </form>
                    </Show>
                </Show>
                <div class="card-actions">
                    <button
                        class="btn btn-warning mt-4"
                        onClick={() => setBoardNav("createTask", false)}
                    >
                        Cancel
                    </button>
                    <Show when={me.emails.length && board.taskStatus.length}>
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
