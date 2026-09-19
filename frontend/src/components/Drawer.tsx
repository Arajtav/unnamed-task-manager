import { createMemo, createResource, For, Show } from "solid-js";
import { A, useLocation } from "@solidjs/router";
import { boardsQuery, boardsRefreshTick } from "../graphql/client";
import { handleAuthError } from "../auth";
import { useAlert } from "./Layout";

export default function Drawer() {
    let { addAlert } = useAlert();

    const location = useLocation();

    let drawerToggle: HTMLInputElement | undefined;

    function closeDrawer() {
        if (drawerToggle) drawerToggle.checked = false;
    }

    const [boards] = createResource(boardsRefreshTick, async () => {
        const result = await boardsQuery();

        if (handleAuthError(result.error)) {
            addAlert("Something went wrong.", "error");
            return undefined;
        }

        return result.data?.boards ?? [];
    });

    let currentBoard = createMemo(() => {
        if (!location.pathname.startsWith("/boards/")) return null;
        let after = location.pathname.slice("/boards".length + 1);
        let i = after.indexOf("/");
        if (i >= 0) {
            return after.slice(0, i);
        } else {
            return after;
        }
    });

    return (
        <div class="drawer w-fit items-center mx-2">
            <input ref={drawerToggle} id="board-drawer" type="checkbox" class="drawer-toggle" />
            <div class="drawer-content">
                <label for="board-drawer" class="btn btn-primary h-lh box-content">
                    Boards
                </label>
            </div>

            <div class="drawer-side">
                <label for="board-drawer" aria-label="close sidebar" class="drawer-overlay"></label>
                <ul class="menu bg-base-200 min-h-full w-80 p-4 justify-between">
                    <Show when={boards.loading}>
                        <span class="loading loading-spinner loading-lg" />
                    </Show>

                    <Show when={!boards.loading && boards()}>
                        <div>
                            <For each={boards()}>
                                {board => (
                                    <li class="list-row">
                                        <A
                                            class={
                                                "font-bold" +
                                                (board.id.toString() == currentBoard()
                                                    ? " menu-active"
                                                    : "")
                                            }
                                            href={`/boards/${board.id}`}
                                            onClick={closeDrawer}
                                        >
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
