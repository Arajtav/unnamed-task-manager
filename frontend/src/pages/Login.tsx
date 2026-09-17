import { createEffect, createSignal, Match, Switch } from "solid-js";
import { client } from "../auth";
import { A } from "@solidjs/router";

export default function Login() {
    let [status, setStatus] = createSignal<
        "loading" | "server_error" | "no_credentials" | "error" | "user"
    >("loading");

    createEffect(async () => {
        let options;
        try {
            const cr = await client.loginStart();
            options = PublicKeyCredential.parseRequestOptionsFromJSON(cr);
        } catch (error) {
            console.error(error);

            if (error instanceof Error && error.message.startsWith("HTTP 500")) {
                setStatus("server_error");
            } else {
                setStatus("error");
            }

            return;
        }

        let credential;
        try {
            credential = await navigator.credentials.get({
                publicKey: options,
                mediation: "required",
            });
        } catch (error) {
            if (error instanceof Error && error.name === "NotAllowedError") {
                setStatus("user");
            } else {
                setStatus("error");
            }
            return;
        }

        if (!credential) {
            setStatus("no_credentials");
            return;
        }

        let cred = (credential as PublicKeyCredential).toJSON();

        try {
            await client.loginFinish(cred);
        } catch (error) {
            console.error(error);
            setStatus("server_error");
            return;
        }

        window.location.assign(
            decodeURIComponent(new URLSearchParams(location.search).get("back") ?? "/")
        );
    });

    return (
        <main class="h-full flex items-center justify-center">
            <div class="card w-full max-w-md bg-base-200">
                <div class="card-body items-center text-center">
                    <h1 class="card-title text-2xl">Sign in</h1>

                    <div class="mt-4 w-full">
                        <Switch>
                            <Match when={status() == "loading"}>
                                <div class="flex flex-col items-center gap-3">
                                    <span class="loading loading-spinner loading-lg" />
                                    <span>Waiting for your passkey...</span>
                                </div>
                            </Match>

                            <Match when={status() == "server_error"}>
                                <div class="alert alert-error">
                                    <span>Server error. This shouldn't have happened.</span>
                                </div>
                            </Match>

                            <Match when={status() == "no_credentials"}>
                                <div class="alert alert-warning">
                                    <span>No passkeys were found.</span>
                                </div>
                            </Match>

                            <Match when={status() == "user"}>
                                <div class="alert alert-info">
                                    <span>
                                        Unable to get any passkeys. Check your authenticator.
                                    </span>
                                </div>
                            </Match>

                            <Match when={status() == "error"}>
                                <div class="alert alert-error">
                                    <span>Something went wrong.</span>
                                </div>
                            </Match>
                        </Switch>
                    </div>

                    <div class="divider">OR</div>

                    <A href="/join" class="btn btn-primary w-full">
                        Join
                    </A>
                </div>
            </div>
        </main>
    );
}
