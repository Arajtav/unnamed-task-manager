import { createResource, Show } from "solid-js";
import { RouteSectionProps } from "@solidjs/router";
import { meQuery } from "../graphql/client";
import Navbar from "./Navbar";

export default function Layout(props: RouteSectionProps) {
    const [me] = createResource(async () => {
        const result = await meQuery();
        return result.data?.me ?? null;
    });

    return (
        <div class="bg-neutral flex flex-col h-screen">
            <Show when={me()}>{(user) => <Navbar me={user()} />}</Show>
            <div class="flex-1 overflow-auto">{props.children}</div>
        </div>
    );
}
