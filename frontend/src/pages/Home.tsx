import { Show } from "solid-js";
import { useMe } from "../components/Layout";

export default function Home() {
    const me = useMe();

    return (
        <div class="w-full h-full flex items-center justify-center">
            <Show when={me.loading}>
                <span class="loading loading-spinner loading-lg" />
            </Show>

            <Show when={!me.loading && me() === undefined}>
                <div class="toast">
                    <div class="alert alert-error">
                        <span>Something went wrong</span>
                    </div>
                </div>
            </Show>

            <Show when={!me.loading && me()}>
                {user => (
                    <div class="card card-border card-xl bg-base-100 border border-primary/50">
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
