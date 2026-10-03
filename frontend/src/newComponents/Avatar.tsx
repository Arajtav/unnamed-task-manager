import { UserRoundIcon } from "lucide-solid";
import { Show } from "solid-js";

export default function Avatar(props: { user?: string }) {
    return (
        <div class="avatar avatar-placeholder h-8 aspect-square font-body">
            <div class="rounded-full h-full w-full bg-primary text-center text-primary-content uppercase">
                <Show when={props.user} fallback={<UserRoundIcon strokeWidth={1.5} />}>
                    {user => <>{user()}</>}
                </Show>
            </div>
        </div>
    );
}
