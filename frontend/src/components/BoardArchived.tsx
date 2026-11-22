import { createSignal, Show } from "solid-js";
import { t } from "../i18n";
import { useBoard } from "../contexts/boardContext";
import { gqlClient } from "../graphql";
import { useAlert } from "../contexts/alertContext";
import { CircleCheckIcon, CircleXIcon } from "lucide-solid";

export default function BoardArchived() {
    const [board, setBoard] = useBoard();
    const [pending, setPending] = createSignal(false);
    const { addAlert } = useAlert();

    async function setArchived(isArchived: boolean) {
        setPending(true);

        const result = await gqlClient.mutation<{
            updateBoard: { archivedAt: string | null };
        }>(
            `
                mutation UpdateBoard($id: Int!, $isArchived: Boolean) {
                    updateBoard(id: $id, isArchived: $isArchived) {
                        archivedAt
                    }
                }
            `,
            { id: board.id, isArchived }
        );

        setPending(false);
        if (result.error) {
            addAlert({
                type: "error",
                title: "Something went wrong",
                content: "Try again later",
                icon: CircleXIcon,
            });
        } else {
            addAlert({
                type: "normal",
                title: "Board updated",
                content: "Updated the board successfully",
                icon: CircleCheckIcon,
            });
            setBoard("archivedAt", result.data!.updateBoard.archivedAt);
        }
    }

    return (
        <fieldset class="fieldset bg-base-200 border-base-300 w-min min-w-xl border p-4">
            <legend class="fieldset-legend">{t("boardArchived.title")}</legend>

            <Show
                when={board.archivedAt}
                fallback={
                    <button
                        type="button"
                        class="btn btn-warning"
                        disabled={pending()}
                        onClick={() => setArchived(true)}
                    >
                        {t("boardArchived.archive")}
                    </button>
                }
            >
                <button
                    type="button"
                    class="btn btn-primary"
                    disabled={pending()}
                    onClick={() => setArchived(false)}
                >
                    {t("boardArchived.unarchive")}
                </button>
            </Show>
        </fieldset>
    );
}
