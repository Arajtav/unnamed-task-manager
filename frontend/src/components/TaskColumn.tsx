import { For, Setter } from "solid-js";
import Task from "./Task";
import Badge from "../newComponents/Badge";
import { PlusIcon } from "lucide-solid";
import { textColor } from "../../colors";
import { PreviewTask, TaskStatus } from "../gqlTypes";

export default function TaskColumn(props: {
    status: TaskStatus;
    tasks: PreviewTask[];
    setViewTask: Setter<number>;
    createTask: (status: string) => void;
    onMoveTask: (id: number, status: string) => void;
}) {
    const handleDragOver = (e: DragEvent) => {
        e.preventDefault();
        e.dataTransfer!.dropEffect = "move";
    };

    const handleDrop = (e: DragEvent) => {
        e.preventDefault();

        const taskId = Number(e.dataTransfer?.getData("text/plain"));

        if (!Number.isNaN(taskId)) {
            props.onMoveTask(taskId, props.status.name);
        }
    };

    return (
        <div
            class="flex flex-col flex-1 min-w-80 rounded-xl p-2 bg-base-200"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
        >
            <div class="w-full flex flex-row gap-2">
                <div class="flex flex-1 flex-row gap-2 my-4">
                    <Badge
                        text={props.tasks.length.toString()}
                        class="proportional-num border-0!"
                        style={{
                            "background-color": props.status.color,
                            color: textColor(props.status.color),
                        }}
                    />
                    <h3 class="self-center">{props.status.name}</h3>
                </div>
                <div class="btn btn-ghost" onClick={() => props.createTask(props.status.name)}>
                    <PlusIcon strokeWidth={1.5} />
                </div>
            </div>

            <ul class="list">
                <For
                    each={props.tasks.toSorted((a, b) => {
                        // Archived below.
                        if ((a.archivedAt != null) != (b.archivedAt != null)) {
                            return a.archivedAt == null ? -1 : 1;
                        }

                        // Archived: most recently archived on top.
                        if (a.archivedAt != null && b.archivedAt != null) {
                            return b.archivedAt.getTime() - a.archivedAt.getTime();
                        }

                        // Unarchived: highest priority on top.
                        if (a.priority != b.priority) {
                            return b.priority - a.priority;
                        }

                        // Same priority: oldest on top.
                        return a.createdAt.getTime() - b.createdAt.getTime();
                    })}
                >
                    {task => (
                        <li
                            class={`list-row flex flex-col my-1 ${task.isBlocked && !task.archivedAt ? "bg-warning/20" : "bg-base-300"}`}
                            draggable={!task.archivedAt}
                            onDragStart={e => {
                                e.dataTransfer?.setData("text/plain", task.id.toString());

                                if (e.dataTransfer) {
                                    e.dataTransfer.effectAllowed = "move";
                                }
                            }}
                            onClick={() => props.setViewTask(task.id)}
                        >
                            <Task task={task} />
                        </li>
                    )}
                </For>
            </ul>
        </div>
    );
}
