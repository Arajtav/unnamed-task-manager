import { client } from "../auth";
import { A } from "@solidjs/router";
import { useMe } from "./Layout";

export default function Avatar() {
    let [me] = useMe();

    async function logout() {
        try {
            await client.logout();
            window.location.assign("/login");
        } catch (error) {
            console.error(error);
        }
    }

    return (
        <div class="avatar avatar-placeholder m-2">
            <button
                class="w-7 aspect-square rounded-full bg-primary flex items-center justify-center"
                popovertarget="popover-1"
                style="anchor-name:--anchor-1"
            >
                <span>{(me.handle || me.id)[0].toUpperCase()}</span>
            </button>

            {/* m-2 doesn't really work it needs to be shifted a bit form the right page border as well */}
            <ul
                class="dropdown menu w-52 rounded-box bg-base-200 m-2"
                popover
                id="popover-1"
                style="position-anchor:--anchor-1"
            >
                <li>
                    <A href="/settings">Settings</A>
                    <button onClick={logout}>Log out</button>
                </li>
            </ul>
        </div>
    );
}
