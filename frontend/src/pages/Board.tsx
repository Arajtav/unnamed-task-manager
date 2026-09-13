import { createResource, For, Show } from "solid-js";
import { useParams } from "@solidjs/router";
import { handleAuthError } from "../auth";
import { boardQuery } from "../graphql/client";
import TaskForm from "../components/TaskForm";

export default function Board() {
    const params = useParams<{ id: string }>();

    const [board, { refetch }] = createResource(
        () => params.id,
        async (id) => {
            const result = await boardQuery(Number(id));

            if (handleAuthError(result.error)) return undefined;

            return result.data?.board ?? null;
        },
    );

    return (
        <div class="flex items-start justify-center pt-8">
            <Show when={board.loading}>
                <span class="loading loading-spinner loading-lg" />
            </Show>

            <Show when={!board.loading && board() === null}>
                <div role="alert" class="alert alert-warning">
                    <span>Board not found</span>
                </div>
            </Show>

            <Show when={!board.loading && board() === undefined}>
                <div role="alert" class="alert alert-error">
                    <span>Something went wrong</span>
                </div>
            </Show>

            <Show when={!board.loading && board()}>
                {(b) => (
                    <div class="flex flex-col gap-8">
                        <p class="text-center font-bold">{b().name}</p>

                        <TaskForm boardId={b().id} onCreated={refetch} />

                        <Show when={b().tasks.length > 0}>
                            <ul class="list bg-base-100 rounded-box">
                                <For each={b().tasks}>
                                    {(task) => (
                                        <li class="list-row flex flex-col">
                                            <div>
                                                <p class="font-bold">{task.title}</p>
                                                <p>{task.description}</p>
                                                <p>Author: {task.author}</p>
                                                <p>Created at: {new Date(task.createdAt).toISOString()}</p>
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
