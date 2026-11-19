import { createMemo, For, onCleanup, Show } from "solid-js";
import Avatar from "../newComponents/Avatar";
import DateTime from "./DateTime";
import Badge from "../newComponents/Badge";
import { useTimeTracking } from "../contexts/clientAppDataContext";
import { useBoardNav } from "../contexts/boardNavContext";
import { PreviewTask } from "../gqlTypes";
import { t } from "../i18n";
import { useNow } from "../now";
import { useNavigate } from "@solidjs/router";

export default function Task(props: { task: PreviewTask }) {
    const timeTracked = createMemo(() => props.task.timeLogged.reduce((acc, e) => acc + e.time, 0));
    const timeTracking = useTimeTracking();
    const now = useNow();
    const navigate = useNavigate();

    const [_, setBoardNav] = useBoardNav();

    const menuId = () => `task-menu-${props.task.id}`;
    const anchorName = () => `--task-anchor-${props.task.id}`;

    // eslint-disable-next-line no-unassigned-vars
    let menu!: HTMLUListElement;

    const dismiss = (e: PointerEvent) => {
        if (menu.contains(e.target as Node)) return;
        menu.hidePopover();
    };

    const removeListeners = () => {
        document.removeEventListener("pointerdown", dismiss);
    };

    const onToggle = (e: ToggleEvent) => {
        if (e.newState === "open") {
            document.addEventListener("pointerdown", dismiss);
        } else {
            removeListeners();
        }
    };

    onCleanup(removeListeners);

    return (
        <div
            class="indicator w-full"
            style={{ "anchor-name": anchorName() }}
            onContextMenu={e => {
                e.preventDefault();
                e.stopPropagation();
                menu.showPopover();
            }}
        >
            <Show when={timeTracking.isTracking(props.task.id)}>
                <span class="indicator-item status status-xl status-success" />
            </Show>
            <div class={props.task.archivedAt ? "opacity-50" : ""}>
                <p class="font-bold">{props.task.title}</p>
                <For each={props.task.labels}>
                    {label => (
                        <Badge
                            text={label}
                            class="border-base-300/50"
                            onClick={e => {
                                e.stopPropagation();
                                setBoardNav("search", search => `${search} label:${label}`);
                            }}
                        />
                    )}
                </For>
                <p>
                    {t("task.author")}:{" "}
                    <Avatar
                        user={props.task.author}
                        title={{ option: "auto" }}
                        onClick={e => {
                            e.stopPropagation();
                            const email = props.task.author.email;
                            setBoardNav("search", search => `${search} author:${email}`);
                        }}
                    />
                </p>
                <For each={props.task.assignees}>
                    {assignee => (
                        <p>
                            {t("task.assignee")}:{" "}
                            <Avatar
                                user={assignee}
                                title={{ option: "auto" }}
                                onClick={e => {
                                    e.stopPropagation();
                                    setBoardNav(
                                        "search",
                                        search => `${search} assignee:${assignee.email}`
                                    );
                                }}
                            />
                        </p>
                    )}
                </For>
                <p>{t("task.priority", props.task.priority)}</p>
                <div class="flex flex-row gap-[1ch]">
                    <span>{t("task.created")}:</span>
                    <DateTime datetime={props.task.createdAt} imprecise={true} />
                </div>
                <Show when={props.task.archivedAt}>
                    {archivedAt => (
                        <div class="flex flex-row gap-[1ch]">
                            <span>{t("task.archived")}:</span>
                            <DateTime datetime={archivedAt()} imprecise={true} />
                        </div>
                    )}
                </Show>
                <p>{t("task.timeLogged", timeTracked())}</p>
            </div>

            <ul
                ref={menu}
                id={menuId()}
                popover="manual"
                on:toggle={onToggle}
                class="dropdown menu w-sm rounded-box bg-base-200"
                style={{ "position-anchor": anchorName() }}
                onClick={e => {
                    e.stopPropagation();
                    menu.hidePopover();
                }}
            >
                <li>
                    <Show
                        when={timeTracking.isTracking(props.task.id)}
                        fallback={
                            <button onClick={() => timeTracking.start(props.task.id)}>
                                {t("task.menu.startTracking")}
                            </button>
                        }
                    >
                        <button onClick={() => {
                            navigate(`/boards/${boardId}/${props.task.id}`)
                        }}>
                            {t(
                                "task.menu.stopTracking",
                                timeTracking.duration(props.task.id, now()) ?? 0
                            )}
                        </button>
                    </Show>
                </li>
            </ul>
        </div>
    );
}
