import { createSignal, Show } from "solid-js";
import { client } from "../auth";
import { A } from "@solidjs/router";
import { useAlert } from "../contexts/alertContext";
import { Title } from "@solidjs/meta";
import {
    CircleXIcon,
    GlobeOffIcon,
    RotateCwIcon,
    ServerCrashIcon,
    ShieldXIcon,
} from "lucide-solid";

const SERVER_WRONG = {
    type: "error",
    title: "Server error",
    content: "Server sent invalid response.",
    icon: ServerCrashIcon,
} as const;

const NETWORK = {
    type: "error",
    title: "Network error",
    content: "Check your internet connection and try again.",
    icon: GlobeOffIcon,
} as const;

export default function Join() {
    const [nea, setNea] = createSignal<symbol | undefined>(undefined);
    const { addAlert, addSingleAlert } = useAlert();

    // TODO: would be nice to debounce loading by a few ms.
    let [loading, setLoading] = createSignal(false);

    const [invite, setInvite] = createSignal("");
    const [name, setName] = createSignal("");

    async function register(e: SubmitEvent) {
        e.preventDefault();

        setLoading(true);

        const rr = await client.registerStart(invite(), name());
        if (rr.error) {
            if (rr.error.type == "network") {
                setNea(addSingleAlert(nea(), NETWORK, 60));
            } else {
                addAlert(SERVER_WRONG);
            }
            setLoading(false);
            return;
        }
        let options;
        try {
            options = PublicKeyCredential.parseCreationOptionsFromJSON(rr.data);
        } catch (error) {
            console.error(error);
            addAlert(SERVER_WRONG);
            setLoading(false);
            return;
        }

        const credential = await navigator.credentials.create({
            publicKey: options,
        });

        if (!credential) {
            addAlert({
                type: "warning",
                title: "Failed to create a passkey",
                content: "Please try again.",
                icon: RotateCwIcon,
            });
            setLoading(false);
            return;
        }

        let cred = (credential as PublicKeyCredential).toJSON();

        const res = await client.registerFinish(cred);
        if (res.error) {
            if (res.error.type == "network") {
                setNea(addSingleAlert(nea(), NETWORK, 60));
            } else if (res.error.type == "http" && res.error.status == 401) {
                addAlert({
                    type: "error",
                    title: "Code expired",
                    content:
                        "This code has expired or has been used while you were creating the passkey.",
                    icon: ShieldXIcon,
                });
            } else {
                addAlert(SERVER_WRONG);
            }

            setLoading(false);
            return;
        }

        window.location.assign(
            decodeURIComponent(new URLSearchParams(location.search).get("back") ?? "/")
        );
    }

    return (
        <main class="h-full flex items-center justify-center">
            <Title>Join</Title>
            <div class="card w-full max-w-md bg-base-100 border border-base-200">
                <div class="card-body items-center text-center">
                    <h1 class="card-title text-2xl">Join</h1>

                    <div class="w-full">
                        <Show when={loading()}>
                            <div class="flex flex-col items-center gap-3">
                                <span class="loading loading-spinner loading-lg" />
                                <span>Waiting for your passkey...</span>
                            </div>
                        </Show>
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
                            <button class="btn btn-primary mt-4 w-full" disabled={loading()}>
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
