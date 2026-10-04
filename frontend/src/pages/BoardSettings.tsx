import BoardMembers from "../components/BoardMembers";
import TaskStatuses from "../components/TaskStatuses";

export default function BoardSettings() {
    return (
        <div class="w-full h-full flex flex-row">
            <ul class="menu bg-base-200 w-56 h-full">
                <li>
                    <a class="menu-active">Members</a>
                </li>
            </ul>

            <div class="flex-1 p-6 gap-6 flex flex-col overflow-y-scroll h-full">
                <BoardMembers />
                <TaskStatuses />
            </div>
        </div>
    );
}
