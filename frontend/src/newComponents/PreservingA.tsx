import { A, useLocation } from "@solidjs/router";
import type { ComponentProps } from "solid-js";

export function PreservingA(props: ComponentProps<typeof A>) {
    const location = useLocation();
    return <A {...props} href={`${props.href}${location.search}`} />;
}
