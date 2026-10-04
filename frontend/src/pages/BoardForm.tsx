import { createSignal } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { gqlClient } from "../graphql";
import { gql } from "@urql/core";
import { useBoards } from "../contexts/boardsContext";

async function createBoard(name: string) {
    const result = await gqlClient.mutation<{
        createBoard: {
            id: string;
            name: string;
        };
    }>(
        gql`
            mutation CreateBoard($name: String!) {
                createBoard(name: $name) {
                    id
                    name
                }
            }
        `,
        { name }
    );

    return result;
}

export default function BoardForm() {
    const navigate = useNavigate();
    const [_, setBoards] = useBoards();

    const [name, setName] = createSignal("");

    async function submit(e: SubmitEvent) {
        e.preventDefault();

        const result = await createBoard(name());

        if (result.error) {
            console.error(result.error);
            return;
        }

        let board = result.data!.createBoard;

        setBoards(boards => boards.set(board.id, board.name));

        navigate(`/boards/${board.id}`);
    }

    return (
        <div class="flex w-full h-full items-center justify-center">
            <div class="card card-border bg-base-100 border border-base-200">
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
                                onInput={e => setName(e.currentTarget.value)}
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

// TODO: handle graphql errors
