import { LucideProps, XIcon } from "lucide-solid";
import { Component, For, Show } from "solid-js";

type Icon = Component<LucideProps>;

export type AlertType = "normal" | "warning" | "error";

export const colorClasses: Record<AlertType, string> = {
    normal: "bg-base-200 border-base-300 text-base-content",
    warning: "bg-[#202009] border-[#5e4b06] text-[#eeaf00]",
    error: "bg-[#22130e] text-[#ff3231] border-[#641c18]",
};

export type AlertButton = {
    name: string;
    important: boolean;
    onClick: (e: MouseEvent) => void;
};

export type AlertProps = {
    onClose: () => void;
    buttons?: AlertButton[];
    title: string;
    content: string;
    icon: Icon;
    type: AlertType;
};

export function LogAlert(alert: { title: string; content: string; type: AlertType }) {
    const msg = `${alert.title}: ${alert.content}`;

    switch (alert.type) {
        case "normal": {
            console.log(msg);
            break;
        }
        case "warning": {
            console.warn(msg);
            break;
        }

        case "error": {
            console.error(msg);
            break;
        }
    }
}

// Buttons can wrap which is pretty ugly but they should usually be a single word.

function Alert(props: AlertProps) {
    return (
        <div
            class={`w-3xs px-2 py-3 text-sm sm:w-sm sm:px-4 sm:py-6 sm:text-base md:w-md lg:w-lg flex flex-row gap-4 rounded-2xl border drop-shadow-sm ${colorClasses[props.type]}`}
        >
            <div class="opacity-60 shrink-0">
                <props.icon />
            </div>
            <div class="flex flex-col flex-1 gap-1">
                <div>{props.title}</div>
                <div class="opacity-70">{props.content}</div>
                <Show when={props.buttons?.length}>
                    <div class="flex flex-row gap-2 mt-2 *:cursor-pointer text-base-content min-w-0">
                        <For each={props.buttons}>
                            {button => (
                                <button
                                    class={
                                        button.important
                                            ? "underline decoration-current/70"
                                            : "opacity-70"
                                    }
                                    onClick={button.onClick}
                                >
                                    {button.name}
                                </button>
                            )}
                        </For>
                    </div>
                </Show>
            </div>
            <div
                class="opacity-60 cursor-pointer w-min h-min p-3 -m-3 shrink-0"
                onClick={() => props.onClose()}
            >
                <XIcon />
            </div>
        </div>
    );
}

export default Alert;
