import { createSignal } from "solid-js";
import { client } from "../auth";

export default function Login() {
    const [invite, setInvite] = createSignal("");
    const [name, setName] = createSignal("");

    async function register(e: SubmitEvent) {
        e.preventDefault();
        let rr;
        try {
            rr = await client.registerStart(invite(), name());
        } catch (error) {
            // it doesn't actually handle it heh
            if (error == new Error("404")) {
                console.error("Wrong invite");
                return;
            }
            console.error(error);
            return;
        }
        console.debug(rr);

        const options = PublicKeyCredential.parseCreationOptionsFromJSON(rr);
        console.debug(options);
        const credential = await navigator.credentials.create({
            publicKey: options,
        });

        if (!credential) {
            console.error("No credentials created?");
            return;
        }

        if (!(credential instanceof PublicKeyCredential)) {
            console.error("Expected a PublicKeyCredential how did it even get that wrong");
            return;
        }

        try {
            let cred = credential.toJSON();
            console.debug(cred);

            if ((await client.registerFinish(cred)) !== null) {
                console.warn("seems wrong");
            }
        } catch (error) {
            console.error(error);
            return;
        }
    }

    async function login() {
        let cr;
        try {
            cr = await client.loginStart();
        } catch (error) {
            console.error(error);
            return;
        }
        console.debug(cr);

        const options = PublicKeyCredential.parseRequestOptionsFromJSON(cr);

        const credential = await navigator.credentials.get({
            publicKey: options,
            mediation: "required",
        });

        if (!credential) {
            console.error("No credentials returned");
            return;
        }

        if (!(credential instanceof PublicKeyCredential)) {
            console.error("Expected a PublicKeyCredential");
            return;
        }

        try {
            let cred = credential.toJSON();
            console.debug(cred);
            await client.loginFinish(cred);
            window.location.assign(
                decodeURIComponent(new URLSearchParams(location.search).get("back") ?? "/")
            );
        } catch (error) {
            console.error(error);
            return;
        }
    }

    return (
        <div class="hero bg-base-200 h-full">
            <div class="hero-content flex-col lg:flex-row-reverse">
                <div class="text-center lg:text-left">
                    <h1 class="text-5xl font-bold">Welcome!</h1>
                    <p class="py-6">Feel free to try out our task manager :3</p>
                </div>
                <div class="card bg-base-100 w-full max-w-sm shrink-0 shadow-2xl">
                    <div class="card-body">
                        <form onSubmit={register}>
                            <fieldset class="fieldset">
                                <label class="label">Invite code</label>
                                <input
                                    class="input"
                                    type="text"
                                    placeholder="XXXX-XXXX-XXXX"
                                    value={invite()}
                                    pattern="[a-zA-z]{4}-[a-zA-z]{4}-[a-zA-z]{4}"
                                    onInput={e => setInvite(e.currentTarget.value.toUpperCase())}
                                    required
                                />
                                <label class="label">Display name</label>
                                <input
                                    class="input"
                                    type="text"
                                    placeholder="Me"
                                    value={name()}
                                    onInput={e => setName(e.currentTarget.value)}
                                    required
                                />
                            </fieldset>
                            <div class="card-actions">
                                <button class="btn btn-primary mt-4" type="submit">
                                    register
                                </button>
                            </div>
                        </form>
                        <button class="btn btn-primary" type="submit" onClick={login}>
                            login
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
