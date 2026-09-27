import { For, Show } from "solid-js";
import TaskForm from "../components/TaskForm";
import { useBoard } from "./BoardLayout";

export default function Board() {
    let [board, setBoard] = useBoard();

    return (
        <div class="flex items-start justify-center pt-8 w-full h-full">
            <div class="flex flex-col gap-8">
                <p class="text-center font-bold">{board.name}</p>

                <TaskForm
                    boardId={board.id}
                    onCreated={task => setBoard("tasks", tasks => [...tasks, task])}
                />

                <Show when={board.tasks.length > 0}>
                    <ul class="list bg-base-100 rounded-box">
                        <For each={board.tasks}>
                            {task => (
                                <li class="list-row flex flex-col">
                                    <div>
                                        <p class="font-bold">{task.title}</p>
                                        <p>Author: {task.author}</p>
                                        <p>Created at: {new Date(task.createdAt).toISOString()}</p>
                                    </div>
                                </li>
                            )}
                        </For>
                    </ul>
                </Show>
            </div>
        </div>
    );
}
