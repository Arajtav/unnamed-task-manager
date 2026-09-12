import { createSignal } from "solid-js";
import { createBoard } from "../graphql/client";

export default function BoardForm(props: { onCreated: () => void }) {
    const [name, setName] = createSignal("");

    async function submit(e: SubmitEvent) {
        e.preventDefault();

        const result = await createBoard(name());

        if (result.error) {
            console.error(result.error);
            return;
        }

        setName("");
        props.onCreated();
    }

    return (
        <form class="flex flex-col gap-2 items-center" onSubmit={submit}>
            <input
                class="border px-2"
                placeholder="Name"
                type="text"
                value={name()}
                onInput={(e) => setName(e.currentTarget.value)}
                required
            />
            <button class="button" type="submit">
                Create board
            </button>
        </form>
    );
}
