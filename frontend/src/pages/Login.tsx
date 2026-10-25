import { createSignal, onMount } from "solid-js";
import { client, getPasskeyCredential } from "../auth";
import { A, useNavigate, useSearchParams } from "@solidjs/router";
import { useAlert } from "../contexts/alertContext";
import { Title } from "@solidjs/meta";
import {
    CircleXIcon,
    GlobeOffIcon,
    KeyRoundIcon,
    SearchXIcon,
    ServerCrashIcon,
    UserRoundXIcon,
} from "lucide-solid";
import ActiveButton from "../newComponents/ActiveButton";

const SERVER_WRONG = {
    type: "error",
    title: "Server error",
    content: "Server sent invalid response.",
    icon: ServerCrashIcon,
} as const;

const NETWORK = {
    type: "error",
    title: "Network error",
    content: "Check your internet connection and try again.",
    icon: GlobeOffIcon,
} as const;

export default function Login() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

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

    async function login() {
        isLoadingTimeout = setTimeout(() => {
            setIsLoading(true);
        }, 50);

        const cr = await client.loginStart();
        if (cr.error) {
            if (cr.error.type == "network") {
                setNea(addSingleAlert(nea(), NETWORK, 60));
            } else {
                addAlert(SERVER_WRONG);
            }
            finishLoading();
            return;
        }

        let options;
        try {
            options = PublicKeyCredential.parseRequestOptionsFromJSON(cr.data);
        } catch (error) {
            console.error(error);
            addAlert(SERVER_WRONG);
            finishLoading();
            return;
        }

        const credential = await getPasskeyCredential(options);
        if (credential.error) {
            addAlert({
                type: "error",
                title:
                    credential.error.type == "not_allowed"
                        ? "Unable to get any passkeys"
                        : "Something went wrong",
                content: "Check your authenticator and try again.",
                icon: CircleXIcon,
            }, 30);
            finishLoading();
            return;
        }

        if (!credential.data) {
            addAlert(
                {
                    type: "normal",
                    title: "No passkeys",
                    content: "No passkeys found.",
                    icon: SearchXIcon,
                },
                30
            );
            finishLoading();
            return;
        }

        let lf = await client.loginFinish(credential.data.toJSON());
        if (lf.error) {
            if (lf.error.type == "network") {
                setNea(addSingleAlert(nea(), NETWORK, 60));
            } else if (lf.error.type == "http" && lf.error.status == 401) {
                addAlert({
                    type: "warning",
                    title: "Account not found",
                    content: "This account does not exist or is disabled.",
                    icon: UserRoundXIcon,
                }, 30);
            } else {
                addAlert(SERVER_WRONG);
            }
            finishLoading();
            return;
        }

        handleRedirect();
        finishLoading();
    }

    onMount(async () => {
        const auto = searchParams.auto == "1";

        if (!auto) return;

        setSearchParams({ auto: undefined }, { replace: true });

        await login();
    });

    return (
        <div class="h-full flex flex-col bg-base-100">
            <Title>Login</Title>
            <div class="flex-1"></div>
            <div class="flex items-center justify-center">
                <ActiveButton
                    text="Login with a passkey"
                    icon={KeyRoundIcon}
                    isLoading={isLoading()}
                    onClick={login}
                />
            </div>
            <div class="flex-1 flex items-end justify-center">
                <div class="mb-4 opacity-60">
                    or{" "}
                    <A
                        href="/join"
                        class="cursor-pointer hover:underline focus:underline drop-shadow-sm"
                    >
                        Join
                    </A>
                </div>
            </div>
        </div>
    );
}
