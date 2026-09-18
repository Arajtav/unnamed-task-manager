import { Show } from "solid-js";
import { useMe } from "../components/Layout";

export default function Home() {
    const { me } = useMe();

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
        </div>
    );
}
