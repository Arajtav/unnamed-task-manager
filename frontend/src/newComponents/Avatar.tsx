import { UserRoundIcon } from "lucide-solid";
import { Show } from "solid-js";
import { userColor } from "../format";
import { UserFromEmail } from "../contexts/boardContext";

type TitleOptions =
    | { option: "auto" }
    | {
          option: "custom";
          value: string;
      };

type FlexibleUser =
    { id?: string | null; emails: string[]; handle?: string | null } | UserFromEmail;

export default function Avatar(props: {
    user?: FlexibleUser;
    title?: TitleOptions;
    onClick?: (e: MouseEvent) => void;
}) {
    const user = props.user
        ? "emails" in props.user
            ? { id: props.user.id, handle: props.user.handle, fallback: props.user.emails[0] }
            : {
                  id: props.user.user?.id,
                  handle: props.user.user?.handle ?? null,
                  fallback: props.user.email,
              }
        : undefined;

    const color = userColor(user?.id);

    let title: string | undefined;
    if (props.title?.option == "custom") {
        title = props.title.value;
    } else if (props.title?.option == "auto" && user) {
        title = user.handle ? `@${user.handle}` : user.fallback;
    }

    const character = user?.handle?.charAt(0) ?? user?.fallback?.charAt(0);

    return (
        <div class="avatar avatar-placeholder h-8 text-base aspect-square font-body" title={title}>
            <div
                class={`rounded-full h-full w-full text-center uppercase select-none ${props.onClick ? "cursor-pointer" : ""}`}
                style={{
                    "background-color": color,
                    color: `oklch(from ${color} clamp(0, (0.6 + (0.8 * l)) + (clamp(0, (l - 0.55) * 1000, 1) * ((0.1 + (0.8 * (l - 0.55))) - (0.6 + (0.8 * l)))), 1) c h)`,
                }}
                onClick={props.onClick}
            >
                <Show when={character} fallback={<UserRoundIcon strokeWidth={1.5} />}>
                    {user => <>{user()}</>}
                </Show>
            </div>
        </div>
    );
}
