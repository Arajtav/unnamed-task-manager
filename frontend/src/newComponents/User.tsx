import { Show } from "solid-js";
import Avatar from "./Avatar";

export default function User(props: {
    user?: { id?: string | null; emails: string[]; handle?: string | null } | null;
}) {
    return (
        <Show when={props.user} fallback={<UnknownUser />}>
            {user => {
                return <UserInternal user={user()} />;
            }}
        </Show>
    );
}

function UserInternal(props: {
    user: { id?: string | null; emails: string[]; handle?: string | null };
}) {
    return (
        <div class="flex flex-row h-12 items-center px-1 gap-2 font-heading">
            <Avatar user={props.user} />
            <div class="flex flex-col justify-center h-full">
                <Show when={props.user.handle}>
                    <div class="truncate">{"@" + props.user.handle!}</div>
                </Show>
                <Show when={props.user.emails.length}>
                    <div
                        class={
                            props.user.emails.length > 1
                                ? "tooltip tooltip-start before:whitespace-pre-line before:text-left"
                                : ""
                        }
                        data-tip={props.user.emails.join("\n")}
                    >
                        <div class={`truncate ${props.user.handle ? "opacity-60" : ""}`}>
                            {props.user.emails[0] + (props.user.emails.length > 1 ? "..." : "")}
                        </div>
                    </div>
                </Show>
                <Show when={!props.user.handle && !props.user.emails.length}>
                    <div class="truncate">This user has no name</div>
                </Show>
            </div>
        </div>
    );
}

function UnknownUser() {
    return (
        <div class="flex flex-row h-12 items-center px-1 gap-2 font-heading">
            <Avatar />
            <div class="flex flex-col justify-center h-full">
                <div class="truncate">Unknown user</div>
            </div>
        </div>
    );
}
