import { createSignal } from "solid-js";
import { useLocation } from "@solidjs/router";
import { client } from "../auth";

export default function Login() {
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

            if (response.status == 204) {
                window.location.assign(decodeURIComponent(new URLSearchParams(location.search).get("back") ?? "/"));
            }
        } catch (error) {
            console.error(error);
        }
    }

    return (
        <div class="w-screen h-screen flex items-center justify-center">
            <form class="flex flex-col gap-2 items-center" onSubmit={submit}>
                <input
                    class="border px-2"
                    placeholder="Email"
                    type="text"
                    value={email()}
                    onInput={(e) => setEmail(e.currentTarget.value)}
                    required
                />
                <button class="button" type="submit">
                    Log in
                </button>
            </form>
        </div>
    );
}
