import { A, useLocation, useParams } from "@solidjs/router";
import { createMemo, For } from "solid-js";
import { useAppData } from "../contexts/appDataContext";

type Crumb = { label: string; href: string };

type RouteData =
    | { place: "boards"; id: number; settings: boolean }
    | { place: "boards"; id: "new" }
    | { place: "settings" }
    | { place: "users" }
    | { place: "home" };

export default function Breadcrumbs() {
    const location = useLocation();
    const params = useParams<{ id?: string }>();
    const [{ boards }] = useAppData();

    const routeData = createMemo((): RouteData => {
        const path = location.pathname;

        if (path == "/settings") return { place: "settings" };
        if (path == "/users") return { place: "users" };
        if (path == "/boards/create") return { place: "boards", id: "new" };

        if (path.startsWith("/boards/")) {
            return {
                place: "boards",
                id: Number(params.id),
                settings: path.endsWith("/settings"),
            };
        }

        return { place: "home" };
    });

    const crumbs = createMemo(() => {
        const data = routeData();
        const items: Crumb[] = [{ label: "Home", href: "/" }];

        if (data.place == "settings") {
            items.push({ label: "Settings", href: "/settings" });
        } else if (data.place == "users") {
            items.push({ label: "Users", href: "/users" });
        } else if (data.place == "boards") {
            if (data.id == "new") {
                items.push({ label: "Create Board", href: "/boards/create" });
            } else {
                const board = boards.get(data.id);
                if (board !== undefined) {
                    items.push({ label: board, href: `/boards/${data.id}` });
                }
                if (data.settings) {
                    items.push({ label: "Settings", href: `/boards/${data.id}/settings` });
                }
            }
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
