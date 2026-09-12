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
                <span class="loading loading-spinner loading-lg" />
            </Show>

            <Show when={!me.loading && me() === null}>
                <div role="alert" class="alert alert-warning">
                    <span>Not authenticated</span>
                </div>
            </Show>

            <Show when={!me.loading && me() === undefined}>
                <div role="alert" class="alert alert-error">
                    <span>Something went wrong</span>
                </div>
            </Show>

            <Show when={!me.loading && me()}>
                {(user) => (
                    <div class="card card-border card-xl bg-base-100">
                        <div class="card-body">
                            <div class="card-title">
                                <div class="avatar avatar-placeholder">
                                    <div class="bg-neutral text-neutral-content w-8 rounded-full">
                                        <span class="text-xs">U</span>
                                    </div>
                                </div>
                                <h2>User</h2>
                            </div>
                            <p>Id: {user().id}</p>
                            <p>Created at: {new Date(user().createdAt).toISOString()}</p>
                            <p>Is admin: {user().isAdmin ? "yes" : "no"}</p>
                        </div>
                    </div>
                )}
            </Show>
        </div>
    );
}
