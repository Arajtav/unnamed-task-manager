import { For, Show } from "solid-js";
import { useAppData } from "../contexts/appDataContext";
import Avatar from "../newComponents/Avatar";
import Badge from "../newComponents/Badge";
import { ClipboardCheckIcon, EllipsisVerticalIcon, PlusIcon } from "lucide-solid";
import BadgeButton from "../newComponents/BadgeButton";
import { gqlClient } from "../graphql";
import { gql } from "@urql/core";
import { useAlert } from "../contexts/alertContext";
import { useModal } from "../contexts/modalContext";
import DateTime from "../components/DateTime";
import { Title } from "@solidjs/meta";
import { FullUserRaw, processFullUser } from "../gqlTypes";
import { SOMETHING } from "../alerts";

export default function Users() {
    const [appData, setAppData] = useAppData();
    const { addAlert } = useAlert();
    const { openModal } = useModal();

    type UpdateUserInput = {
        handle?: string | null;
        deleteEmails?: string[];
        addEmails?: string[];
        isDisabled?: boolean;
    };

    async function updateUser(userId: string, input: UpdateUserInput) {
        const result = await gqlClient.mutation<{
            updateUser: FullUserRaw;
        }>(
            gql`
                mutation UpdateUser($userId: UUID!, $input: UpdateUserInput!) {
                    updateUser(userId: $userId, input: $input) {
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
            { userId, input }
        );

        if (result.error) {
            addAlert(SOMETHING);
            return;
        }

        const updateUser = result.data!.updateUser;

        setAppData("users", user => user.id == updateUser.id, processFullUser(updateUser));
    }

    async function addUser() {
        const result = await gqlClient.mutation<{
            createUser: FullUserRaw;
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
            addAlert(SOMETHING);
            return;
        }

        const user = result.data!.createUser;

        setAppData("users", users => [...users, processFullUser(user)]);
    }

    async function addInvite(userId: string) {
        const result = await gqlClient.mutation<{
            addInvite: FullUserRaw;
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
            addAlert(SOMETHING);
            return;
        }

        const user = result.data!.addInvite;

        setAppData("users", user => user.id == userId, processFullUser(user));
    }

    async function removeInvite(userId: string) {
        const result = await gqlClient.mutation<{
            removeInvite: FullUserRaw;
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
            addAlert(SOMETHING);
            return;
        }

        const user = result.data!.removeInvite;

        setAppData("users", user => user.id == userId, processFullUser(user));
    }

    return (
        <>
            <Title>Users</Title>
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
                        <th />
                    </tr>
                </thead>

                <tbody>
                    <For each={appData.users}>
                        {user => (
                            <tr class="group *:whitespace-nowrap hover:bg-base-200">
                                <td class="w-px font-mono">
                                    <span class="inline-flex w-[16ch] items-center justify-center">
                                        {user.invite.type == "present"
                                            ? user.invite.invite
                                            : user.invite.type == "not-present"
                                              ? "None"
                                              : ""}
                                    </span>
                                </td>

                                <td class="w-px">
                                    <div class="flex flex-row items-center gap-2 font-mono">
                                        <Avatar user={user} />
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
                                                                    onClick: async () =>
                                                                        await updateUser(user.id, {
                                                                            deleteEmails: [email],
                                                                        }),
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
                                                if (email) {
                                                    updateUser(user.id, {
                                                        addEmails: [email],
                                                    });
                                                }
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

                                <td class="w-px">
                                    <DateTime datetime={user.createdAt} seconds={true} />
                                </td>

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
                                                        addAlert({
                                                            type: "normal",
                                                            title: `Copied`,
                                                            content:
                                                                "Copied user id into clipboard.",
                                                            icon: ClipboardCheckIcon,
                                                        });
                                                    }}
                                                >
                                                    Copy id
                                                </button>
                                            </li>

                                            <Show
                                                when={
                                                    appData.me.isAdmin || user.id == appData.me.id
                                                }
                                            >
                                                <li>
                                                    <button
                                                        onClick={async () => {
                                                            const handle =
                                                                prompt("new handle")?.trim();
                                                            if (handle !== undefined) {
                                                                await updateUser(user.id, {
                                                                    handle: handle || null,
                                                                });
                                                            }
                                                        }}
                                                    >
                                                        Set handle
                                                    </button>
                                                </li>
                                            </Show>

                                            <Show when={user.invite.type != "forbidden"}>
                                                <li>
                                                    <button onClick={() => addInvite(user.id)}>
                                                        <Show
                                                            when={user.invite.type == "not-present"}
                                                            fallback="Regenerate invite"
                                                        >
                                                            Generate invite
                                                        </Show>
                                                    </button>
                                                </li>
                                            </Show>

                                            <Show when={user.invite.type == "present"}>
                                                <li>
                                                    <button onClick={() => removeInvite(user.id)}>
                                                        Remove invite
                                                    </button>
                                                </li>
                                            </Show>

                                            <Show when={!user.isAdmin && appData.me.isAdmin}>
                                                <li>
                                                    <button
                                                        onClick={() =>
                                                            updateUser(user.id, {
                                                                isDisabled: !user.isDisabled,
                                                            })
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
