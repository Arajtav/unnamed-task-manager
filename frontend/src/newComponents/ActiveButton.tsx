import { LucideProps } from "lucide-solid";
import { Component, Show } from "solid-js";
import LoadingSpinner from "../components/LoadingSpinner";

type Icon = Component<LucideProps>;

// TODO: updating text makes the width jump so it's probably not a great idea UI-wise.
export type ActiveButtonProps = {
    onClick: (e: MouseEvent) => void;
    text: string;
    icon: Icon;
    isLoading: boolean;
    disabled?: boolean;
};

function ActiveButton(props: ActiveButtonProps) {
    return (
        <button
            class="bg-base-200 border-base-300 text-base-content px-6 py-4 rounded-xl border drop-shadow-sm cursor-pointer group relative inline-flex items-center justify-center overflow-hidden enabled:hover:brightness-110 data-[loading=true]:brightness-110 data-[loading=true]:cursor-wait data-[loading=false]:disabled:cursor-not-allowed data-[loading=false]:disabled:opacity-50"
            onClick={props.onClick}
            disabled={props.disabled || props.isLoading}
            data-loading={props.isLoading}
        >
            <div class="transition translate-x-0 opacity-100 group-enabled:group-hover:translate-x-[-150%] group-enabled:group-hover:opacity-0 group-data-[loading=true]:translate-x-[-150%] group-data-[loading=true]:opacity-0">
                {props.text}
            </div>
            <div class="transition absolute translate-x-[150%] opacity-0 group-enabled:group-hover:translate-x-0 group-enabled:group-hover:opacity-100 group-data-[loading=true]:translate-x-0 group-data-[loading=true]:opacity-100">
                <Show when={props.isLoading} fallback={<props.icon />}>
                    <LoadingSpinner />
                </Show>
            </div>
        </button>
    );
}

export default ActiveButton;
