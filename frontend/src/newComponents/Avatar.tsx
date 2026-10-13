import { UserRoundIcon } from "lucide-solid";
import { Show } from "solid-js";

export default function Avatar(props: { user?: string; color?: string }) {
    return (
        <div class="avatar avatar-placeholder h-8 aspect-square font-body">
            <div
                class={`rounded-full h-full w-full text-center uppercase select-none ${
                    props.color ? "" : "bg-primary text-primary-content"
                }`}
                style={
                    props.color
                        ? {
                              "background-color": props.color,
                              color: `oklch(from ${props.color} clamp(0, (0.6 + (0.8 * l)) + (clamp(0, (l - 0.55) * 1000, 1) * ((0.1 + (0.8 * (l - 0.55))) - (0.6 + (0.8 * l)))), 1) c h)`,
                          }
                        : undefined
                }
            >
                <Show when={props.user} fallback={<UserRoundIcon strokeWidth={1.5} />}>
                    {user => <>{user()}</>}
                </Show>
            </div>
        </div>
    );
}
