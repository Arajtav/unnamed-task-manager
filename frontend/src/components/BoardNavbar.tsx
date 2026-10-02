import { A } from "@solidjs/router";
import { Setter } from "solid-js";
import { useBoard } from "../contexts/boardContext";

export default function BoardNavbar({ setCreateTask }: { setCreateTask: Setter<boolean> }) {
    let [board] = useBoard();

    return (
        <div class="navbar flex flex-row gap-4 bg-base-200">
            <A href={`/boards/${board.id}/settings`}>Settings</A>
            <div class="btn btn-accent h-lh box-content" onClick={() => setCreateTask(true)}>
                Create Task
            </div>
        </div>
    );
}
