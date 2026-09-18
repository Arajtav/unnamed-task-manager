import { useMe } from "../components/Layout";

export default function Settings() {
    const me = useMe()();

    if (me == undefined) {
        return (
            <div class="toast">
                <span class="alert alert-error">Something went wrong. Please try again.</span>
            </div>
        );
    }

    return (
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
                            <span>You have no emails set.</span>
                        </div>
                    ) : (
                        <ul class="list bg-base-100 rounded-box shadow-md">
                            {me.emails.map(({ email }) => (
                                <li class="list-row">
                                    <span>{email}</span>
                                </li>
                            ))}
                        </ul>
                    )}{" "}
                </fieldset>
            </div>
        </div>
    );
}
