import { JSX } from "solid-js";

export default function Badge(props: {
    text: string;
    class?: string;
    style?: string | JSX.CSSProperties;
    onClick?: (e: MouseEvent) => void;
}) {
    return (
        <div
            class={`inline-flex items-center rounded-full px-2 py-0.5 border-2 min-w-3 box-content justify-center ${
                props.class ?? ""
            } ${props.onClick ? "cursor-pointer" : ""}`}
            style={props.style}
            onClick={props.onClick}
        >
            {props.text}
        </div>
    );
}

/*
TODO: this or something also get some real values instead of these random numbers
style={{
    "background-color": props.status.color,
    color: `oklch(from ${props.status.color} calc((0.88 + (0.1 * l)) - (clamp(0, (l - 0.58) * 1000, 1) * 0.76)) c h)`,
}}
*/
