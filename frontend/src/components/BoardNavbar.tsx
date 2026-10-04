import { A } from "@solidjs/router";
import { useBoard } from "../contexts/boardContext";
import { PlusIcon, SettingsIcon } from "lucide-solid";
import { useBoardNav } from "../contexts/boardNavContext";

export default function BoardNavbar() {
    const [board] = useBoard();
    const [boardNav, setBoardNav] = useBoardNav();

    return (
        <div class="navbar flex flex-row justify-between bg-base-200">
            <div class="flex flex-row gap-4">
                <div class="btn btn-accent" onClick={() => setBoardNav("createTask", true)}>
                    <PlusIcon strokeWidth={1.5} />
                    Add task
                </div>
                <div class="flex items-center gap-2">
                    Show archived
                    <input
                        type="checkbox"
                        checked={boardNav.showArchived}
                        class="toggle"
                        onChange={e => setBoardNav("showArchived", e.currentTarget.checked)}
                    />
                </div>
            </div>
            <A class="m-2" href={`/boards/${board.id}/settings`}>
                <SettingsIcon strokeWidth={1.5} />
            </A>
        </div>
    );
}

// TODO: Move add task to columns. That will also remove one nesting layer for invalid board config from TaskForm.
