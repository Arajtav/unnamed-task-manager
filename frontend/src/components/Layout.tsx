import { createResource, Show } from "solid-js";
import { RouteSectionProps } from "@solidjs/router";
import { meQuery } from "../graphql/client";
import Navbar from "./Navbar";

export default function Layout(props: RouteSectionProps) {
    // TODO: do not show navbar on registration and login.
    const [me] = createResource(async () => {
        const result = await meQuery();
        return result.data?.me ?? null;
    });

    return (
        <div class="flex flex-col h-screen w-screen">
            <Show when={me()}>{user => <Navbar me={user()} />}</Show>
            <div class="flex-1 overflow-auto">{props.children}</div>
        </div>
    );
}
