import { A } from "@solidjs/router";
import { client } from "../auth";
import { useAppData } from "../contexts/appDataContext";
import Avatar from "../newComponents/Avatar";
import { useAlert } from "../contexts/alertContext";
import { CircleXIcon, GlobeOffIcon } from "lucide-solid";

const NETWORK = {
    type: "error",
    title: "Network error",
    content: "Check your internet connection and try again.",
    icon: GlobeOffIcon,
} as const;

export default function MeIcon() {
    const [appData] = useAppData();
    const { addAlert } = useAlert();

    async function logout() {
        const lg = await client.logout();
        if (lg.error) {
            if (lg.error.type == "network") {
                addAlert(NETWORK, 60);
            } else {
                addAlert(
                    {
                        type: "error",
                        title: "Failed to log out",
                        icon: CircleXIcon,
                        content: "Try again.",
                    },
                    30
                );
            }
        } else {
            window.location.assign("/login");
        }
    }

    return (
        <div>
            <button popovertarget="avatar-settings" style="anchor-name: --avatar-anchor">
                <Avatar user={appData.me} title={{ option: "custom", value: "You" }} />
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
