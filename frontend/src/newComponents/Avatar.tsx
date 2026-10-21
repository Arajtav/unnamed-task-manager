import { UserRoundIcon } from "lucide-solid";
import { Show } from "solid-js";
import { userColor } from "../format";
import { UserFromEmail } from "../gqlTypes";
import { textColor } from "../../colors";

export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";

export const sizeClasses: Record<AvatarSize, [string, number, number]> = {
    xs: ["h-5 text-xs", 2.5, 12],
    sm: ["h-6 text-sm", 2.0, 18],
    md: ["h-8 text-base", 1.5, 24],
    lg: ["h-12 text-xl", 1.25, 36],
    xl: ["h-16 text-2xl", 1.0, 48],
};

type TitleOptions =
    | { option: "auto" }
    | {
          option: "custom";
          value: string;
      };

type FlexibleUser =
    { id?: string | null; emails: string[]; handle?: string | null } | UserFromEmail;

function Avatar(props: {
    user?: FlexibleUser | null;
    title?: TitleOptions;
    size?: AvatarSize;
    onClick?: (e: MouseEvent) => void;
}) {
    const user = () =>
        props.user
            ? "emails" in props.user
                ? { id: props.user.id, handle: props.user.handle, fallback: props.user.emails[0] }
                : {
                      id: props.user.user?.id,
                      handle: props.user.user?.handle ?? null,
                      fallback: props.user.email,
                  }
            : undefined;

    const color = () => userColor(user()?.id);

    let title = () => {
        let u = user();
        if (props.title?.option == "custom") {
            return props.title.value;
        } else if (props.title?.option == "auto" && u) {
            return u.handle ? `@${u.handle}` : u.fallback;
        }
    };

    const character = () => user()?.handle?.charAt(0) ?? user()?.fallback?.charAt(0);

    const sc = () => sizeClasses[props.size ?? "md"];

    return (
        <div class={`avatar avatar-placeholder aspect-square font-body ${sc()[0]}`} title={title()}>
            <div
                class={`rounded-full h-full w-full text-center uppercase select-none ${props.onClick ? "cursor-pointer" : ""}`}
                style={{
                    "background-color": color(),
                    color: textColor(color()),
                }}
                onClick={props.onClick}
            >
                <Show
                    when={character()}
                    fallback={
                        <UserRoundIcon
                            strokeWidth={sc()[1]}
                            color={textColor(color())}
                            size={sc()[2]}
                        />
                    }
                >
                    {user => <>{user()}</>}
                </Show>
            </div>
        </div>
    );
}

export default Avatar;
