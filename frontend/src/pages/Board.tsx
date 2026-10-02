import { createSignal, For, Show } from "solid-js";
import Task from "../components/Task";
import FullTask from "../components/FullTask";
import { useBoard } from "../contexts/boardContext";

export default function Board() {
    const [board] = useBoard();

    const [viewTask, setViewTask] = createSignal<number | null>(null);

    return (
        <>
            <div class="flex flex-col w-full h-full">
                <div class="flex flex-row w-full h-full">
                    <For each={board.taskStatus}>
                        {status => (
                            <div class="flex flex-col w-80 min-w-80 h-full">
                                <h3>{status.name}</h3>

                                <ul class="list bg-base-100 rounded-box">
                                    <For
                                        each={board.tasks.filter(
                                            task => task.status == status.name
                                        )}
                                    >
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
                            </div>
                        )}
                    </For>
                </div>
            </div>

            <Show when={viewTask() != null}>
                {_ => <FullTask id={viewTask()!} setId={setViewTask} />}
            </Show>
        </>
    );
}
