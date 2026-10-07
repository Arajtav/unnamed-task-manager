import { createMemo, createSignal } from "solid-js";
import { useAlert } from "../contexts/alertContext";
import { Me, useAppData } from "../contexts/appDataContext";
import { gqlClient } from "../graphql";
import { gql } from "@urql/core";

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

        try {
            const result = await gqlClient.mutation<{
                updateUser: Me;
            }>(
                gql`
                    mutation updateUser($userId: UUID!, $handle: String!) {
                        updateUser(userId: $userId, handle: $handle) {
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
                    handle: handle() || null,
                }
            );

            if (result.error) {
                throw result.error;
            }

            setAppData("me", result.data!.updateUser);
            setHandle(result.data!.updateUser.handle ?? "");
        } catch (err) {
            addAlert(err instanceof Error ? err.message : "Failed to set handle.", "error");
        }

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
