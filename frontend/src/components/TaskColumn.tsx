import { For, Setter } from "solid-js";
import { Task as TaskT, TaskStatus } from "../contexts/boardContext";
import Task from "./Task";

export default function TaskColumn(props: {
    status: TaskStatus;
    tasks: TaskT[];
    setViewTask: Setter<number>;
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
            class="flex flex-col w-80 min-w-80 rounded-xl p-2 bg-base-200"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
        >
            <div class="w-full flex flex-row gap-1 my-4">
                <div class="aspect-square h-lh flex items-center justify-center">
                    <div
                        class="h-2/3 w-2/3 rounded-full"
                        style={{ "background-color": props.status.color }}
                    />
                </div>
                <h3 class="capitalize">{props.status.name}</h3>
            </div>

            <ul class="list">
                <For
                    each={props.tasks.toSorted((a, b) => {
                        // Archived below.
                        if (a.isArchived != b.isArchived) {
                            return a.isArchived ? 1 : -1;
                        }

                        // Oldest on top.
                        return a.createdAt.getTime() - b.createdAt.getTime();
                    })}
                >
                    {task => (
                        <li
                            class="list-row flex flex-col my-1 bg-base-300"
                            draggable={!task.isArchived}
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
