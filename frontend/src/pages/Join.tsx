import { createSignal, Match, Switch } from "solid-js";
import { client } from "../auth";
import { A } from "@solidjs/router";

export default function Join() {
    let [status, setStatus] = createSignal<
        null | "loading" | "error" | "invalid_invite" | "no_credential_created"
    >(null);
    const [invite, setInvite] = createSignal("");
    const [name, setName] = createSignal("");

    async function register(e: SubmitEvent) {
        e.preventDefault();

        setStatus("loading");

        let options;
        try {
            const rr = await client.registerStart(invite(), name());
            options = PublicKeyCredential.parseCreationOptionsFromJSON(rr);
        } catch (error) {
            console.error(error);

            if (error instanceof Error && error.message.startsWith("HTTP 404")) {
                setStatus("invalid_invite");
            } else {
                setStatus("error");
            }

            return;
        }

        const credential = await navigator.credentials.create({
            publicKey: options,
        });

        if (!credential) {
            setStatus("no_credential_created");
            return;
        }

        let cred = (credential as PublicKeyCredential).toJSON();

        try {
            if ((await client.registerFinish(cred)) !== null) {
                console.warn("seems wrong");
            }
        } catch (error) {
            console.error(error);

            if (error instanceof Error && error.message.startsWith("HTTP 404")) {
                setStatus("invalid_invite");
            } else {
                setStatus("error");
            }

            return;
        }

        window.location.assign("/login");
    }

    return (
        <main class="h-full flex items-center justify-center">
            <div class="card w-full max-w-md bg-base-200">
                <div class="card-body items-center text-center">
                    <h1 class="card-title text-2xl">Join</h1>

                    <div class="mt-4 w-full">
                        <Switch>
                            <Match when={status() == "loading"}>
                                <div class="flex flex-col items-center gap-3">
                                    <span class="loading loading-spinner loading-lg" />
                                    <span>Waiting for your passkey...</span>
                                </div>
                            </Match>

                            <Match when={status() == "invalid_invite"}>
                                <span class="alert alert-error">
                                    Invalid or expired invite code.
                                </span>
                            </Match>

                            <Match when={status() == "no_credential_created"}>
                                <span class="alert alert-warning">
                                    No passkey was created. Please try again.
                                </span>
                            </Match>

                            <Match when={status() == "error"}>
                                <span class="alert alert-error">
                                    Something went wrong. Please try again.
                                </span>
                            </Match>
                        </Switch>
                    </div>

                    <form class="mt-4 w-full" onSubmit={register}>
                        <fieldset class="fieldset">
                            <label class="fieldset-label">Invite code</label>
                            <input
                                class="input w-full"
                                type="text"
                                placeholder="XXXX-XXXX-XXXX"
                                value={invite()}
                                pattern="[a-zA-z]{4}-[a-zA-z]{4}-[a-zA-z]{4}"
                                onInput={e => setInvite(e.currentTarget.value.toUpperCase())}
                                required
                            />

                            <label class="fieldset-label mt-3">Display name</label>
                            <input
                                class="input w-full"
                                type="text"
                                placeholder="Me"
                                value={name()}
                                onInput={e => setName(e.currentTarget.value)}
                                required
                            />
                            <button class="btn btn-primary mt-4 w-full">Join</button>
                        </fieldset>
                    </form>

                    <div class="divider">OR</div>

                    <A href="/" class="btn btn-primary w-full">
                        Go back to login
                    </A>
                </div>
            </div>
        </main>
    );
}
