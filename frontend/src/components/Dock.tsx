import { createResource, Show } from "solid-js";
import { A, useLocation } from "@solidjs/router";
import { meQuery } from "../graphql/client";

export default function Dock() {
    const location = useLocation();

    const [me] = createResource(async () => {
        const result = await meQuery();
        return result.data?.me ?? null;
    });

    return (
        <Show when={me()}>
            <div class="dock">
                <A href="/" class={location.pathname === "/" ? "dock-active" : ""}>
                    <span class="dock-label">Home</span>
                </A>
                <A href="/boards" class={location.pathname.startsWith("/boards") ? "dock-active" : ""}>
                    <span class="dock-label">Boards</span>
                </A>
            </div>
        </Show>
    );
}
