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
                <span class="loading loading-spinner loading-lg" />
            </Show>

            <Show when={!boards.loading && boards() === undefined}>
                <div role="alert" class="alert alert-error">
                    <span>Something went wrong</span>
                </div>
            </Show>

            <Show when={!boards.loading && boards()}>
                <div class="flex flex-col gap-8">
                    <Show when={!me.loading && me()?.isAdmin}>
                        <BoardForm onCreated={refetch} />
                    </Show>

                    <ul class="list bg-base-100 rounded-box">
                        <For each={boards()}>
                            {(board) => (
                                <li class="list-row">
                                    <A href={`/boards/${board.id}`} class="flex flex-col">
                                        <p class="font-bold">{board.name}</p>
                                        <p>Created at: {new Date(board.createdAt).toISOString()}</p>
                                    </A>
                                </li>
                            )}
                        </For>
                    </ul>
                </div>
            </Show>
        </div>
    );
}
