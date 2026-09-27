import { A } from "@solidjs/router";
import { useBoard } from "../pages/BoardLayout";

export default function BoardNavbar() {
    let [board] = useBoard();

    return (
        <div class="navbar bg-base-200">
            <A href={`/boards/${board.id}/settings`}>Settings</A>
        </div>
    );
}
