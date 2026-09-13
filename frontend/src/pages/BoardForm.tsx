import { createSignal } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { createBoard } from "../graphql/client";

export default function BoardForm() {
    const navigate = useNavigate();
    const [name, setName] = createSignal("");

    async function submit(e: SubmitEvent) {
        e.preventDefault();

        const result = await createBoard(name());

        if (result.error || !result.data) {
            console.error(result.error);
            return;
        }

        navigate(`/boards/${result.data.createBoard.id}`);
    }

    return (
        <div class="flex w-full h-full items-center justify-center">
            <div class="card card-border bg-base-100">
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
                            <button class="btn btn-accent mt-4" type="submit">
                                Create
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
