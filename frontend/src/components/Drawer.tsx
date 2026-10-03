import { createMemo, For } from "solid-js";
import { A, useLocation } from "@solidjs/router";
import { useBoards } from "../contexts/boardsContext";
import { PanelLeftIcon } from "lucide-solid";

export default function Drawer() {
    const [boards] = useBoards();

    let boardsSorted = createMemo(() => {
        return [...boards()].sort((a, b) => a[1].localeCompare(b[1]));
    });

    const location = useLocation();

    let drawerToggle: HTMLInputElement | undefined;

    function closeDrawer() {
        if (drawerToggle) drawerToggle.checked = false;
    }

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
        <div class="drawer w-fit">
            <input ref={drawerToggle} id="board-drawer" type="checkbox" class="drawer-toggle" />
            <div class="drawer-content">
                <label for="board-drawer" class="btn btn-primary btn-square">
                    <PanelLeftIcon strokeWidth={1.5} />
                </label>
            </div>

            <div class="drawer-side">
                <label for="board-drawer" aria-label="close sidebar" class="drawer-overlay" />
                <ul class="menu bg-base-200 min-h-full w-80 p-4 justify-between">
                    <div>
                        <For each={boardsSorted()}>
                            {board => (
                                <li class="list-row">
                                    <A
                                        class={
                                            "font-bold" +
                                            (board[0] == currentBoard() ? " menu-active" : "")
                                        }
                                        href={`/boards/${board[0]}`}
                                        onClick={closeDrawer}
                                    >
                                        {board[1]}
                                    </A>
                                </li>
                            )}
                        </For>
                    </div>
                    <A class="btn btn-accent" href="/boards/create" onClick={closeDrawer}>
                        Create Board
                    </A>
                </ul>
            </div>
        </div>
    );
}
