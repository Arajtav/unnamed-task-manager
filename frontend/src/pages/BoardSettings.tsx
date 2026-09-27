import { createMemo, createResource, createSignal, For, Show } from "solid-js";
import { useAlert } from "../components/Layout";
import { Access, useBoard } from "./BoardLayout";
import { gqlClient } from "../graphql";
import { gql } from "@urql/core";
import Email from "../components/Email";

export default function BoardSettings() {
    const [board, setBoard] = useBoard();

    let { addAlert } = useAlert();

    const [email, setEmail] = createSignal("");
    const [adding, setAdding] = createSignal(false);
    const [removeMemberId, setRemoveMemberId] = createSignal("");

    const [users] = createResource(
        async () => {
            const result = await gqlClient.query<{ users: { id: string; emails: string[] }[] }>(
                gql`
                    query Users {
                        users {
                            id
                            emails
                        }
                    }
                `,
                {}
            );

            if (result.error || !result.data?.users) {
                addAlert("Failed to load users.", "error");
                return [];
            }

            return result.data.users;
        },
        { initialValue: [] }
    );

    async function removeMember() {
        const result = await gqlClient.mutation<{ removeAccess: { access: Access[] } }>(
            gql`
                mutation RemoveAccess($boardId: Int!, $userId: UUID!) {
                    removeAccess(boardId: $boardId, userId: $userId) {
                        access {
                            userId
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
                            userId
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

        for (const user of users()) {
            for (const email of user.emails) {
                map.set(email, user.id);
            }
        }

        return map;
    });

    const UserEmailMap = createMemo(() => new Map(users().map(user => [user.id, user.emails])));

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
                                                            UserEmailMap().get(access.userId) ?? []
                                                        }
                                                        fallback={access.userId}
                                                    >
                                                        {email => <Email email={email} />}
                                                    </For>
                                                </div>
                                                <button
                                                    class="btn btn-square btn-ghost"
                                                    onClick={() => {
                                                        setRemoveMemberId(access.userId);
                                                        return (
                                                            document.getElementById(
                                                                "modal"
                                                            ) as HTMLDialogElement
                                                        ).showModal();
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
                            <For each={users()}>
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
            <dialog id="modal" class="modal">
                <div class="modal-box">
                    <h3 class="text-lg font-bold">Are you sure?</h3>
                    <p class="py-4">
                        Are you sure want to kick{" "}
                        <span class="text-primary">{removeMemberId()}</span>
                    </p>
                    <div class="modal-action">
                        <form method="dialog" class="flex gap-2">
                            <button class="btn btn-primary">No</button>
                            <button onClick={removeMember} class="btn btn-error">
                                Yes
                            </button>
                        </form>
                    </div>
                </div>
                <form method="dialog" class="modal-backdrop">
                    <button>close</button>
                </form>
            </dialog>
        </>
    );
}
