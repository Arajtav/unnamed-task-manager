import { createMemo, createSignal } from "solid-js";
import { useAlert } from "../contexts/alertContext";
import { useAppData } from "../contexts/appDataContext";
import { gqlClient } from "../graphql";
import { gql } from "@urql/core";
import { Me } from "../gqlTypes";
import { SOMETHING } from "../alerts";

export default function YourHandle() {
    const [appData, setAppData] = useAppData();
    const { addAlert } = useAlert();

    const [handle, setHandle] = createSignal(appData.me.handle ?? "");
    const [saving, setSaving] = createSignal(false);

    const handleValid = createMemo(() => {
        const value = handle();
        return !value || /^[a-z][a-z0-9-]{2,18}$/.test(value);
    });

    async function saveHandle() {
        if (handle() == appData.me.handle) return;

        setSaving(true);

        const result = await gqlClient.mutation<{
            updateUser: Me;
        }>(
            gql`
                mutation UpdateUser($userId: UUID!, $input: UpdateUserInput!) {
                    updateUser(userId: $userId, input: $input) {
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
                input: {
                    handle: handle() || null,
                },
            }
        );

        if (result.error) {
            addAlert(SOMETHING);
            return;
        }

        setAppData("me", result.data!.updateUser);
        setHandle(result.data!.updateUser.handle ?? "");

        setSaving(false);
    }

    return (
        <fieldset class="fieldset bg-base-200 border-base-300 w-xs border p-4">
            <legend class="fieldset-legend">Your handle</legend>

            <div class="join">
                <input
                    type="text"
                    class="input join-item validator"
                    placeholder={appData.me.handle ?? ""}
                    value={handle()}
                    minLength={3}
                    maxLength={19}
                    onInput={e => {
                        const value = e.currentTarget.value;

                        setHandle(value);
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
    );
}
