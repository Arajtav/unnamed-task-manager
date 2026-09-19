import { createResource, For, Show } from "solid-js";
import { useParams } from "@solidjs/router";
import { handleAuthError } from "../auth";
import { boardQuery } from "../graphql/client";
import TaskForm from "../components/TaskForm";
import { useAlert } from "../components/Layout";

export default function Board() {
    let { addAlert } = useAlert();

    const params = useParams<{ id: string }>();

    const [board, { refetch }] = createResource(
        () => params.id,
        async id => {
            const result = await boardQuery(Number(id));

            if (handleAuthError(result.error)) {
                addAlert(t("en", "genericError"), "error");
                return undefined;
            }

            let data = result.data?.board;

            if (!data) {
                addAlert(t("en", "boardNotFound"), "warning");
                return null;
            }

            return data;
        }
    );

    return (
        <div class="flex items-start justify-center pt-8 w-full h-full">
            <Show when={board.loading}>
                <div class="w-full h-full items-center justify-center flex">
                    <span class="loading loading-spinner loading-lg" />
                </div>
            </Show>

            <Show when={!board.loading && board()}>
                {b => (
                    <div class="flex flex-col gap-8">
                        <p class="text-center font-bold">{b().name}</p>

                        <TaskForm boardId={b().id} onCreated={refetch} />

                        <Show when={b().tasks.length > 0}>
                            <ul class="list bg-base-100 rounded-box">
                                <For each={b().tasks}>
                                    {task => (
                                        <li class="list-row flex flex-col">
                                            <div>
                                                <p class="font-bold">{task.title}</p>
                                                <p>{task.description}</p>
                                                <p>{t("en", "author", task.author)}</p>
                                                <p>
                                                    {t("en", "createdAt", new Date(task.createdAt))}
                                                </p>
                                            </div>
                                        </li>
                                    )}
                                </For>
                            </ul>
                        </Show>
                    </div>
                )}
            </Show>
        </div>
    );
}
