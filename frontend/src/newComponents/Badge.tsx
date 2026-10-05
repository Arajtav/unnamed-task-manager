export default function Badge(props: { text: string; class: string }) {
    return <div class={`rounded-full px-2 py-0.5 border-2 ${props.class}`}>{props.text}</div>;
}
