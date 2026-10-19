import { A, useLocation, useParams } from "@solidjs/router";
import { createMemo, For } from "solid-js";
import { useAppData } from "../contexts/appDataContext";

type Crumb = { label: string; href: string };

type RouteData =
    | { place: "boards"; id: number }
    | { place: "boards"; id: number; settings: true }
    | { place: "boards"; id: number; task: number }
    | { place: "boards"; id: "new" }
    | { place: "settings" }
    | { place: "users" }
    | { place: "home" };

export default function Breadcrumbs() {
    const location = useLocation();
    const params = useParams<{ id?: string; taskId?: string }>();
    const [{ boards }] = useAppData();

    const routeData = createMemo((): RouteData => {
        const path = location.pathname;

        if (path == "/settings") return { place: "settings" };
        if (path == "/users") return { place: "users" };
        if (path == "/boards/create") return { place: "boards", id: "new" };

        if (path.startsWith("/boards/")) {
            const boardId = Number(params.id);

            if (path.endsWith("/settings")) {
                return { place: "boards", id: boardId, settings: true };
            }

            const task = Number(params.taskId);
            if (Number.isInteger(task) && task >= 0) {
                return { place: "boards", id: boardId, task };
            }

            return { place: "boards", id: boardId };
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

                if ("settings" in data) {
                    items.push({ label: "Settings", href: `/boards/${data.id}/settings` });
                } else if ("task" in data) {
                    items.push({
                        label: String(data.task),
                        href: `/boards/${data.id}/${data.task}`,
                    });
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
