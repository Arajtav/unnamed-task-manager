import { createSignal, For, Show } from "solid-js";
import User from "../newComponents/User";
import { CircleXIcon, XIcon } from "lucide-solid";
import { useBoard } from "../contexts/boardContext";
import { gqlClient } from "../graphql";
import { gql } from "@urql/core";
import { handleAuthError } from "../auth";
import { useAlert } from "../contexts/alertContext";
import { SetStoreFunction } from "solid-js/store";
import DateTime from "./DateTime";
import { CompleteTask, MinimalTaskRaw, processMinimalTask, TimeTrackingEntry } from "../gqlTypes";
import { t } from "../i18n";

export default function TaskDetails(props: {
    task: CompleteTask;
    onEdit: () => void;
    onClose: () => void;
    onLogTime: () => void;
    save: SetStoreFunction<{
        task: CompleteTask;
        time: TimeTrackingEntry[];
    }>;
}) {
    const [board] = useBoard();
    const { addAlert } = useAlert();

    const [selectedTaskId, setSelectedTaskId] = createSignal("");

    async function block(by: number) {
        const result = await gqlClient.mutation<{
            addTaskBlock: { blockedBy: MinimalTaskRaw[] };
        }>(
            gql`
                mutation AddTaskBlock($taskId: Int!, $blockedBy: Int!) {
                    addTaskBlock(taskId: $taskId, blockedBy: $blockedBy) {
                        blockedBy {
                            id
                            title
                            status
                            archivedAt
                        }
                    }
                }
            `,
            { taskId: props.task.id, blockedBy: by }
        );

        if (handleAuthError(result.error) || !result.data) {
            addAlert({
                type: "error",
                title: "Failed to update task",
                content: "Try again later.",
                icon: CircleXIcon,
            });
            return null;
        }

        const updated = result.data.addTaskBlock.blockedBy;

        props.save(
            "task",
            "blockedBy",
            updated.map(m => processMinimalTask(m))
        );
    }

    async function unblock(by: number) {
        const result = await gqlClient.mutation<{
            removeTaskBlock: { blockedBy: MinimalTaskRaw[] };
        }>(
            gql`
                mutation RemoveTaskBlock($taskId: Int!, $blockedBy: Int!) {
                    removeTaskBlock(taskId: $taskId, blockedBy: $blockedBy) {
                        blockedBy {
                            id
                            title
                            status
                            archivedAt
                        }
                    }
                }
            `,
            { taskId: props.task.id, blockedBy: by }
        );

        if (handleAuthError(result.error) || !result.data) {
            addAlert({
                type: "error",
                title: "Failed to update task",
                content: "Try again later.",
                icon: CircleXIcon,
            });
            return null;
        }

        const updated = result.data.removeTaskBlock.blockedBy;

        props.save(
            "task",
            "blockedBy",
            updated.map(m => processMinimalTask(m))
        );
    }

    return (
        <>
            <h3 class="text-xl font-bold">{props.task.title}</h3>

            <div class="divider" />

            <div class="space-y-4">
                <div>
                    <div class="text-sm font-semibold text-base-content/70">
                        {t("taskDetails.descriptionLabel")}
                    </div>
                    <p class="mt-1 whitespace-pre-wrap">
                        {t("taskDetails.description", props.task.description)}
                    </p>
                </div>

                <div>
                    <div class="text-sm font-semibold text-base-content/70">
                        {t("taskDetails.author")}
                    </div>
                    <User
                        user={{
                            id: props.task.author.user?.id,
                            emails: [props.task.author.email],
                            handle: props.task.author.user?.handle,
                        }}
                    />
                </div>

                <div>
                    <div class="text-sm font-semibold text-base-content/70">
                        {t("taskDetails.assignedTo")}
                    </div>
                    <div>
                        <For
                            each={props.task.assignees}
                            fallback={<p class="mt-2">{t("taskDetails.noOne")}</p>}
                        >
                            {assignee => (
                                <>
                                    <User
                                        user={{
                                            id: assignee.user?.id,
                                            emails: [assignee.email],
                                            handle: assignee.user?.handle,
                                        }}
                                    />
                                </>
                            )}
                        </For>
                    </div>
                </div>

                <div>
                    <div class="text-sm font-semibold text-base-content/70">
                        {t("taskDetails.status")}
                    </div>
                    <div class="mt-1">{props.task.status}</div>
                </div>

                <div>
                    <div class="text-sm font-semibold text-base-content/70">
                        {t("taskDetails.priorityLabel")}
                    </div>
                    <div class="mt-1"> {t("taskDetails.priority", props.task.priority)}</div>
                </div>

                <Show when={props.task.estimatedTime}>
                    {estimatedTime => (
                        <div>
                            <div class="text-sm font-semibold text-base-content/70">
                                {t("taskDetails.estimatedTimeLabel")}
                            </div>
                            <div class="mt-1">
                                {t("taskDetails.estimatedTime", estimatedTime())}
                            </div>
                        </div>
                    )}
                </Show>

                <div>
                    <div class="text-sm font-semibold text-base-content/70">
                        {t("taskDetails.created")}
                    </div>
                    <div class="mt-1">
                        <DateTime datetime={props.task.createdAt} />
                    </div>
                </div>

                <Show when={props.task.archivedAt}>
                    {archivedAt => (
                        <div>
                            <div class="text-sm font-semibold text-base-content/70">
                                {t("taskDetails.archived")}
                            </div>
                            <div class="mt-1">
                                <DateTime datetime={archivedAt()} />
                            </div>
                        </div>
                    )}
                </Show>

                <div>
                    <div class="text-sm font-semibold text-base-content/70">
                        {t("taskDetails.blockedBy")}
                    </div>
                    <ul class="mt-1 list bg-base-100 rounded-box mb-4">
                        <For each={props.task.blockedBy}>
                            {taskBlock => (
                                <li class="list-row">
                                    <div class="list-col-grow">{taskBlock.title}</div>

                                    <div />

                                    <button
                                        class="btn btn-square btn-ghost"
                                        onClick={() => unblock(taskBlock.id)}
                                    >
                                        <XIcon strokeWidth={1.5} />
                                    </button>
                                </li>
                            )}
                        </For>
                    </ul>
                    <div class="flex gap-2 items-center w-full">
                        <select
                            class="select flex-1"
                            value={selectedTaskId()}
                            onInput={e => setSelectedTaskId(e.currentTarget.value)}
                        >
                            <option disabled selected value="">
                                {t("taskDetails.selectTask")}
                            </option>
                            <For
                                each={board.tasks
                                    .filter(
                                        task =>
                                            !task.archivedAt &&
                                            task.id != props.task.id &&
                                            !props.task.blockedBy.some(b => b.id == task.id)
                                    )
                                    .toSorted((a, b) => a.title.localeCompare(b.title))}
                            >
                                {task => <option value={task.id}>{task.title}</option>}
                            </For>
                        </select>
                        <button
                            class="btn btn-accent"
                            onClick={() => {
                                block(Number(selectedTaskId()));
                                setSelectedTaskId("");
                            }}
                            disabled={selectedTaskId() == ""}
                        >
                            {t("taskDetails.add")}
                        </button>
                    </div>
                </div>

                <div>
                    <div class="text-sm font-semibold text-base-content/70">
                        {t("taskDetails.timeLoggedLabel")}
                    </div>
                    <div class="flex flex-col w-full mt-2">
                        <For each={props.task.timeLogged}>
                            {e => (
                                <div class="flex flex-row w-full">
                                    <div class="flex-1">
                                        <User user={e.user} />
                                    </div>
                                    <div class="self-center">
                                        {t("taskDetails.timeLogged", e.time)}
                                    </div>
                                </div>
                            )}
                        </For>
                    </div>
                </div>
            </div>

            <div class="flex flex-row gap-2">
                <div class="modal-action">
                    <button class="btn btn-primary" onClick={() => props.onEdit()}>
                        {t("taskDetails.edit")}
                    </button>
                    <button class="btn btn-primary" onClick={() => props.onLogTime()}>
                        {t("taskDetails.logTime")}
                    </button>
                </div>
            </div>
        </>
    );
}
