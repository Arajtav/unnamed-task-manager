import { createSignal, For, Show } from "solid-js";
import { useBoard } from "./BoardLayout";
import Task from "../components/Task";
import FullTask from "../components/FullTask";

export default function Board() {
    let [board] = useBoard();

    const [viewTask, setViewTask] = createSignal<number | null>(null);

    return (
        <>
            <div class="flex items-start justify-center pt-8 w-full h-full">
                <div class="flex flex-col gap-8">
                    <p class="text-center font-bold">{board.name}</p>

                    <Show when={board.tasks.length > 0}>
                        <ul class="list bg-base-100 rounded-box">
                            <For each={board.tasks}>
                                {task => (
                                    <li
                                        class="list-row flex flex-col"
                                        onClick={() => setViewTask(task.id)}
                                    >
                                        <Task task={task} />
                                    </li>
                                )}
                            </For>
                        </ul>
                    </Show>
                </div>
            </div>
            <Show when={viewTask() !== null}>
                {_ => (
                    <div class="fixed inset-0 h-screen w-screen flex items-center justify-center">
                        <FullTask id={viewTask()!} setId={setViewTask} />
                    </div>
                )}
            </Show>
        </>
    );
}
