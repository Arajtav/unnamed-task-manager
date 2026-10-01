import { For, Show } from "solid-js";
import { useBoard } from "./BoardLayout";
import Task from "../components/Task";

export default function Board() {
    let [board] = useBoard();

    return (
        <div class="flex items-start justify-center pt-8 w-full h-full">
            <div class="flex flex-col gap-8">
                <p class="text-center font-bold">{board.name}</p>

                <Show when={board.tasks.length > 0}>
                    <ul class="list bg-base-100 rounded-box">
                        <For each={board.tasks}>
                            {task => (
                                <li class="list-row flex flex-col">
                                    <Task task={task} />
                                </li>
                            )}
                        </For>
                    </ul>
                </Show>
            </div>
        </div>
    );
}
