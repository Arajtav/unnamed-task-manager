import { createMemo, createSignal, For, Show } from "solid-js";
import { useAlert, useColdAppData, useModal } from "../components/Layout";
import { gqlClient } from "../graphql";
import { gql } from "@urql/core";
import Email from "../components/Email";
import { Access, useBoard } from "../contexts/boardContext";

export default function BoardSettings() {
    const [board, setBoard] = useBoard();
    const { users } = useColdAppData();

    let { addAlert } = useAlert();

    const [email, setEmail] = createSignal("");
    const [adding, setAdding] = createSignal(false);
    const [removeMemberId, setRemoveMemberId] = createSignal("");

    const { openModal } = useModal();

    async function removeMember() {
        const result = await gqlClient.mutation<{ removeAccess: { access: Access[] } }>(
            gql`
                mutation RemoveAccess($boardId: Int!, $userId: UUID!) {
                    removeAccess(boardId: $boardId, userId: $userId) {
                        access {
                            user {
                                id
                                handle
                            }
                            isModerator
                        }
                    }
                }
            `,
            { boardId: board.id, userId: removeMemberId() }
        );

        if (result.error) {
            addAlert("Failed to remove user.", "error");
        } else {
            setBoard("access", result.data!.removeAccess.access);
        }
    }

    async function addMember() {
        const userId = EmailUserMap().get(email());

        if (!userId) {
            addAlert("No user with that email.", "error");
            return;
        }

        setAdding(true);

        const result = await gqlClient.mutation<{ addAccess: { access: Access[] } }>(
            gql`
                mutation AddAccess($boardId: Int!, $userId: UUID!, $isModerator: Boolean!) {
                    addAccess(boardId: $boardId, userId: $userId, isModerator: $isModerator) {
                        access {
                            user {
                                id
                                handle
                            }
                            isModerator
                        }
                    }
                }
            `,
            { boardId: board.id, userId: userId, isModerator: false }
        );

        if (result.error) {
            addAlert("Failed to add user.", "error");
        } else {
            setEmail("");
            setBoard("access", result.data!.addAccess.access);
        }

        setAdding(false);
    }

    const EmailUserMap = createMemo(() => {
        const map = new Map<string, string>();

        for (const user of users) {
            for (const email of user.emails) {
                map.set(email, user.id);
            }
        }

        return map;
    });

    const userEmailMap = new Map(users.map(user => [user.id, user.emails]));

    return (
        <>
            <div class="w-full h-full flex flex-row">
                <ul class="menu bg-base-200 w-56 h-full">
                    <li>
                        <a class="menu-active">Members</a>
                    </li>
                </ul>

                <div class="flex-1 p-6">
                    <fieldset class="fieldset bg-base-200 border-base-300 w-xs border p-4">
                        <legend class="fieldset-legend">Board members</legend>

                        <Show
                            when={board.access.length > 0}
                            fallback={
                                <div class="alert">
                                    <span>No one else has access to this board yet.</span>
                                </div>
                            }
                        >
                            <ul class="list bg-base-100 rounded-box mb-4">
                                <For each={board.access}>
                                    {access => {
                                        return (
                                            <li class="list-row">
                                                <div></div>
                                                <div>
                                                    <For
                                                        each={
                                                            userEmailMap.get(access.user.id) ?? []
                                                        }
                                                        fallback={access.user.id}
                                                    >
                                                        {email => <Email email={email} />}
                                                    </For>
                                                </div>
                                                <button
                                                    class="btn btn-square btn-ghost"
                                                    onClick={() => {
                                                        setRemoveMemberId(access.user.id);
                                                        openModal({
                                                            title: "Are you sure?",
                                                            content: (
                                                                <p>
                                                                    Are you sure you want to kick{" "}
                                                                    <span class="text-primary">
                                                                        {removeMemberId()}
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
                                                                    onClick: removeMember,
                                                                },
                                                            ],
                                                        });
                                                    }}
                                                >
                                                    <svg
                                                        xmlns="http://www.w3.org/2000/svg"
                                                        fill="none"
                                                        viewBox="0 0 24 24"
                                                        stroke-width="1.5"
                                                        stroke="currentColor"
                                                        class="size-6"
                                                    >
                                                        <path
                                                            stroke-linecap="round"
                                                            stroke-linejoin="round"
                                                            d="M6 18 18 6M6 6l12 12"
                                                        />
                                                    </svg>
                                                </button>
                                            </li>
                                        );
                                    }}
                                </For>
                            </ul>
                        </Show>

                        <div class="join">
                            <input
                                type="text"
                                inputMode="email"
                                class="input join-item"
                                placeholder="me@example.org"
                                list="all-emails"
                                required
                                value={email()}
                                onInput={e => setEmail(e.currentTarget.value)}
                                disabled={adding()}
                            />

                            <button
                                class="btn btn-primary join-item"
                                onClick={addMember}
                                disabled={adding()}
                            >
                                {adding() ? "Adding..." : "Add"}
                            </button>
                        </div>

                        <datalist id="all-emails">
                            <For each={users}>
                                {user => (
                                    <For each={user.emails}>
                                        {email => <option value={email}>{email}</option>}
                                    </For>
                                )}
                            </For>
                        </datalist>
                    </fieldset>
                </div>
            </div>
        </>
    );
}
