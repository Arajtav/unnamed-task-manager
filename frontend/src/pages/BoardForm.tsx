import { createSignal } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { gqlClient } from "../graphql";
import { gql } from "@urql/core";
import { useAppData } from "../contexts/appDataContext";
import { Title } from "@solidjs/meta";
import { BaseBoard } from "../gqlTypes";
import { t } from "../i18n";

async function createBoard(name: string) {
    const result = await gqlClient.mutation<{
        createBoard: BaseBoard;
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
    const [_, setAppData] = useAppData();

    const [name, setName] = createSignal("");

    async function submit(e: SubmitEvent) {
        e.preventDefault();

        const result = await createBoard(name());

        if (result.error) {
            console.error(result.error);
            return;
        }

        const board = result.data!.createBoard;

        setAppData("boards", boards => boards.set(board.id, board.name));

        navigate(`/boards/${board.id}`);
    }

    return (
        <div class="flex w-full h-full items-center justify-center">
            <Title>{t("boardForm.title")}</Title>
            <div class="card card-border bg-base-100 border border-base-200">
                <div class="card-body">
                    <h2 class="card-title">{t("boardForm.createBoard")}</h2>
                    <form onSubmit={submit}>
                        <fieldset class="fieldset">
                            <label class="label">{t("boardForm.name")}</label>
                            <input
                                class="input"
                                type="text"
                                placeholder={t("boardForm.placeholder")}
                                value={name()}
                                onInput={e => setName(e.currentTarget.value)}
                                required
                            />
                        </fieldset>
                        <div class="card-actions">
                            <button class="btn btn-accent mt-4" type="submit">
                                {t("boardForm.create")}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

// TODO: handle graphql errors
