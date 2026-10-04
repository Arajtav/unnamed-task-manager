import { createMemo, createSignal, For, Show } from "solid-js";
import { Access, useBoard } from "../contexts/boardContext";
import { useColdAppData } from "../contexts/coldAppDataContext";
import { useAlert } from "../contexts/alertContext";
import { useModal } from "../contexts/modalContext";
import { gql } from "@urql/core";
import { gqlClient } from "../graphql";
import User from "../newComponents/User";
import { TrashIcon } from "lucide-solid";

export default function BoardMembers() {
    const [board, setBoard] = useBoard();
    const { users } = useColdAppData();
    const { addAlert } = useAlert();
    const { openModal } = useModal();

    const [email, setEmail] = createSignal("");
    const [adding, setAdding] = createSignal(false);

    const EmailUserMap = createMemo(() => {
        const map = new Map<string, string>();

        for (const user of users) {
            for (const email of user.emails) {
                map.set(email, user.id);
            }
        }

        return map;
    });

    const filteredEmails = createMemo(() => {
        const query = email().trim().toLowerCase();

        if (!query) {
            return [];
        }

        return users.flatMap(user =>
            user.emails
                .filter(userEmail => userEmail.toLowerCase().includes(query))
                .map(userEmail => ({
                    user: {
                        emails: [userEmail],
                        handle: user.handle,
                    },
                    email: userEmail,
                }))
        );
    });

    async function removeMember(userId: string) {
        const result = await gqlClient.mutation<{
            removeAccess: { access: Access[] };
        }>(
            gql`
                mutation RemoveAccess($boardId: Int!, $userId: UUID!) {
                    removeAccess(boardId: $boardId, userId: $userId) {
                        access {
                            user {
                                id
                                handle
                                emails
                            }
                            isModerator
                        }
                    }
                }
            `,
            {
                boardId: board.id,
                userId,
            }
        );

        if (result.error) {
            addAlert("Failed to remove user.", "error");
        } else {
            setBoard("access", result.data!.removeAccess.access);
        }
    }

    async function addMember() {
        const userId = EmailUserMap().get(email().trim());

        if (!userId) {
            addAlert("No user with that email.", "error");
            return;
        }

        setAdding(true);

        const result = await gqlClient.mutation<{
            addAccess: { access: Access[] };
        }>(
            gql`
                mutation AddAccess($boardId: Int!, $userId: UUID!, $isModerator: Boolean!) {
                    addAccess(boardId: $boardId, userId: $userId, isModerator: $isModerator) {
                        access {
                            user {
                                id
                                handle
                                emails
                            }
                            isModerator
                        }
                    }
                }
            `,
            {
                boardId: board.id,
                userId,
                isModerator: false,
            }
        );

        if (result.error) {
            addAlert("Failed to add user.", "error");
        } else {
            setEmail("");
            setBoard("access", result.data!.addAccess.access);
        }

        setAdding(false);
    }

    return (
        <fieldset class="fieldset bg-base-200 border-base-300 w-min min-w-xl border p-4">
            <legend class="fieldset-legend">Board members</legend>

            <Show
                when={board.access.length > 0}
                fallback={
                    <div class="alert alert-warning">
                        <span>This board has no members.</span>
                    </div>
                }
            >
                <ul class="list bg-base-100 rounded-box mb-4">
                    <For each={board.access}>
                        {access => (
                            <li class="list-row">
                                <div></div>

                                <div>
                                    <User user={access.user} />
                                </div>

                                <button
                                    class="btn btn-square btn-ghost"
                                    onClick={() => {
                                        openModal({
                                            title: "Are you sure?",
                                            content: (
                                                <p>
                                                    Are you sure you want to kick{" "}
                                                    <span class="text-primary">
                                                        {access.user.id}
                                                    </span>
                                                </p>
                                            ),
                                            buttons: [
                                                {
                                                    label: "No",
                                                    class: "btn-primary",
                                                },
                                                {
                                                    label: "Yes",
                                                    class: "btn-error",
                                                    onClick: () => removeMember(access.user.id),
                                                },
                                            ],
                                        });
                                    }}
                                >
                                    <TrashIcon strokeWidth={1.5} />
                                </button>
                            </li>
                        )}
                    </For>
                </ul>
            </Show>

            <div class="join w-full">
                <div class="dropdown join-item flex-1">
                    <input
                        type="text"
                        inputMode="email"
                        class="input w-full"
                        placeholder="me@example.org"
                        required
                        value={email()}
                        onInput={e => setEmail(e.currentTarget.value)}
                        disabled={adding()}
                    />

                    <Show when={filteredEmails().length > 0}>
                        <ul class="dropdown-content menu bg-base-100 rounded-box mt-2 w-full">
                            <For each={filteredEmails()}>
                                {item => (
                                    <li>
                                        <button type="button" onClick={() => setEmail(item.email)}>
                                            <div class="flex w-full items-center gap-2">
                                                <User user={item.user} />
                                            </div>
                                        </button>
                                    </li>
                                )}
                            </For>
                        </ul>
                    </Show>
                </div>

                <button
                    class="btn btn-primary join-item"
                    onClick={addMember}
                    disabled={adding() || !email().trim()}
                >
                    {adding() ? "Adding..." : "Add"}
                </button>
            </div>
        </fieldset>
    );
}
