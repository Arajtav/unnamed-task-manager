import { GqlUser } from "../graphql/types";
import { client } from "../auth";

export default function Avatar({ me }: { me: GqlUser }) {
    async function logout() {
        try {
            await client.logout();
            window.location.assign(
                decodeURIComponent(new URLSearchParams(location.search).get("back") ?? "/")
            );
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
                <span>{me.id[0].toUpperCase()}</span>
            </button>

            <ul
                class="dropdown menu w-52 rounded-box bg-base-100"
                popover
                id="popover-1"
                style="position-anchor:--anchor-1"
            >
                <li>
                    <button onClick={logout}>Log out</button>
                </li>
            </ul>
        </div>
    );
}
