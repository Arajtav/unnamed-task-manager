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
        <div class="card bg-base-100 w-full max-w-sm shrink-0 shadow-2xl">
            <div class="card-body">
                <h2 class="card-title">Create Board</h2>
                <form onSubmit={submit}>
                    <fieldset class="fieldset">
                        <label class="label">Name</label>
                        <input
                            class="input"
                            type="text"
                            placeholder="Name"
                            value={name()}
                            onInput={(e) => setName(e.currentTarget.value)}
                            required
                        />
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
