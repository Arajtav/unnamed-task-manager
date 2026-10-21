import { A } from "@solidjs/router";
import { useBoard } from "../contexts/boardContext";
import { SettingsIcon } from "lucide-solid";
import { useBoardNav } from "../contexts/boardNavContext";
import { createMemo } from "solid-js";
import { useAppData } from "../contexts/appDataContext";

export default function BoardNavbar() {
    const [board] = useBoard();
    const [boardNav, setBoardNav] = useBoardNav();
    const [{ me }] = useAppData();

    const modOrAdmin = createMemo(
        () => me.isAdmin || board.access.find(a => a.user.id == me.id)?.isModerator
    );

    return (
        <div class="navbar flex flex-row justify-between bg-base-200 gap-4">
            <div class="flex flex-row gap-4 flex-1">
                <input
                    class="w-full input"
                    value={boardNav.search}
                    placeholder="Search..."
                    onInput={e => setBoardNav("search", e.currentTarget.value)}
                ></input>
            </div>

            <A
                class={`btn btn-square ${modOrAdmin() ? "btn-primary" : "btn-disabled"}`}
                href={`/boards/${board.id}/settings`}
            >
                <SettingsIcon strokeWidth={1.5} />
            </A>
        </div>
    );
}

// TODO: Move add task to columns. That will also remove one nesting layer for invalid board config from TaskForm.
