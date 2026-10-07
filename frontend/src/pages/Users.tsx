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

    return (
        <table class="table w-full">
            <thead>
                <tr>
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
                            <td class="w-px">
                                <div class="flex flex-row items-center gap-2 font-mono">
                                    <Avatar
                                        user={user.handle?.charAt(0) ?? user.emails[0]?.charAt(0)}
                                    />
                                    <div>
                                        {user.handle ? `@${user.handle}` : "This user has no name"}
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

                            <Show when={!user.isAdmin}>
                                <td class="w-px">
                                    <div class="dropdown dropdown-end">
                                        <button class="btn btn-ghost btn-sm btn-square">
                                            <EllipsisVerticalIcon strokeWidth={1.5} />
                                        </button>

                                        <ul class="dropdown-content menu bg-base-200 rounded-box mt-1 w-max">
                                            <li>
                                                <button
                                                    onClick={() =>
                                                        setDisabled(user.id, !user.isDisabled)
                                                    }
                                                >
                                                    {user.isDisabled
                                                        ? "Enable account back"
                                                        : "Disabled account"}
                                                </button>
                                            </li>
                                        </ul>
                                    </div>
                                </td>
                            </Show>
                        </tr>
                    )}
                </For>
            </tbody>
        </table>
    );
}
