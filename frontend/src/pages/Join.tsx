import { createSignal } from "solid-js";
import { client, createPasskey } from "../auth";
import { useNavigate, useSearchParams } from "@solidjs/router";
import { useAlert } from "../contexts/alertContext";
import { Title } from "@solidjs/meta";
import { masked } from "solid-imask";
import {
    AUTHENTICATOR_WRONG,
    INVITE_EXPIRED,
    NETWORK,
    SERVER_WRONG,
    PASSKEY_CREATION_FAILED,
} from "../alerts";
import { PreservingA } from "../newComponents/PreservingA";
import ActiveButton from "../newComponents/ActiveButton";
import { KeyRoundIcon } from "lucide-solid";

// Actually it's an used import.
void masked;

const INVITE_REGEX = /^[A-Z]{4}(-[A-Z]{4}){2}$/;
const NAME_MAX_LENGTH = 64;

export default function Join() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const handleRedirect = () => {
        // Ignore multiple.
        const backParam = typeof searchParams.back == "string" ? searchParams.back : "/";
        const back = decodeURIComponent(backParam);

        navigate(back, { replace: true });
    };

    const [nea, setNea] = createSignal<symbol | undefined>(undefined);
    const { addAlert, addSingleAlert } = useAlert();

    let [isLoading, setIsLoading] = createSignal(false);
    let isLoadingTimeout: number | undefined;

    const finishLoading = () => {
        clearTimeout(isLoadingTimeout);
        setIsLoading(false);
    };

    const [invite, setInvite] = createSignal("");
    const [name, setName] = createSignal("");

    const isInviteValid = () => INVITE_REGEX.test(invite());
    const isNameValid = () => {
        const trimmed = name().trim();
        return trimmed.length > 0 && trimmed.length <= NAME_MAX_LENGTH;
    };
    const canSubmit = () => isInviteValid() && isNameValid();

    async function register() {
        isLoadingTimeout = setTimeout(() => {
            setIsLoading(true);
        }, 50);

        const rr = await client.registerStart(invite(), name().trim());
        if (rr.error) {
            if (rr.error.type == "network") {
                setNea(addSingleAlert(nea(), NETWORK, 60));
            } else {
                addAlert(SERVER_WRONG);
            }
            finishLoading();
            return;
        }

        let options;
        try {
            options = PublicKeyCredential.parseCreationOptionsFromJSON(rr.data);
        } catch (error) {
            console.error(error);
            addAlert(SERVER_WRONG);
            finishLoading();
            return;
        }

        const credential = await createPasskey(options);
        if (credential.error) {
            addAlert(
                credential.error.type == "not_allowed"
                    ? PASSKEY_CREATION_FAILED
                    : AUTHENTICATOR_WRONG,
                30
            );
            finishLoading();
            return;
        }

        if (!credential.data) {
            addAlert(PASSKEY_CREATION_FAILED, 30);
            finishLoading();
            return;
        }

        const res = await client.registerFinish(credential.data.toJSON());
        if (res.error) {
            if (res.error.type == "network") {
                setNea(addSingleAlert(nea(), NETWORK, 60));
            } else if (res.error.type == "http" && res.error.status == 401) {
                addAlert(INVITE_EXPIRED);
            } else {
                addAlert(SERVER_WRONG);
            }

            finishLoading();
            return;
        }

        handleRedirect();
        finishLoading();
    }

    return (
        <div class="h-full flex flex-col bg-base-100">
            <Title>Join</Title>
            <div class="flex-1"></div>
            <div class="flex items-center justify-center">
                <fieldset
                    class="flex flex-col border p-8 rounded-2xl border-base-300 drop-shadow-sm"
                    disabled={isLoading()}
                >
                    <div class="flex flex-col">
                        <label class="my-2">Invite code</label>
                        <input
                            class="font-mono uppercase bg-base-200 border-base-300 text-base-content px-6 py-4 rounded-xl border drop-shadow-sm user-invalid:ring-1 user-invalid:ring-inset user-invalid:ring-error disabled:cursor-not-allowed"
                            type="text"
                            placeholder="XXXX-XXXX-XXXX"
                            pattern="[A-Za-z]{4}(-[A-Za-z]{4}){2}"
                            use:masked={{
                                mask: "aaaa-aaaa-aaaa",
                                onAccept: (_, mask) => setInvite(mask.value.toUpperCase()),
                            }}
                            required
                        />
                    </div>

                    <div class="flex flex-col mt-3 mb-6">
                        <label class="my-2">Display name</label>
                        <input
                            class="bg-base-200 border-base-300 text-base-content px-6 py-4 rounded-xl border drop-shadow-sm user-invalid:ring-1 user-invalid:ring-inset user-invalid:ring-error disabled:cursor-not-allowed"
                            type="text"
                            placeholder="Me"
                            maxLength={NAME_MAX_LENGTH}
                            value={name()}
                            onInput={e => setName(e.currentTarget.value)}
                            required
                        />
                    </div>

                    <ActiveButton
                        text="Create a passkey"
                        icon={KeyRoundIcon}
                        isLoading={isLoading()}
                        disabled={!canSubmit()}
                        onClick={register}
                    />
                </fieldset>
            </div>
            <div class="flex-1 flex items-end justify-center">
                <div class="mb-4 opacity-60">
                    or{" "}
                    <PreservingA
                        href="/login"
                        class="cursor-pointer hover:underline focus:underline drop-shadow-sm"
                    >
                        Login
                    </PreservingA>
                </div>
            </div>
        </div>
    );
}
