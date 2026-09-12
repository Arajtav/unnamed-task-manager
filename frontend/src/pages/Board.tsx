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
        <div class="w-screen h-screen flex items-center justify-center">
            <Show when={board.loading}>
                <p>Loading...</p>
            </Show>

            <Show when={!board.loading && board() === undefined}>
                <p>Something went wrong</p>
            </Show>

            <Show when={!board.loading && board() === null}>
                <p>Board not found</p>
            </Show>

            <Show when={!board.loading && board()}>
                {(b) => (
                    <div class="flex flex-col gap-8">
                        <p class="text-center font-bold">{b().name}</p>

                        <TaskForm boardId={b().id} onCreated={refetch} />

                        <Show when={b().tasks.length > 0}>
                            <div class="flex flex-col gap-4 border p-2">
                                <For each={b().tasks}>
                                    {(task) => (
                                        <div class="border-b">
                                            <p class="font-bold">{task.title}</p>
                                            <p>{task.description}</p>
                                            <p>Author: {task.author}</p>
                                            <p>Created at: {new Date(task.createdAt).toISOString()}</p>
                                        </div>
                                    )}
                                </For>
                            </div>
                        </Show>
                    </div>
                )}
            </Show>
        </div>
    );
}
