import { A } from "@solidjs/router";

export default function BoardNavbar(props: { boardId: number }) {
    return (
        <div class="navbar bg-base-200">
            <A href={`/boards/${props.boardId}/settings`}>Settings</A>
        </div>
    );
}
