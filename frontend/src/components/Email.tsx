import { createMemo } from "solid-js";

export default function Email(props: { email: string }) {
    const email = createMemo(() => {
        const at = props.email.lastIndexOf("@");
        return [props.email.slice(0, at), props.email.slice(at + 1)];
    });

    return (
        <div>
            <span>{email()[0]}</span>
            <span class="opacity-60">{" @ " + email()[1]}</span>
        </div>
    );
}
