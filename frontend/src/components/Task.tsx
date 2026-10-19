import { createMemo, Show } from "solid-js";
import { Task as TaskT } from "../contexts/boardContext";
import { formatDuration } from "../format";
import Avatar from "../newComponents/Avatar";

export default function Task({ task }: { task: TaskT }) {
    const timeTracked = createMemo(() => task.timeLogged.reduce((acc, e) => acc + e.time, 0));

    return (
        <div class={task.isArchived ? "opacity-50" : ""}>
            <p class="font-bold">{task.title}</p>
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
            <p>Created at: {task.createdAt.toISOString()}</p>
            <p>Time logged: {formatDuration(timeTracked())}</p>
        </div>
    );
}
