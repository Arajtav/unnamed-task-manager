import { createSignal } from "solid-js";
import { useAlert, useMe } from "../components/Layout";
import { addUserEmail, deleteUserEmail } from "../graphql/client";
import { parseOneAddress } from "email-addresses";

export default function Settings() {
    const [me, setMe] = useMe();
    let { addAlert } = useAlert();

    const [email, setEmail] = createSignal("");
    const [adding, setAdding] = createSignal(false);
    const [emailValid, setEmailValid] = createSignal(false);
    const [emailDelete, setEmailDelete] = createSignal("");

    async function addEmail() {
        setAdding(true);

        try {
            const result = await addUserEmail(me.id, email());

            if (result.error) {
                throw result.error;
            }

            setMe("emails", me.emails.concat([{ email: email() }]));
            setEmail("");
        } catch (err) {
            addAlert(err instanceof Error ? err.message : "Failed to add email.", "error");
        }

        setAdding(false);
    }

    async function deleteEmail() {
        let del = emailDelete();

        try {
            const result = await deleteUserEmail(me.id, del);

            if (result.error) {
                throw result.error;
            }

            setMe(
                "emails",
                me.emails.filter(e => e.email != del)
            );
        } catch (err) {
            addAlert(err instanceof Error ? err.message : "Failed to delete email.", "error");
        }
    }

    return (
        <>
            <div class="w-full h-full flex flex-row">
                <ul class="menu bg-base-200 w-56 h-full">
                    <li>
                        <a class="menu-active">Account</a>
                    </li>
                </ul>

                <div class="flex-1 p-6">
                    <fieldset class="fieldset bg-base-200 border-base-300 w-xs border p-4">
                        <legend class="fieldset-legend">Email addresses</legend>
                        {me.emails.length == 0 ? (
                            <div class="alert">
                                <span>You have no emails linked yet.</span>
                            </div>
                        ) : (
                            <ul class="list bg-base-100 rounded-box mb-4">
                                {me.emails.map(({ email }) => {
                                    let at = email.lastIndexOf("@");

                                    return (
                                        <li class="list-row">
                                            <div></div>
                                            <div>
                                                <span>{email.slice(0, at)}</span>
                                                <span class="opacity-60">
                                                    {" @ " + email.slice(at + 1)}
                                                </span>
                                            </div>
                                            <button
                                                class="btn btn-square btn-ghost"
                                                onClick={() => {
                                                    setEmailDelete(email);
                                                    return (
                                                        document.getElementById(
                                                            "modal"
                                                        ) as HTMLDialogElement
                                                    ).showModal();
                                                }}
                                            >
                                                <svg
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    stroke-width="1.5"
                                                    stroke="currentColor"
                                                    class="size-6"
                                                >
                                                    <path
                                                        stroke-linecap="round"
                                                        stroke-linejoin="round"
                                                        d="M6 18 18 6M6 6l12 12"
                                                    />
                                                </svg>
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}

                        <div class="join">
                            <input
                                type="text"
                                inputMode="email"
                                class="input join-item validator"
                                placeholder="me@example.org"
                                required
                                value={email()}
                                onInput={e => {
                                    setEmail(e.currentTarget.value);
                                    let is_valid = parseOneAddress(email()) != null;
                                    e.currentTarget.setCustomValidity(
                                        is_valid ? "" : "Invalid email"
                                    );
                                    setEmailValid(is_valid);
                                }}
                                id="email-in"
                                disabled={adding()}
                            />

                            <button
                                class="btn btn-primary join-item"
                                onClick={addEmail}
                                disabled={adding() || !emailValid()}
                            >
                                {adding() ? "Adding..." : "Add"}
                            </button>
                        </div>
                    </fieldset>
                </div>
            </div>
            <dialog id="modal" class="modal">
                <div class="modal-box">
                    <h3 class="text-lg font-bold">Are you sure?</h3>
                    <p class="py-4">
                        Are you sure you to unlink <span class="text-primary">{emailDelete()}</span>
                    </p>
                    <div class="modal-action">
                        <form method="dialog" class="flex gap-2">
                            <button class="btn btn-primary">No</button>
                            <button onClick={deleteEmail} class="btn btn-error">
                                Yes
                            </button>
                        </form>
                    </div>
                </div>
                <form method="dialog" class="modal-backdrop">
                    <button>close</button>
                </form>
            </dialog>
        </>
    );
}
