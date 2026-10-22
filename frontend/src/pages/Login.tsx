import { createSignal, Match, onMount, Show, Switch } from "solid-js";
import { client } from "../auth";
import { A } from "@solidjs/router";
import { useAlert } from "../contexts/alertContext";
import { Title } from "@solidjs/meta";
import { CircleXIcon, SearchAlertIcon, ServerCrashIcon, UserRoundXIcon } from "lucide-solid";

export default function Login() {
    const { addAlert } = useAlert();

    // TODO: would be nice to debounce loading by a few ms.
    let [loading, setLoading] = createSignal(false);

    async function login() {
        setLoading(true);

        let options;
        try {
            const cr = await client.loginStart();
            options = PublicKeyCredential.parseRequestOptionsFromJSON(cr);
        } catch (error) {
            console.error(error);

            if (error instanceof Error && error.message.startsWith("HTTP 500")) {
                addAlert({
                    type: "error",
                    title: "Server error",
                    content: "This shouldn't have happened.",
                    icon: ServerCrashIcon,
                });
            } else {
                addAlert({
                    type: "error",
                    title: "Something went wrong",
                    content: "Try again later.",
                    icon: CircleXIcon,
                });
            }

            setLoading(false);
            return;
        }

        let credential;
        try {
            credential = await navigator.credentials.get({
                publicKey: options,
                mediation: "required",
            });
        } catch (error) {
            if (error instanceof Error && error.name == "NotAllowedError") {
                addAlert({
                    type: "error",
                    title: "Unable to get any passkeys",
                    content: "Check your authenticator and try again.",
                    icon: CircleXIcon,
                });
            } else {
                addAlert({
                    type: "error",
                    title: "Something went wrong",
                    content: "Try again later.",
                    icon: CircleXIcon,
                });
            }

            setLoading(false);
            return;
        }

        if (!credential) {
            addAlert({
                type: "normal",
                title: "No passkeys",
                content: "No passkeys were found",
                icon: SearchAlertIcon,
            });
            setLoading(false);
            return;
        }

        let cred = (credential as PublicKeyCredential).toJSON();

        try {
            await client.loginFinish(cred);
        } catch (error) {
            if (error instanceof Error && error.message.startsWith("HTTP 500")) {
                addAlert({
                    type: "error",
                    title: "Server error",
                    content: "This shouldn't have happened.",
                    icon: ServerCrashIcon,
                });
            } else if (error instanceof Error && error.message.startsWith("HTTP 401")) {
                addAlert({
                    type: "warning",
                    title: "Account not found",
                    content: "This account does not exist or is disabled",
                    icon: UserRoundXIcon,
                });
            } else {
                addAlert({
                    type: "error",
                    title: "Something went wrong",
                    content: "Try again later.",
                    icon: CircleXIcon,
                });
            }
            setLoading(false);
            return;
        }

        window.location.assign(
            decodeURIComponent(new URLSearchParams(location.search).get("back") ?? "/")
        );
    }

    onMount(async () => {
        const url = new URL(window.location.href);
        const auto = url.searchParams.get("auto") == "1";

        if (!auto) return;

        url.searchParams.delete("auto");
        window.history.replaceState({}, "", url);
        await login();
    });

    return (
        <main class="h-full flex items-center justify-center">
            <Title>Login</Title>
            <div class="card w-full max-w-md bg-base-100 border border-base-200">
                <div class="card-body items-center text-center">
                    <h1 class="card-title text-2xl mb-4">Sign in</h1>

                    <div class="w-full">
                        <Switch>
                            <Match when={loading()}>
                                <div class="flex flex-col items-center gap-3">
                                    <span class="loading loading-spinner loading-lg" />
                                    <span>Waiting for your passkey...</span>
                                </div>
                            </Match>
                        </Switch>

                        <Show when={!loading()}>
                            <button class="btn btn-primary w-full" onclick={login}>
                                Sign in
                            </button>
                        </Show>
                    </div>

                    <div class="divider">OR</div>

                    <A href={`/join${location.search}`} class="btn btn-ghost w-full">
                        Join
                    </A>
                </div>
            </div>
        </main>
    );
}
