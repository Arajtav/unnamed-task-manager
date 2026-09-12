import { A, useLocation, useParams } from "@solidjs/router";
import { createMemo, createResource, For } from "solid-js";
import { boardQuery } from "../graphql/client";

type Crumb = { label: string; href: string };

export default function Breadcrumbs() {
    const location = useLocation();
    const params = useParams<{ id?: string }>();

    const boardId = createMemo(() => (location.pathname.startsWith("/boards/") ? params.id : undefined));

    const [board] = createResource(boardId, async (id) => {
        const result = await boardQuery(Number(id));
        return result.data?.board ?? null;
    });

    const crumbs = createMemo<Crumb[]>(() => {
        const path = location.pathname;
        const items: Crumb[] = [{ label: "Home", href: "/" }];

        if (path === "/login") {
            items.push({ label: "Login", href: "/login" });
        } else if (path === "/boards") {
            items.push({ label: "Boards", href: "/boards" });
        } else if (boardId()) {
            items.push({ label: "Boards", href: "/boards" });
            items.push({ label: board()?.name ?? boardId()!, href: path });
        }

        return items;
    });

    return (
        <div class="breadcrumbs text-sm px-2">
            <ul>
                <For each={crumbs()}>
                    {(crumb) => (
                        <li>
                            <A href={crumb.href} end>
                                {crumb.label}
                            </A>
                        </li>
                    )}
                </For>
            </ul>
        </div>
    );
}
