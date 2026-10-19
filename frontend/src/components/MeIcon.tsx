import { A } from "@solidjs/router";
import { client } from "../auth";
import { useAppData } from "../contexts/appDataContext";
import Avatar from "../newComponents/Avatar";

export default function MeIcon() {
    const [{ me }] = useAppData();

    async function logout() {
        try {
            await client.logout();
            window.location.assign("/login");
        } catch (error) {
            console.error(error);
        }
    }

    return (
        <div>
            <button popovertarget="avatar-settings" style="anchor-name: --avatar-anchor">
                <Avatar
                    user={me}
                    title={{ option: "custom", value: "You" }}
                />
            </button>

            <ul
                id="avatar-settings"
                popover
                class="dropdown menu w-52 rounded-box bg-base-200"
                style="position-anchor: --avatar-anchor"
            >
                <li>
                    <A href="/settings">Settings</A>
                </li>
                <li>
                    <button onClick={logout}>Log out</button>
                </li>
            </ul>
        </div>
    );
}
