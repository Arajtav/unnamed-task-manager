import { createResource, createSignal, Show } from "solid-js";
import { client } from "./backend";

import { Router, Route, useLocation } from "@solidjs/router";

export default function App() {
    return (
        <Router>
            <Route path="/" component={Home} />
            <Route path="/login" component={Login} />
        </Router>
    );
}

function Login() {
    const location = useLocation();
    const [email, setEmail] = createSignal("");

    async function submit(e: SubmitEvent) {
        e.preventDefault();

        try {
            const response = await client.login({
                body: { email: email() },
            });

            if (response.status == 401) {
                console.error("Wrong login");
                return;
            }

            if (response.status == 200) {
                window.location.assign(
                    decodeURIComponent(new URLSearchParams(location.search).get("back") ?? "/")
                );
            }
        } catch (error) {
            console.error(error);
        }
    }

    return (
        <form onSubmit={submit}>
            <input
                type="text"
                value={email()}
                onInput={e => setEmail(e.currentTarget.value)}
                required
            />
            <button type="submit">Log in</button>
        </form>
    );
}

type NotUnauthorized<T extends { status: number }> = T & { status: Exclude<T["status"], 401> };

function login_redirect<T extends { status: number }>(a: T): NotUnauthorized<T> {
    if (a.status == 401) {
        const url = window.location.pathname + window.location.search;
        window.location.assign(`/login?back=${encodeURIComponent(url)}`);
    }

    return a as NotUnauthorized<T>;
}

function Home() {
    const [me] = createResource(async () => {
        try {
            const me = login_redirect(await client.me());

            // TODO: this shouldn't be required?
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
}
