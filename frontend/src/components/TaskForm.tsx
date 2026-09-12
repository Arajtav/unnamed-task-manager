import { createResource, createSignal, For } from "solid-js";
import { createTask, myEmailsQuery } from "../graphql/client";

export default function TaskForm(props: { boardId: number; onCreated: () => void }) {
    const [title, setTitle] = createSignal("");
    const [description, setDescription] = createSignal("");
    const [author, setAuthor] = createSignal("");

    const [myEmails] = createResource(async () => {
        const result = await myEmailsQuery();
        return result.data?.me.emails ?? [];
    });

    async function submit(e: SubmitEvent) {
        e.preventDefault();

        const result = await createTask(props.boardId, title(), author(), description() || undefined);

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
        <form class="flex flex-col gap-2 items-center" onSubmit={submit}>
            <input
                class="border px-2"
                placeholder="Title"
                type="text"
                value={title()}
                onInput={(e) => setTitle(e.currentTarget.value)}
                required
            />
            <input
                class="border px-2"
                placeholder="Description"
                type="text"
                value={description()}
                onInput={(e) => setDescription(e.currentTarget.value)}
            />
            <input
                class="border px-2"
                placeholder="Author email"
                type="email"
                list="task-form-author-emails"
                value={author()}
                onInput={(e) => setAuthor(e.currentTarget.value)}
                required
            />
            <datalist id="task-form-author-emails">
                <For each={myEmails()}>{(email) => <option value={email.email} />}</For>
            </datalist>
            <button class="button" type="submit">
                Create task
            </button>
        </form>
    );
}
