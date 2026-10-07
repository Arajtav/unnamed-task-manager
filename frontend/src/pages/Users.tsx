import { For, Show } from "solid-js";
import { useAppData, User } from "../contexts/appDataContext";
import Avatar from "../newComponents/Avatar";
import Badge from "../newComponents/Badge";
import { EllipsisVerticalIcon, PlusIcon } from "lucide-solid";
import BadgeButton from "../newComponents/BadgeButton";
import { gqlClient } from "../graphql";
import { gql } from "@urql/core";
import { useAlert } from "../contexts/alertContext";
import { useModal } from "../contexts/modalContext";

export default function Users() {
    const [appData, setAppData] = useAppData();
    const { addAlert } = useAlert();
    const { openModal } = useModal();

    async function addEmail(userId: string, email: string) {
        try {
            const result = await gqlClient.mutation<{
                updateUser: Replace<User, "createdAt", string>;
            }>(
                gql`
                    mutation updateUser($userId: UUID!, $email: String!) {
                        updateUser(userId: $userId, addEmails: [$email]) {
                            id
                            emails
                            handle
                            isAdmin
                            isDisabled
                            createdAt
                            invite
                        }
                    }
                `,
                { userId, email }
            );

            if (result.error) {
                throw result.error;
            }

            let updateUser = result.data!.updateUser;

            setAppData("users", user => user.id == updateUser.id, {
                ...updateUser,
                createdAt: new Date(updateUser.createdAt),
            });
        } catch (err) {
            addAlert(err instanceof Error ? err.message : "Failed to add email.", "error");
        }
    }

    async function setHandle(userId: string, handle: string | null) {
        try {
            const result = await gqlClient.mutation<{
                updateUser: Replace<User, "createdAt", string>;
            }>(
                gql`
                    mutation updateUser($userId: UUID!, $handle: String) {
                        updateUser(userId: $userId, handle: $handle) {
                            id
                            emails
                            handle
                            isAdmin
                            isDisabled
                            createdAt
                            invite
                        }
                    }
                `,
                { userId, handle }
            );

            if (result.error) {
                throw result.error;
            }

            let updateUser = result.data!.updateUser;

            setAppData("users", user => user.id == updateUser.id, {
                ...updateUser,
                createdAt: new Date(updateUser.createdAt),
            });
        } catch (err) {
            addAlert(err instanceof Error ? err.message : "Failed to add email.", "error");
        }
    }

    async function deleteEmail(userId: string, email: string) {
        try {
            const result = await gqlClient.mutation<{
                updateUser: Replace<User, "createdAt", string>;
            }>(
                gql`
                    mutation updateUser($userId: UUID!, $email: String!) {
                        updateUser(userId: $userId, deleteEmails: [$email]) {
                            id
                            emails
                            handle
                            isAdmin
                            isDisabled
                            createdAt
                            invite
                        }
                    }
                `,
                { userId, email }
            );

            if (result.error) {
                throw result.error;
            }

            let updateUser = result.data!.updateUser;

            setAppData("users", user => user.id == updateUser.id, {
                ...updateUser,
                createdAt: new Date(updateUser.createdAt),
            });
        } catch (err) {
            addAlert(err instanceof Error ? err.message : "Failed to delete email.", "error");
        }
    }

    async function setDisabled(userId: string, isDisabled: boolean) {
        try {
            const result = await gqlClient.mutation<{
                updateUser: Replace<User, "createdAt", string>;
            }>(
                gql`
                    mutation updateUser($userId: UUID!, $isDisabled: Boolean!) {
                        updateUser(userId: $userId, isDisabled: $isDisabled) {
                            id
                            emails
                            handle
                            isAdmin
                            isDisabled
                            createdAt
                            invite
                        }
                    }
                `,
                { userId, isDisabled }
            );

            if (result.error) {
                throw result.error;
            }

            const updateUser = result.data!.updateUser;

            setAppData("users", user => user.id == updateUser.id, {
                ...updateUser,
                createdAt: new Date(updateUser.createdAt),
            });
        } catch (err) {
            addAlert(err instanceof Error ? err.message : "Failed to update user.", "error");
        }
    }

    async function addUser() {
        try {
            const result = await gqlClient.mutation<{
                createUser: Replace<User, "createdAt", string>;
            }>(
                gql`
                    mutation createUser {
                        createUser {
                            id
                            emails
                            handle
                            isAdmin
                            isDisabled
                            createdAt
                            invite
                        }
                    }
                `,
                {}
            );

            if (result.error) {
                throw result.error;
            }

            const user = result.data!.createUser;

            setAppData("users", users => [
                ...users,
                {
                    ...user,
                    createdAt: new Date(user.createdAt),
                },
            ]);
        } catch (err) {
            addAlert(err instanceof Error ? err.message : "Failed to create user.", "error");
        }
    }

    async function addInvite(userId: string) {
        try {
            const result = await gqlClient.mutation<{
                addInvite: Replace<User, "createdAt", string>;
            }>(
                gql`
                    mutation addInvite($userId: UUID!) {
                        addInvite(userId: $userId) {
                            id
                            emails
                            handle
                            isAdmin
                            isDisabled
                            createdAt
                            invite
                        }
                    }
                `,
                { userId }
            );

            if (result.error) {
                throw result.error;
            }

            let user = result.data!.addInvite;

            setAppData("users", user => user.id == userId, {
                ...user,
                createdAt: new Date(user.createdAt),
            });
        } catch (err) {
            addAlert(err instanceof Error ? err.message : "Failed to generate invite.", "error");
        }
    }

    async function removeInvite(userId: string) {
        try {
            const result = await gqlClient.mutation<{
                removeInvite: Replace<User, "createdAt", string>;
            }>(
                gql`
                    mutation removeInvite($userId: UUID!) {
                        removeInvite(userId: $userId) {
                            id
                            emails
                            handle
                            isAdmin
                            isDisabled
                            createdAt
                            invite
                        }
                    }
                `,
                { userId }
            );

            if (result.error) {
                throw result.error;
            }

            let user = result.data!.removeInvite;

            setAppData("users", user => user.id == userId, {
                ...user,
                createdAt: new Date(user.createdAt),
            });
        } catch (err) {
            addAlert(err instanceof Error ? err.message : "Failed to remove invite.", "error");
        }
    }

    return (
        <>
            <div class="navbar flex flex-row justify-end bg-base-200">
                <button class="btn btn-accent" onClick={() => addUser()}>
                    Create account
                </button>
            </div>
            <table class="table w-full">
                <thead>
                    <tr>
                        <th class="text-center">Invite</th>
                        <th>User</th>
                        <th>Emails</th>
                        <th>Info</th>
                        <th class="text-center">Created</th>
                        <th></th>
                    </tr>
                </thead>

                <tbody>
                    <For each={appData.users}>
                        {user => (
                            <tr class="group *:whitespace-nowrap hover:bg-base-200">
                                <td class="w-px font-mono">
                                    <span class="inline-flex w-[16ch] items-center justify-center">
                                        {user.invite ?? "None"}
                                    </span>
                                </td>

                                <td class="w-px">
                                    <div class="flex flex-row items-center gap-2 font-mono">
                                        <Avatar
                                            user={
                                                user.handle?.charAt(0) ?? user.emails[0]?.charAt(0)
                                            }
                                        />
                                        <div>
                                            {user.handle
                                                ? `@${user.handle}`
                                                : "This user has no name"}
                                        </div>
                                    </div>
                                </td>

                                <td>
                                    <div class="flex flex-wrap gap-2">
                                        <For each={user.emails}>
                                            {email => (
                                                <Badge
                                                    text={email}
                                                    class="border-base-300/50 w-min font-mono"
                                                    onClick={() =>
                                                        openModal({
                                                            title: "Are you sure?",
                                                            content: (
                                                                <p>
                                                                    Are you sure you want to unlink{" "}
                                                                    <span class="text-primary">
                                                                        {email}
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
                                                                        deleteEmail(user.id, email),
                                                                },
                                                            ],
                                                        })
                                                    }
                                                />
                                            )}
                                        </For>
                                        <BadgeButton
                                            icon={<PlusIcon strokeWidth={1.5} />}
                                            class="border-base-300/50 w-min invisible group-hover:visible"
                                            onClick={() => {
                                                const email = prompt("Email")?.trim();
                                                if (email) addEmail(user.id, email);
                                            }}
                                        />
                                    </div>
                                </td>

                                <td class="w-px">
                                    <Show when={user.isAdmin}>
                                        <Badge
                                            text="Admin"
                                            class="bg-primary-content border-primary/50 w-min"
                                        />
                                    </Show>
                                    <Show when={user.isDisabled}>
                                        <Badge
                                            text="Disabled"
                                            class="bg-warning border-warning/50 w-min"
                                        />
                                    </Show>
                                </td>

                                <td class="w-px">{user.createdAt.toISOString()}</td>

                                <td class="w-px">
                                    <div class="dropdown dropdown-end">
                                        <button class="btn btn-ghost btn-sm btn-square">
                                            <EllipsisVerticalIcon strokeWidth={1.5} />
                                        </button>

                                        <ul class="dropdown-content menu bg-base-200 rounded-box mt-1 w-max">
                                            <li>
                                                <button
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(user.id);
                                                        addAlert("Copied", "info");
                                                    }}
                                                >
                                                    Copy id
                                                </button>
                                            </li>

                                            <li>
                                                <button
                                                    onClick={() => {
                                                        const handle = prompt("new handle")?.trim();
                                                        if (handle !== undefined) {
                                                            setHandle(user.id, handle || null);
                                                        }
                                                    }}
                                                >
                                                    Set handle
                                                </button>
                                            </li>

                                            <li>
                                                <button onClick={() => addInvite(user.id)}>
                                                    <Show
                                                        when={user.invite === null}
                                                        fallback="Regenerate invite"
                                                    >
                                                        Generate invite
                                                    </Show>
                                                </button>
                                            </li>

                                            <Show when={user.invite !== null}>
                                                <li>
                                                    <button onClick={() => removeInvite(user.id)}>
                                                        Remove invite
                                                    </button>
                                                </li>
                                            </Show>

                                            <Show when={!user.isAdmin}>
                                                <li>
                                                    <button
                                                        onClick={() =>
                                                            setDisabled(user.id, !user.isDisabled)
                                                        }
                                                    >
                                                        {user.isDisabled
                                                            ? "Enable account back"
                                                            : "Disable account"}
                                                    </button>
                                                </li>
                                            </Show>
                                        </ul>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </For>
                </tbody>
            </table>
        </>
    );
}

// TODO: sync user from me to this list. Perhaps just store id in me and have a derived signal resolve it every time.
// TODO: merge these graphql queries.
