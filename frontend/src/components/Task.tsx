import { Show } from "solid-js";
import Avatar from "./Avatar";
import { Task as TaskT } from "../contexts/boardContext";
import { formatDuration } from "../format";

export default function Task({ task }: { task: TaskT }) {
    const timeTracked = task.timeLogged.reduce((acc, e) => acc + e.time, 0);

    return (
        <div class={task.isArchived ? "opacity-50" : ""}>
            <p class="font-bold">{task.title}</p>
            <p>
                Author: <Avatar user={task.author.user?.handle ?? task.author.email} />
            </p>
            <p>
                Assignee:{" "}
                <Show when={task.assignee} fallback={"No one is assigned to this task"}>
                    {assignee => <Avatar user={assignee().user?.handle ?? assignee().email} />}
                </Show>
            </p>
            <p>Created at: {task.createdAt.toISOString()}</p>
            <p>Time logged: {formatDuration(timeTracked)}</p>
        </div>
    );
}
