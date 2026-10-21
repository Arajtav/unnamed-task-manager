import { A, useMatch } from "@solidjs/router";
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

const INT = /^\d+$/;

export default function Breadcrumbs() {
    const [appData] = useAppData();

    const settingsMatch = useMatch(() => "/settings");
    const usersMatch = useMatch(() => "/users");
    const createMatch = useMatch(() => "/boards/create");
    const boardSettingsMatch = useMatch(() => "/boards/:id/settings", { id: INT });
    const taskMatch = useMatch(() => "/boards/:id/:taskId", { id: INT, taskId: INT });
    const boardMatch = useMatch(() => "/boards/:id", { id: INT });

    const routeData = createMemo((): RouteData => {
        if (settingsMatch()) return { place: "settings" };
        if (usersMatch()) return { place: "users" };
        if (createMatch()) return { place: "boards", id: "new" };

        const bs = boardSettingsMatch();
        if (bs) return { place: "boards", id: Number(bs.params.id), settings: true };

        const t = taskMatch();
        if (t) {
            return {
                place: "boards",
                id: Number(t.params.id),
                task: Number(t.params.taskId),
            };
        }

        const b = boardMatch();
        if (b) return { place: "boards", id: Number(b.params.id) };

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
                const board = appData.boards.get(data.id);

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
