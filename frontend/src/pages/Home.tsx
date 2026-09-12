import { createResource, Show } from "solid-js";
import { A } from "@solidjs/router";
import { handleAuthError } from "../auth";
import { meQuery } from "../graphql/client";

export default function Home() {
    const [me] = createResource(async () => {
        const result = await meQuery();

        if (handleAuthError(result.error)) return undefined;

        return result.data?.me ?? null;
    });

    return (
        <div class="w-screen h-screen flex items-center justify-center">
            <Show when={me.loading}>
                <p>Loading...</p>
            </Show>

            <Show when={!me.loading && me() === null}>
                <p>Not authenticated</p>
            </Show>

            <Show when={!me.loading && me()}>
                {(user) => (
                    <div class="flex flex-col gap-2 items-center">
                        <div class="border p-2">
                            <p class="text-center font-bold">User</p>
                            <p>Id: {user().id}</p>
                            <p>Created at: {new Date(user().createdAt).toISOString()}</p>
                        </div>
                        <A class="button" href="/boards">
                            Boards
                        </A>
                    </div>
                )}
            </Show>

            <Show when={!me.loading && me() === undefined}>
                <p>Something went wrong</p>
            </Show>
        </div>
    );
}
