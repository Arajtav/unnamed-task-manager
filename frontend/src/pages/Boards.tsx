import { createResource, For, Show } from "solid-js";
import { A } from "@solidjs/router";
import { handleAuthError } from "../auth";
import { boardsQuery, meQuery } from "../graphql/client";
import BoardForm from "../components/BoardForm";

export default function Boards() {
    const [boards, { refetch }] = createResource(async () => {
        const result = await boardsQuery();

        if (handleAuthError(result.error)) return undefined;

        return result.data?.boards ?? [];
    });

    const [me] = createResource(async () => {
        const result = await meQuery();

        if (handleAuthError(result.error)) return undefined;

        return result.data?.me ?? null;
    });

    return (
        <div class="w-screen h-screen flex items-center justify-center">
            <Show when={boards.loading}>
                <p>Loading...</p>
            </Show>

            <Show when={!boards.loading && boards() === undefined}>
                <p>Something went wrong</p>
            </Show>

            <Show when={!boards.loading && boards()}>
                <div class="flex flex-col gap-8">
                    <Show when={!me.loading && me()?.isAdmin}>
                        <BoardForm onCreated={refetch} />
                    </Show>

                    <div class="border p-2">
                        <div class="flex flex-col gap-4">
                            <For each={boards()}>
                                {(board) => (
                                    <A href={`/boards/${board.id}`} class="border-b">
                                        <p class="font-bold">{board.name}</p>
                                        <p>Created at: {new Date(board.createdAt).toISOString()}</p>
                                    </A>
                                )}
                            </For>
                        </div>
                    </div>
                </div>
            </Show>
        </div>
    );
}
