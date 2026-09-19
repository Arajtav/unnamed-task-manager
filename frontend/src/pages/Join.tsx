import { createSignal, Show } from "solid-js";
import { client } from "../auth";
import { A } from "@solidjs/router";
import { useAlert } from "../components/Layout";

export default function Join() {
    let { addAlert } = useAlert();

    // TODO: would be nice to debounce loading by a few ms.
    let [loading, setLoading] = createSignal(false);

    const [invite, setInvite] = createSignal("");
    const [name, setName] = createSignal("");

    async function register(e: SubmitEvent) {
        e.preventDefault();

        setLoading(true);

        let options;
        try {
            const rr = await client.registerStart(invite(), name());
            options = PublicKeyCredential.parseCreationOptionsFromJSON(rr);
        } catch (error) {
            console.error(error);

            if (error instanceof Error && error.message.startsWith("HTTP 404")) {
                addAlert(t("en", "invalidOrExpiredInvite"), "error");
            } else {
                addAlert(t("en", "errorTryAgain"), "error");
            }

            setLoading(false);
            return;
        }

        const credential = await navigator.credentials.create({
            publicKey: options,
        });

        if (!credential) {
            addAlert(t("en", "passkeyCreationFailed"), "warning");
            setLoading(false);
            return;
        }

        let cred = (credential as PublicKeyCredential).toJSON();

        try {
            await client.registerFinish(cred);
        } catch (error) {
            console.error(error);

            if (error instanceof Error && error.message.startsWith("HTTP 404")) {
                addAlert(t("en", "invalidOrExpiredInvite"), "error");
            } else {
                addAlert(t("en", "errorTryAgain"), "error");
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
            <div class="card w-full max-w-md bg-base-100 border border-base-200">
                <div class="card-body items-center text-center">
                    <h1 class="card-title text-2xl">{t("en", "joinTitle")}</h1>

                    <div class="w-full">
                        <Show when={loading()}>
                            <div class="flex flex-col items-center gap-3">
                                <span class="loading loading-spinner loading-lg" />
                                <span>{t("en", "waitingForPasskey")}</span>
                            </div>
                        </Show>
                    </div>

                    <form class="mt-4 w-full" onSubmit={register}>
                        <fieldset class="fieldset">
                            <label class="fieldset-label">{t("en", "inviteCodeInput")}</label>

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

                            <label class="fieldset-label mt-3">{t("en", "displayNameInput")}</label>
                            <input
                                class="input w-full validator"
                                type="text"
                                placeholder={t("en", "displayNamePlaceholder")}
                                value={name()}
                                onInput={e => setName(e.currentTarget.value)}
                                required
                            />
                            <button class="btn btn-primary mt-4 w-full" disabled={loading()}>
                                {t("en", "joinButton")}
                            </button>
                        </fieldset>
                    </form>

                    <div class="divider">{t("en", "altSeparatorText")}</div>

                    <A href={`/login${location.search}`} class="btn btn-ghost w-full">
                        {t("en", "backToLogin")}
                    </A>
                </div>
            </div>
        </main>
    );
}
