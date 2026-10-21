import { createMemo, For, Show } from "solid-js";
import { Task as TaskT } from "../contexts/boardContext";
import { formatDuration } from "../format";
import Avatar from "../newComponents/Avatar";
import DateTime from "./DateTime";
import Badge from "../newComponents/Badge";
import { useTimeTracking } from "../contexts/clientAppDataContext";

export default function Task({ task }: { task: TaskT }) {
    const timeTracked = createMemo(() => task.timeLogged.reduce((acc, e) => acc + e.time, 0));
    const timeTracking = useTimeTracking();

    return (
        <div class="indicator w-full">
            <Show when={timeTracking.isTracking(task.id)}>
                <span class="indicator-item status status-xl status-success"></span>
            </Show>
            <div class={task.isArchived ? "opacity-50" : ""}>
                <p class="font-bold">{task.title}</p>
                <For each={task.labels}>
                    {label => <Badge text={label} class="border-base-300/50" />}
                </For>
                <p>
                    Author: <Avatar user={task.author} title={{ option: "auto" }} />
                </p>
                <Show when={task.assignee}>
                    {assignee => (
                        <p>
                            Assignee: <Avatar user={assignee()} title={{ option: "auto" }} />
                        </p>
                    )}
                </Show>
                <div class="flex flex-row gap-[1ch]">
                    <span>Created:</span>
                    <DateTime datetime={task.createdAt} imprecise={true} />
                </div>
                <p>Time logged: {formatDuration(timeTracked())}</p>
            </div>
        </div>
    );
}
