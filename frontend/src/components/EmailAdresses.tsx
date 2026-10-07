import { createSignal, For, Show } from "solid-js";
import { useAlert } from "../contexts/alertContext";
import { Me, useAppData } from "../contexts/appDataContext";
import { useModal } from "../contexts/modalContext";
import { gqlClient } from "../graphql";
import { gql } from "@urql/core";
import Email from "./Email";
import { parseOneAddress } from "email-addresses";
import { TrashIcon } from "lucide-solid";

export default function EmailAddresses() {
    const [appData, setAppData] = useAppData();
    const { addAlert } = useAlert();
    const { openModal } = useModal();

    const [email, setEmail] = createSignal("");
    const [adding, setAdding] = createSignal(false);
    const [emailValid, setEmailValid] = createSignal(false);

    async function addEmail() {
        setAdding(true);

        try {
            const result = await gqlClient.mutation<{
                updateUser: Me;
            }>(
                gql`
                    mutation updateUser($userId: UUID!, $email: String!) {
                        updateUser(userId: $userId, addEmails: [$email]) {
                            id
                            isAdmin
                            emails
                            handle
                            invite
                        }
                    }
                `,
                {
                    userId: appData.me.id,
                    email: email(),
                }
            );

            if (result.error) {
                throw result.error;
            }

            setAppData("me", result.data!.updateUser);
            setEmail("");
            setEmailValid(false);
        } catch (err) {
            addAlert(err instanceof Error ? err.message : "Failed to add email.", "error");
        }

        setAdding(false);
    }

    async function deleteEmail(email: string) {
        try {
            const result = await gqlClient.mutation<{
                updateUser: Me;
            }>(
                gql`
                    mutation updateUser($userId: UUID!, $email: String!) {
                        updateUser(userId: $userId, deleteEmails: [$email]) {
                            id
                            isAdmin
                            emails
                            handle
                            invite
                        }
                    }
                `,
                {
                    userId: appData.me.id,
                    email,
                }
            );

            if (result.error) {
                throw result.error;
            }

            setAppData("me", result.data!.updateUser);
        } catch (err) {
            addAlert(err instanceof Error ? err.message : "Failed to delete email.", "error");
        }
    }

    return (
        <fieldset class="fieldset bg-base-200 border-base-300 w-xs border p-4">
            <legend class="fieldset-legend">Email addresses</legend>

            <Show when={appData.me.emails.length == 0}>
                <div class="alert">
                    <span>You have no emails linked yet.</span>
                </div>
            </Show>

            <Show when={appData.me.emails.length > 0}>
                <ul class="list bg-base-100 rounded-box mb-4">
                    <For each={appData.me.emails}>
                        {email => (
                            <li class="list-row">
                                <div></div>

                                <Email email={email} />

                                <button
                                    class="btn btn-square btn-ghost"
                                    onClick={() => {
                                        openModal({
                                            title: "Are you sure?",
                                            content: (
                                                <p>
                                                    Are you sure you want to unlink{" "}
                                                    <span class="text-primary">{email}</span>
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
                                                    onClick: () => deleteEmail(email),
                                                },
                                            ],
                                        });
                                    }}
                                >
                                    <TrashIcon strokeWidth={1.5} />
                                </button>
                            </li>
                        )}
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
                        const isValid = parseOneAddress(email()) != null;
                        e.currentTarget.setCustomValidity(isValid ? "" : "Invalid email");

                        setEmailValid(isValid);
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
    );
}
