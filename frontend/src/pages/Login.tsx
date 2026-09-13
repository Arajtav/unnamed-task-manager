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
        <div class="hero bg-base-200 h-full">
            <div class="hero-content flex-col lg:flex-row-reverse">
                <div class="text-center lg:text-left">
                    <h1 class="text-5xl font-bold">Welcome!</h1>
                    <p class="py-6">Feel free to try out our task manager :3</p>
                </div>
                <div class="card bg-base-100 w-full max-w-sm shrink-0 shadow-2xl">
                    <div class="card-body">
                        <form onSubmit={submit}>
                            <fieldset class="fieldset">
                                <label class="label">Email</label>
                                <input
                                    class="input"
                                    type="email"
                                    placeholder="Email"
                                    value={email()}
                                    onInput={(e) => setEmail(e.currentTarget.value)}
                                    required
                                />
                            </fieldset>
                            <div class="card-actions">
                                <button class="btn btn-primary mt-4" type="submit">
                                    Login
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
