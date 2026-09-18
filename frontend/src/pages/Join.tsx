import { createSignal, Match, Switch } from "solid-js";
import { client } from "../auth";
import { A } from "@solidjs/router";

export default function Join() {
    // TODO: would be nice to debounce loading by a few ms.
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

        window.location.assign(
            decodeURIComponent(new URLSearchParams(location.search).get("back") ?? "/")
        );
    }

    return (
        <main class="h-full flex items-center justify-center">
            <div class="card w-full max-w-md bg-base-100 border border-base-200">
                <div class="card-body items-center text-center">
                    <h1 class="card-title text-2xl">Join</h1>

                    <div class="w-full">
                        <Switch>
                            <Match when={status() == "loading"}>
                                <div class="flex flex-col items-center gap-3">
                                    <span class="loading loading-spinner loading-lg" />
                                    <span>Waiting for your passkey...</span>
                                </div>
                            </Match>

                            <Match when={status() == "invalid_invite"}>
                                <div class="toast">
                                    <span class="alert alert-error">
                                        Invalid or expired invite code.
                                    </span>
                                </div>
                            </Match>

                            <Match when={status() == "no_credential_created"}>
                                <div class="toast">
                                    <span class="alert alert-warning">
                                        No passkey was created. Please try again.
                                    </span>
                                </div>
                            </Match>

                            <Match when={status() == "error"}>
                                <div class="toast">
                                    <span class="alert alert-error">
                                        Something went wrong. Please try again.
                                    </span>
                                </div>
                            </Match>
                        </Switch>
                    </div>

                    <form class="mt-4 w-full" onSubmit={register}>
                        <fieldset class="fieldset">
                            <label class="fieldset-label">Invite code</label>

                            <input
                                class="input w-full validator"
                                type="text"
                                placeholder="XXXX-XXXX-XXXX"
                                value={invite()}
                                pattern="[a-zA-z]{4}(-[a-zA-z]{4}){2}"
                                onBeforeInput={e => {
                                    if (!e.data) return;

                                    e.preventDefault();

                                    const input = e.currentTarget;
                                    const start = input.selectionStart ?? 0;
                                    const end = input.selectionEnd ?? 0;

                                    const letters = e.data.replace(/[^a-zA-Z]/g, "");

                                    const value =
                                        input.value.slice(0, start) +
                                        letters +
                                        input.value.slice(end);

                                    const formatted =
                                        value
                                            .replace(/[^a-zA-Z]/g, "")
                                            .toUpperCase()
                                            .slice(0, 12)
                                            .match(/.{1,4}/g)
                                            ?.join("-") ?? "";

                                    setInvite(formatted);
                                }}
                                onInput={e => {
                                    setInvite(e.currentTarget.value);
                                }}
                                required
                            />

                            <label class="fieldset-label mt-3">Display name</label>
                            <input
                                class="input w-full validator"
                                type="text"
                                placeholder="Me"
                                value={name()}
                                onInput={e => setName(e.currentTarget.value)}
                                required
                            />
                            <button
                                class="btn btn-primary mt-4 w-full"
                                disabled={status() == "loading"}
                            >
                                Join
                            </button>
                        </fieldset>
                    </form>

                    <div class="divider">OR</div>

                    <A href={`/login${location.search}`} class="btn btn-ghost w-full">
                        Go back to login
                    </A>
                </div>
            </div>
        </main>
    );
}
