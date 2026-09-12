import { createResource, Show, type Component } from "solid-js";
import { client } from "./backend";

const App: Component = () => {
    const [me] = createResource(async () => {
        // await client.login({ body: { email: "test@test" } });
        try {
            const me = await client.me();
            if (me.status != 200) {
                return null;
            }
            return me.body;
        } catch (error) {
            return undefined;
        }
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
                {user => (
                    <div>
                        <p>Id: {user().id}</p>
                        <p>Created at: {user().created_at.toISOString()}</p>
                    </div>
                )}
            </Show>

            <Show when={!me.loading && me() === undefined}>
                <p>Something went wrong</p>
            </Show>
        </div>
    );
};

export default App;
