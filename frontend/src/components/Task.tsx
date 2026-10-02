import { Show } from "solid-js";
import Avatar from "./Avatar";
import { Task as TaskT } from "../contexts/boardContext";

export default function Task({ task }: { task: TaskT }) {
    return (
        <div>
            <p class="font-bold">{task.title}</p>
            <p>
                Author: <Avatar user={task.author.user?.handle ?? task.author.email} />
            </p>
            <p>Status: {task.status}</p>
            <p>
                Assignee:{" "}
                <Show when={task.assignee} fallback={"No one is assigned to this task"}>
                    {assignee => <Avatar user={assignee().user?.handle ?? assignee().email} />}
                </Show>
            </p>
            <p>Created at: {task.createdAt.toISOString()}</p>
        </div>
    );
}
