import { createMemo, createResource, createSignal, For, Show } from "solid-js";
import { useAlert } from "../components/Layout";
import { addAccess, removeAccess, usersQuery } from "../graphql/client";
import { useBoard } from "./BoardLayout";

export default function BoardSettings() {
    const [board, setBoard] = useBoard();

    let { addAlert } = useAlert();

    const [email, setEmail] = createSignal("");
    const [adding, setAdding] = createSignal(false);

    const [users] = createResource(
        async () => {
            const result = await usersQuery();

            if (result.error) {
                addAlert("Failed to load users.", "error");
                return [];
            }

            console.log(result);
            return result.data?.users ?? [];
        },
        { initialValue: [] },
    );

    const userEmails = (userId: string) => {
        let user = users().find((user) => user.id == userId);

        return user?.emails.map((e) => e.email).join("\n");
    };

    async function removeMember(userId: string) {
        const result = await removeAccess(board.id, userId);

        if (result.error) {
            addAlert("Failed to remove user.", "error");
        } else {
            setBoard("access", (access) => access.filter((a) => a.userId != userId));
        }
    }

    async function addMember() {
        const userId = userEmailMap().get(email());

        if (!userId) {
            addAlert("No user with that email.", "error");
            return;
        }

        setAdding(true);

        const result = await addAccess(board.id, userId, false);

        if (result.error) {
            addAlert("Failed to add user.", "error");
        } else {
            setEmail("");
            setBoard("access", (access) =>
                access.some((a) => a.userId === userId) ? access : access.concat([{ userId, isModerator: false }]),
            );
        }

        setAdding(false);
    }

    const userEmailMap = createMemo(() => {
        const map = new Map<string, string>();

        for (const user of users()) {
            for (const { email } of user.emails) {
                map.set(email, user.id);
            }
        }

        console.log(map);
        return map;
    });

    return (
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
                                {(access) => (
                                    <li class="list-row">
                                        <div></div>
                                        <div>
                                            <span>{userEmails(access.userId) ?? access.userId}</span>
                                            <Show when={access.isModerator}>
                                                <span class="badge badge-sm ml-2">moderator</span>
                                            </Show>
                                        </div>
                                        <button
                                            class="btn btn-square btn-ghost"
                                            onClick={() => removeMember(access.userId)}
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
                                )}
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
                            onInput={(e) => setEmail(e.currentTarget.value)}
                            disabled={adding()}
                        />

                        <button class="btn btn-primary join-item" onClick={addMember} disabled={adding()}>
                            {adding() ? "Adding..." : "Add"}
                        </button>
                    </div>

                    <datalist id="all-emails">
                        <For each={users()}>
                            {(user) => (
                                <For each={user.emails}>{({ email }) => <option value={email}>{email}</option>}</For>
                            )}
                        </For>
                    </datalist>
                </fieldset>
            </div>
        </div>
    );
}
