import { createSignal, For } from "solid-js";
import { createTask } from "../graphql/client";
import { useMe } from "./Layout";

export default function TaskForm(props: { boardId: number; onCreated: () => void }) {
    const [title, setTitle] = createSignal("");
    const [description, setDescription] = createSignal("");
    const [author, setAuthor] = createSignal("");

    const me = useMe().me();

    if (me == undefined) {
        return (
            <div class="toast">
                <span class="alert alert-error">Something went wrong. Please try again.</span>
            </div>
        );
    }

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
                        <input
                            class="input"
                            type="email"
                            placeholder="Author email"
                            list="task-form-author-emails"
                            value={author()}
                            onInput={e => setAuthor(e.currentTarget.value)}
                            required
                        />
                        <datalist id="task-form-author-emails">
                            <For each={me.emails}>{email => <option value={email.email} />}</For>
                        </datalist>
                    </fieldset>

                    <div class="card-actions">
                        <button class="btn btn-primary mt-4" type="submit">
                            Create
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
