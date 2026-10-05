import { createSignal, For, Setter, Show } from "solid-js";
import FullTask from "../components/FullTask";
import { useBoard } from "../contexts/boardContext";
import { useBoardNav } from "../contexts/boardNavContext";
import TaskColumn from "../components/TaskColumn";

export default function Board() {
    const [board] = useBoard();
    const [boardNav] = useBoardNav();

    const [viewTask, setViewTask] = createSignal<number | null>(null);

    return (
        <>
            <div class="flex flex-row w-full h-auto gap-4 m-4">
                <For each={board.taskStatus}>
                    {status => (
                        <TaskColumn
                            status={status}
                            setViewTask={setViewTask as Setter<number>}
                            tasks={board.tasks.filter(
                                task =>
                                    task.status == status.name &&
                                    (boardNav.showArchived || !task.isArchived)
                            )}
                        />
                    )}
                </For>
            </div>

            <Show when={viewTask() != null}>
                {_ => <FullTask id={viewTask()!} setId={setViewTask} />}
            </Show>
        </>
    );
}
