import { createMemo, For } from "solid-js";
import { A, useMatch } from "@solidjs/router";
import { PanelLeftIcon } from "lucide-solid";
import { useAppData } from "../contexts/appDataContext";

export default function Drawer() {
    const [appData] = useAppData();

    const boardsSorted = createMemo(() => {
        return [...appData.boards].sort((a, b) => a[1].localeCompare(b[1]));
    });

    // eslint-disable-next-line no-unassigned-vars
    let drawerToggle!: HTMLInputElement;

    function closeDrawer() {
        if (drawerToggle) drawerToggle.checked = false;
    }

    const exact = useMatch(() => "/boards/:id", { id: /^\d+$/ });
    const nested = useMatch(() => "/boards/:id/*", { id: /^\d+$/ });

    const currentBoard = createMemo<number | null>(() => {
        const id = (exact() ?? nested())?.params.id;
        return id === undefined ? null : Number(id);
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
                    <A
                        class={`btn ${appData.me.isAdmin ? "btn-accent" : "btn-disabled"}`}
                        href="/boards/create"
                        onClick={closeDrawer}
                    >
                        Create Board
                    </A>
                </ul>
            </div>
        </div>
    );
}
