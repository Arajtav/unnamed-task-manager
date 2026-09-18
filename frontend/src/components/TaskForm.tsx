import { createSignal, For, Show } from "solid-js";
import { createTask } from "../graphql/client";
import { useMe } from "./Layout";
import { A } from "@solidjs/router";

export default function TaskForm(props: { boardId: number; onCreated: () => void }) {
    const [me] = useMe();

    const [title, setTitle] = createSignal("");
    const [description, setDescription] = createSignal("");
    const [author, setAuthor] = createSignal(me.emails[0]?.email ?? "");

    async function submit(e: SubmitEvent) {
        e.preventDefault();

        const result = await createTask(
            props.boardId,
            title(),
            author(),
            description() || undefined
        );

        if (result.error) {
            console.error(result.error);
            return;
        }

        setTitle("");
        setDescription("");
        setAuthor("");
        props.onCreated();
    }

    return (
        <div class="card bg-base-100 border border-base-200 w-full max-w-sm shrink-0">
            <div class="card-body">
                <h2 class="card-title">Create Task</h2>

                <Show
                    when={me.emails.length}
                    fallback={
                        <A href="/settings" class="text-warning text-sm text-base-content/70">
                            You need to link an email first.
                        </A>
                    }
                >
                    <form onSubmit={submit}>
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
                                    {email => <option value={email.email}>{email.email}</option>}
                                </For>
                            </select>
                        </fieldset>

                        <div class="card-actions">
                            <button
                                class="btn btn-primary mt-4"
                                type="submit"
                                disabled={me.emails.length == 0}
                            >
                                Create
                            </button>
                        </div>
                    </form>
                </Show>
            </div>
        </div>
    );
}
