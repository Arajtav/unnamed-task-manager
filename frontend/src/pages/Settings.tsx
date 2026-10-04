import { createMemo, createSignal, For, Show } from "solid-js";
import { parseOneAddress } from "email-addresses";
import { gqlClient } from "../graphql";
import { gql } from "@urql/core";
import Email from "../components/Email";
import { useMe } from "../contexts/meContext";
import { useAlert } from "../contexts/alertContext";
import { useModal } from "../contexts/modalContext";
import { TrashIcon } from "lucide-solid";

export default function Settings() {
    const [me, setMe] = useMe();
    const { addAlert } = useAlert();
    const { openModal } = useModal();

    const [email, setEmail] = createSignal("");
    const [adding, setAdding] = createSignal(false);
    const [emailValid, setEmailValid] = createSignal(false);
    const [emailDelete, setEmailDelete] = createSignal("");
    const [handle, setHandle] = createSignal(me.handle ?? "");
    const [saving, setSaving] = createSignal(false);

    const handleValid = createMemo(() => {
        let v = handle();
        return !v || /^[a-z][a-z0-9-]{2,18}$/.test(v);
    });

    async function addEmail() {
        setAdding(true);

        try {
            const result = await gqlClient.mutation<{
                addUserEmail: { emails: string[] };
            }>(
                gql`
                    mutation AddUserEmail($userId: UUID!, $email: String!) {
                        addUserEmail(userId: $userId, email: $email) {
                            emails
                        }
                    }
                `,
                {
                    userId: me.id,
                    email: email(),
                }
            );

            if (result.error) {
                throw result.error;
            }

            setMe("emails", result.data!.addUserEmail.emails);
            setEmail("");
        } catch (err) {
            addAlert(err instanceof Error ? err.message : "Failed to add email.", "error");
        }

        setAdding(false);
    }

    async function saveHandle() {
        if (handle() == me.handle) return;
        setSaving(true);

        try {
            const result = await gqlClient.mutation<{
                setUserHandle: { handle: string | null };
            }>(
                gql`
                    mutation SetUserHandle($userId: UUID!, $handle: String) {
                        setUserHandle(userId: $userId, handle: $handle) {
                            handle
                        }
                    }
                `,
                { userId: me.id, handle: handle() || null }
            );

            if (result.error) {
                throw result.error;
            }

            let new_handle = result.data!.setUserHandle.handle;

            setMe("handle", new_handle ?? undefined);
            setHandle(new_handle ?? "");
        } catch (err) {
            addAlert(err instanceof Error ? err.message : "Failed to set handle.", "error");
        }

        setSaving(false);
    }

    async function deleteEmail() {
        try {
            const result = await gqlClient.mutation<{ deleteUserEmail: { emails: string[] } }>(
                gql`
                    mutation DeleteUserEmail($userId: UUID!, $email: String!) {
                        deleteUserEmail(userId: $userId, email: $email) {
                            emails
                        }
                    }
                `,
                { userId: me.id, email: emailDelete() }
            );

            if (result.error) {
                throw result.error;
            }

            setMe("emails", result.data!.deleteUserEmail.emails);
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

                <div class="flex-1 p-6 gap-6 flex flex-col">
                    <fieldset class="fieldset bg-base-200 border-base-300 w-xs border p-4">
                        <legend class="fieldset-legend">Email addresses</legend>
                        <Show when={me.emails.length == 0}>
                            <div class="alert">
                                <span>You have no emails linked yet.</span>
                            </div>
                        </Show>
                        <Show when={me.emails.length > 0}>
                            <ul class="list bg-base-100 rounded-box mb-4">
                                <For each={me.emails}>
                                    {email => {
                                        return (
                                            <li class="list-row">
                                                <div></div>
                                                <Email email={email} />
                                                <button
                                                    class="btn btn-square btn-ghost"
                                                    onClick={() => {
                                                        setEmailDelete(email);
                                                        openModal({
                                                            title: "Are you sure?",
                                                            content: (
                                                                <p>
                                                                    Are you sure you want to unlink{" "}
                                                                    <span class="text-primary">
                                                                        {emailDelete()}
                                                                    </span>
                                                                </p>
                                                            ),
                                                            buttons: [
                                                                {
                                                                    label: "No",
                                                                    class: "btn-primary",
                                                                },
                                                                {
                                                                    label: "Yes",
                                                                    class: "btn-error",
                                                                    onClick: deleteEmail,
                                                                },
                                                            ],
                                                        });
                                                    }}
                                                >
                                                    <TrashIcon strokeWidth={1.5} />
                                                </button>
                                            </li>
                                        );
                                    }}
                                </For>
                            </ul>
                        </Show>

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

                    <fieldset class="fieldset bg-base-200 border-base-300 w-xs border p-4">
                        <legend class="fieldset-legend">You handle</legend>
                        <div class="join">
                            <input
                                type="text"
                                class="input join-item validator"
                                placeholder={me.handle ?? ""}
                                value={handle()}
                                minLength={3}
                                maxLength={19}
                                onInput={e => {
                                    setHandle(e.currentTarget.value);
                                    e.currentTarget.setCustomValidity(
                                        handleValid()
                                            ? ""
                                            : 'Invalid handle (must be at least 3 characters long, start with a letter and contain only lowercase letters and numbers (and "-"))'
                                    );
                                }}
                                disabled={saving()}
                            />

                            <button
                                class="btn btn-primary join-item"
                                onClick={saveHandle}
                                disabled={saving() || !handleValid()}
                            >
                                {saving() ? "Saving..." : "Save"}
                            </button>
                        </div>
                    </fieldset>
                </div>
            </div>
        </>
    );
}
