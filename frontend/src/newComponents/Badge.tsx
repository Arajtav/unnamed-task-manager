export default function Badge(props: { text: string; class?: string; onClick?: () => void }) {
    return (
        <div
            class={`inline-flex items-center rounded-full px-2 py-0.5 border-2 ${
                props.class ?? ""
            } ${props.onClick ? "cursor-pointer" : ""}`}
            onClick={props.onClick}
        >
            {props.text}
        </div>
    );
}
