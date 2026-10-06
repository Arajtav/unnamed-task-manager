import { createMemo, createSignal, For, Show } from "solid-js";
import { Access, useBoard } from "../contexts/boardContext";
import { useAlert } from "../contexts/alertContext";
import { useModal } from "../contexts/modalContext";
import { gql } from "@urql/core";
import { gqlClient } from "../graphql";
import User from "../newComponents/User";
import { EllipsisVerticalIcon, PlusIcon } from "lucide-solid";
import Badge from "../newComponents/Badge";
import { useAppData } from "../contexts/appDataContext";

export default function BoardMembers() {
    const [board, setBoard] = useBoard();
    const [{ me, users }] = useAppData();
    const { addAlert } = useAlert();
    const { openModal } = useModal();

    const [search, setSearch] = createSignal("");

    const permissions = createMemo(() => {
        if (me.isAdmin) {
            return "admin";
        }

        return board.access.find(a => a.user.id == me.id)?.isModerator ? "moderator" : "";
    });

    type ComputedAccess = {
        permissions: "admin" | "moderator" | "";
        user: { emails: string[]; id: string; handle?: string };
    };

    const computedAccess = createMemo<ComputedAccess[]>(() => {
        const admins: ComputedAccess[] = users
            .filter(u => u.isAdmin)
            .map(u => ({ user: u, permissions: "admin" }));

        const other: ComputedAccess[] = board.access.map(a => ({
            user: a.user,
            permissions: a.isModerator ? "moderator" : "",
        }));

        // Admins won't be overwritten as deduplicating removes from the left.
        const access = [...admins, ...other].filter(
            (value, index, self) => index == self.findIndex(o => o.user.id == value.user.id)
        );

        return access.sort((a, b) => {
            // Admins then Mods then Normal.
            const ROLES = { admin: 0, moderator: 1, "": 2 } as const;

            let diff = ROLES[a.permissions] - ROLES[b.permissions];
            if (diff) return diff;

            // Users with handles first, alphabetically.
            if (a.user.handle && b.user.handle) {
                const handleDiff = a.user.handle.localeCompare(b.user.handle);
                if (handleDiff != 0) return handleDiff;
            } else if (a.user.handle) {
                return -1;
            } else if (b.user.handle) {
                return 1;
            }

            // Alphabetically by emails.
            const emailsA = a.user.emails.toSorted();
            const emailsB = b.user.emails.toSorted();

            for (let i = 0; i < Math.min(emailsA.length, emailsB.length); i++) {
                diff = emailsA[i].localeCompare(emailsB[i]);
                if (diff) return diff;
            }

            diff = emailsA.length - emailsB.length;
            if (diff) return diff;

            // By id for consistency when everything else is the same.
            return a.user.id.localeCompare(b.user.id);
        });
    });

    const searchResults = createMemo(() => {
        const query = search().trim().toLowerCase();

        return users
            .filter(user => !computedAccess().some(a => a.user.id == user.id))
            .filter(
                user =>
                    user.handle?.includes(query) ||
                    user.emails.some(email => email.toLowerCase().includes(query))
            )
            .flatMap(user =>
                user.emails.length > 0
                    ? user.emails.map(email => ({
                          emails: [email],
                          handle: user.handle,
                          id: user.id,
                      }))
                    : [
                          {
                              emails: [],
                              handle: user.handle,
                              id: user.id,
                          },
                      ]
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

    async function setModerator(userId: string, isModerator: boolean) {
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
                isModerator,
            }
        );

        if (result.error) {
            addAlert(
                isModerator
                    ? "Failed to remove moderator permissions."
                    : "Failed to add moderator permissions.",
                "error"
            );
        } else {
            setBoard("access", result.data!.addAccess.access);
        }
    }

    async function addMember(userId: string) {
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
            setBoard("access", result.data!.addAccess.access);
        }
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
                    <For each={computedAccess()}>
                        {access => (
                            <li class="list-row">
                                <div class="list-col-grow">
                                    <User user={access.user} />
                                </div>

                                <div class="self-center">
                                    <Show when={access.permissions}>
                                        {permissions => (
                                            <Badge
                                                text={permissions()}
                                                class={
                                                    permissions() == "admin"
                                                        ? "capitalize bg-primary-content border-primary/50"
                                                        : "capitalize bg-accent-content border-accent/50"
                                                }
                                            />
                                        )}
                                    </Show>
                                </div>

                                <div
                                    class={`dropdown dropdown-end ${
                                        !permissions() ||
                                        access.permissions == "admin" ||
                                        (permissions() != "admin" &&
                                            access.permissions == "moderator")
                                            ? "invisible"
                                            : ""
                                    }`}
                                >
                                    <button class="btn btn-square btn-ghost">
                                        <EllipsisVerticalIcon strokeWidth={1.5} />
                                    </button>

                                    <ul class="dropdown-content menu bg-base-200 rounded-box mt-1 w-max">
                                        <li>
                                            <button
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
                                                                onClick: () =>
                                                                    removeMember(access.user.id),
                                                            },
                                                        ],
                                                    });
                                                }}
                                            >
                                                Kick
                                            </button>
                                        </li>

                                        <Show when={permissions() == "admin"}>
                                            <li>
                                                <button
                                                    onClick={() =>
                                                        setModerator(
                                                            access.user.id,
                                                            access.permissions != "moderator"
                                                        )
                                                    }
                                                >
                                                    {access.permissions == "moderator"
                                                        ? "Remove Moderator"
                                                        : "Make Moderator"}
                                                </button>
                                            </li>
                                        </Show>
                                    </ul>
                                </div>
                            </li>
                        )}
                    </For>
                </ul>
            </Show>

            <div class="dropdown flex-1">
                <input
                    type="text"
                    class="input w-full"
                    placeholder="Search..."
                    required
                    value={search()}
                    onInput={e => setSearch(e.currentTarget.value)}
                />

                <ul
                    class="dropdown-content menu bg-base-200 rounded-box mt-2 w-full"
                    onPointerDown={e => e.preventDefault()}
                >
                    <For
                        each={searchResults()}
                        fallback={
                            <li class="h-12 flex items-center justify-center">No results.</li>
                        }
                    >
                        {user => (
                            <li>
                                <div class="flex w-full items-center gap-2">
                                    <div class="flex-1">
                                        <User user={user} />
                                    </div>
                                    <button
                                        class="btn btn-square btn-ghost"
                                        onClick={() => addMember(user.id)}
                                    >
                                        <PlusIcon strokeWidth={1.5} />
                                    </button>
                                </div>
                            </li>
                        )}
                    </For>
                </ul>
            </div>
        </fieldset>
    );
}
