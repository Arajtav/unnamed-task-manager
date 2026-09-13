import { createResource, For, Show } from "solid-js";
import { A } from "@solidjs/router";
import { boardsQuery, boardsRefreshTick } from "../graphql/client";
import { handleAuthError } from "../auth";

export default function Drawer() {
    let drawerToggle: HTMLInputElement | undefined;

    function closeDrawer() {
        if (drawerToggle) drawerToggle.checked = false;
    }

    const [boards] = createResource(boardsRefreshTick, async () => {
        const result = await boardsQuery();

        if (handleAuthError(result.error)) return undefined;

        return result.data?.boards ?? [];
    });

    return (
        <div class="drawer w-fit items-center mx-2">
            <input ref={drawerToggle} id="board-drawer" type="checkbox" class="drawer-toggle" />
            <div class="drawer-content">
                <label for="board-drawer" class="btn bg-gray-700 h-7">
                    Boards
                </label>
            </div>

            <div class="drawer-side">
                <label for="board-drawer" aria-label="close sidebar" class="drawer-overlay"></label>
                <ul class="menu bg-base-200 min-h-full w-80 p-4 justify-between">
                    <Show when={boards.loading}>
                        <span class="loading loading-spinner loading-lg" />
                    </Show>

                    <Show when={!boards.loading && boards() === undefined}>
                        <div role="alert" class="alert alert-error">
                            <span>Something went wrong</span>
                        </div>
                    </Show>

                    <Show when={!boards.loading && boards()}>
                        <div>
                            <For each={boards()}>
                                {(board) => (
                                    <li class="list-row">
                                        <A class="font-bold" href={`/boards/${board.id}`} onClick={closeDrawer}>
                                            {board.name}
                                        </A>
                                    </li>
                                )}
                            </For>
                        </div>
                        <A class="btn btn-accent" href="/boards/create" onClick={closeDrawer}>
                            Create Board
                        </A>
                    </Show>
                </ul>
            </div>
        </div>
    );
}
