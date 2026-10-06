import { Show } from "solid-js";
import User from "../newComponents/User";
import { Task } from "./FullTask";

export default function TaskDetails(props: { task: Task; onEdit: () => void; onClose: () => void }) {
    const task = props.task;

    return (
        <>
            <h3 class="text-xl font-bold">{task.title}</h3>

            <div class="divider" />

            <div class="space-y-4">
                <div>
                    <div class="text-sm font-semibold text-base-content/70">Description</div>
                    <p class="mt-1 whitespace-pre-wrap">{task.description || "No description provided."}</p>
                </div>

                <div>
                    <div class="text-sm font-semibold text-base-content/70">Author</div>
                    <User
                        user={{
                            emails: [task.author.email],
                            handle: task.author.user?.handle,
                        }}
                    />
                </div>

                <div>
                    <div class="text-sm font-semibold text-base-content/70">Assigned to</div>
                    <div>
                        <Show when={task.assignee} fallback={<p class="mt-2">No one</p>}>
                            {(assignee) => (
                                <>
                                    <User
                                        user={{
                                            emails: [assignee().email],
                                            handle: assignee().user?.handle,
                                        }}
                                    />
                                </>
                            )}
                        </Show>
                    </div>
                </div>

                <div>
                    <div class="text-sm font-semibold text-base-content/70">Status</div>
                    <div class="mt-1">{task.status}</div>
                </div>

                <div>
                    <div class="text-sm font-semibold text-base-content/70">Created</div>
                    <div class="mt-1">{task.createdAt.toLocaleString()}</div>
                </div>
            </div>

            <div class="flex flex-row gap-2">
                <div class="modal-action">
                    <button class="btn btn-warning" onClick={props.onClose}>
                        Close
                    </button>
                </div>
                <div class="modal-action">
                    <button class="btn btn-primary" onClick={props.onEdit}>
                        Edit
                    </button>
                </div>
            </div>
        </>
    );
}
