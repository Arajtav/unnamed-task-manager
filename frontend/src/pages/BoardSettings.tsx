import BoardMembers from "../components/BoardMembers";
import TaskStatuses from "../components/TaskStatuses";
import { Title } from "@solidjs/meta";
import { useBoard } from "../contexts/boardContext";
import { t } from "../i18n";

export default function BoardSettings() {
    const [{ name }] = useBoard();

    return (
        <div class="w-full h-full flex flex-row">
            <Title>{t("boardSettings.title", name)}</Title>
            <ul class="menu bg-base-200 w-56 h-full">
                <li>
                    <a class="menu-active">{t("boardSettings.tabs.members.title")}</a>
                </li>
            </ul>

            <div class="flex-1 p-6 gap-6 flex flex-col overflow-y-scroll h-full">
                <BoardMembers />
                <TaskStatuses />
            </div>
        </div>
    );
}
