import { createMemo, For, Setter, Show } from "solid-js";
import FullTask from "../components/FullTask";
import { Task, useBoard } from "../contexts/boardContext";
import { useBoardNav } from "../contexts/boardNavContext";
import TaskColumn from "../components/TaskColumn";
import { gqlClient } from "../graphql";
import { gql } from "@urql/core";
import { handleAuthError } from "../auth";
import { useAlert } from "../contexts/alertContext";
import SearchString from "search-string";
import Fuse from "fuse.js";
import { dbg } from "../debug";
import { useNavigate, useParams } from "@solidjs/router";
import { Title } from "@solidjs/meta";

export default function Board() {
    const params = useParams();
    const navigate = useNavigate();
    const [board, setBoard] = useBoard();
    const [boardNav] = useBoardNav();
    const { addAlert } = useAlert();

    // TODO: This won't accept some cursed emails but we probably should not allow them anyways, it was a mistake.
    const filters = createMemo(() => {
        const parsed = SearchString.parse(boardNav.search);

        let archived: boolean | undefined;
        const authors = new Set<string>();
        const notAuthors = new Set<string>();
        const assignees = new Set<string>();
        const notAssignees = new Set<string>();
        const labels = new Set<string>();
        const notLabels = new Set<string>();

        for (const cond of parsed.getConditionArray()) {
            switch (cond.keyword.toLowerCase()) {
                case "archived": {
                    const val = cond.value.toLowerCase() === "true";
                    archived = val != cond.negated;
                    break;
                }
                case "author":
                    if (cond.negated) {
                        notAuthors.add(cond.value);
                    } else {
                        authors.add(cond.value);
                    }
                    break;
                case "assignee":
                    if (cond.negated) {
                        notAssignees.add(cond.value);
                    } else {
                        assignees.add(cond.value);
                    }
                    break;
                case "label":
                    if (cond.negated) {
                        notLabels.add(cond.value);
                    } else {
                        labels.add(cond.value);
                    }
                    break;
            }
        }

        const textSegments = parsed.getTextSegments();
        const searchTerm = textSegments
            .filter(seg => !seg.negated)
            .map(seg => seg.text)
            .join(" ");

        const excludedTerms = textSegments.filter(seg => seg.negated).map(seg => seg.text);

        return {
            archived,
            authors,
            notAuthors,
            assignees,
            notAssignees,
            labels,
            notLabels,
            searchTerm,
            excludedTerms,
        };
    });

    const filteredTasks = createMemo(() => {
        let filtered = board.tasks;
        let f = dbg(filters());

        if (f.archived !== undefined) {
            filtered = filtered.filter(t => t.isArchived == f.archived);
        }

        for (const author of f.authors) {
            filtered = filtered.filter(
                t => t.author.email.includes(author) || t.author.user?.handle?.includes(author)
            );
        }

        for (const author of f.notAuthors) {
            filtered = filtered.filter(
                t => !t.author.email.includes(author) && !t.author.user?.handle?.includes(author)
            );
        }

        for (const label of f.labels) {
            filtered = filtered.filter(t => t.labels.some(l => l == label));
        }

        for (const label of f.notLabels) {
            filtered = filtered.filter(t => !t.labels.some(l => l == label));
        }

        for (const assignee of f.assignees) {
            filtered = filtered.filter(
                t =>
                    t.assignee?.email.includes(assignee) ||
                    t.assignee?.user?.handle?.includes(assignee)
            );
        }

        for (const assignee of f.notAssignees) {
            filtered = filtered.filter(
                t =>
                    !t.assignee?.email.includes(assignee) &&
                    !t.assignee?.user?.handle?.includes(assignee)
            );
        }

        if (f.searchTerm) {
            const fuse = new Fuse(filtered, { keys: ["title"], threshold: 0.4 });
            filtered = fuse.search(f.searchTerm).map(result => result.item);
        }

        if (f.excludedTerms.length > 0) {
            filtered = filtered.filter(
                t =>
                    !f.excludedTerms.some(term =>
                        t.title.toLowerCase().includes(term.toLowerCase())
                    )
            );
        }

        return filtered;
    });

    const viewTask = createMemo(() => (params.taskId ? Number(params.taskId) : null));

    function setViewTask(id: number | null) {
        if (id !== null) {
            navigate(`/boards/${params.id}/${id}`);
        } else {
            navigate(`/boards/${params.id}`);
        }
    }

    async function moveTask(taskId: number, status: string) {
        let task = board.tasks.find(task => task.id == taskId);

        if (!task || task.status == status || task.isArchived) {
            return;
        }

        const result = await gqlClient.mutation<{
            updateTask: Replace<Task, "createdAt", string>;
        }>(
            gql`
                mutation UpdateTask($id: Int!, $input: UpdateTaskInput!) {
                    updateTask(id: $id, input: $input) {
                        id
                        title
                        createdAt
                        author {
                            email
                            user {
                                id
                                handle
                            }
                        }
                        status
                        assignee {
                            email
                            user {
                                id
                                handle
                            }
                        }
                        timeLogged {
                            time
                        }
                        isArchived
                        isBlocked
                        labels
                    }
                }
            `,
            {
                id: task.id,
                input: {
                    status,
                },
            }
        );

        if (handleAuthError(result.error)) {
            addAlert("Failed to move task", "error");
            return;
        }

        const updated = result.data!.updateTask;

        const saved = {
            ...updated,
            createdAt: new Date(updated.createdAt),
        };

        setBoard("tasks", task => task.id == saved.id, saved);
    }

    const title = () => {
        const taskId = viewTask();

        if (taskId) {
            const task = board.tasks.find(t => t.id == taskId);

            if (task) {
                return `${board.name} - ${task.title}`;
            }
        }

        return board.name;
    };

    return (
        <>
            <Title>{title()}</Title>
            <div class="flex flex-row w-full h-auto gap-4 m-4">
                <For each={board.taskStatus}>
                    {status => (
                        <TaskColumn
                            status={status}
                            setViewTask={setViewTask as Setter<number>}
                            onMoveTask={moveTask}
                            tasks={filteredTasks().filter(task => task.status == status.name)}
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

// TODO: using clipboard api for this is terrible
