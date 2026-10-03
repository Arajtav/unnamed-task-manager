import { A } from "@solidjs/router";
import { Setter } from "solid-js";
import { useBoard } from "../contexts/boardContext";
import { PlusIcon, SettingsIcon } from "lucide-solid";

export default function BoardNavbar({ setCreateTask }: { setCreateTask: Setter<boolean> }) {
    const [board] = useBoard();

    return (
        <div class="navbar flex flex-row justify-between bg-base-200">
            <div>
                <div class="btn btn-accent" onClick={() => setCreateTask(true)}>
                    <PlusIcon strokeWidth={1.5} />
                    Add task
                </div>
            </div>
            <A class="m-2" href={`/boards/${board.id}/settings`}>
                <SettingsIcon strokeWidth={1.5} />
            </A>
        </div>
    );
}

// TODO: Move add task to columns. That will also remove one nesting layer for invalid board config from TaskForm.
