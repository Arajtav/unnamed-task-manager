import { A, useLocation, useParams } from "@solidjs/router";
import { createMemo, For } from "solid-js";
import { useBoards } from "../contexts/boardsContext";

type Crumb = { label: string; href: string };

export default function Breadcrumbs() {
    const location = useLocation();
    const params = useParams<{ id?: string }>();
    const [boards] = useBoards();

    const boardId = createMemo(() =>
        location.pathname.startsWith("/boards/") ? params.id : undefined
    );

    const board = createMemo(() => {
        let id = boardId();

        if (id) {
            return boards().get(id);
        } else {
            return undefined;
        }
    });

    const crumbs = createMemo<Crumb[]>(() => {
        const path = location.pathname;
        const items: Crumb[] = [{ label: "Home", href: "/" }];

        if (path == "/login") {
            items.push({ label: "Login", href: "/login" });
        } else if (path == "/boards/create") {
            items.push({ label: "Create Board", href: "boards/create" });
        } else if (boardId()) {
            items.push({ label: board() ?? boardId()!, href: path });
        }

        return items;
    });

    return (
        <div class="breadcrumbs">
            <ul>
                <For each={crumbs()}>
                    {crumb => (
                        <li>
                            <A href={crumb.href}>{crumb.label}</A>
                        </li>
                    )}
                </For>
            </ul>
        </div>
    );
}

// TODO: show /settings or something or at least make it so you can go back from them
// TODO: what did I even do a CR, make it show board name not id.
// TODO: well now what tasks can be open display them too.
