import { JSXElement } from "solid-js";

export default function BadgeButton(props: {
    icon: JSXElement;
    class?: string;
    onClick: () => void;
}) {
    return (
        <div
            class={`cursor-pointer rounded-full p-0.5 border-2 ${props.class ?? ""}`}
            onClick={props.onClick}
        >
            {props.icon}
        </div>
    );
}
