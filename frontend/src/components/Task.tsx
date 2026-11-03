import { createMemo, For, Show } from "solid-js";
import Avatar from "../newComponents/Avatar";
import DateTime from "./DateTime";
import Badge from "../newComponents/Badge";
import { useTimeTracking } from "../contexts/clientAppDataContext";
import { useBoardNav } from "../contexts/boardNavContext";
import { PreviewTask } from "../gqlTypes";
import { t } from "../i18n";

export default function Task(props: { task: PreviewTask }) {
    const timeTracked = createMemo(() => props.task.timeLogged.reduce((acc, e) => acc + e.time, 0));
    const timeTracking = useTimeTracking();

    const [_, setBoardNav] = useBoardNav();

    return (
        <div class="indicator w-full">
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
        </div>
    );
}
