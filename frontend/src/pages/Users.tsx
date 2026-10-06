import { For, Show } from "solid-js";
import { useAppData } from "../contexts/appDataContext";
import Avatar from "../newComponents/Avatar";
import Badge from "../newComponents/Badge";
import { EllipsisVerticalIcon } from "lucide-solid";

export default function Users() {
    const [appData] = useAppData();

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
                        <tr class="*:whitespace-nowrap hover:bg-base-200">
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
                                            <Badge text={email} class="border-base-300/50 w-min" />
                                        )}
                                    </For>
                                </div>
                            </td>

                            <td>
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
                                <button class="btn btn-ghost btn-sm btn-square">
                                    <EllipsisVerticalIcon strokeWidth={1.5} />
                                </button>
                            </td>
                        </tr>
                    )}
                </For>
            </tbody>
        </table>
    );
}
