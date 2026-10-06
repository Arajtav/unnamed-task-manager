import YourHandle from "../components/YourHandle";
import EmailAddresses from "../components/EmailAdresses";

export default function Settings() {
    return (
        <>
            <div class="w-full h-full flex flex-row">
                <ul class="menu bg-base-200 w-56 h-full">
                    <li>
                        <a class="menu-active">Account</a>
                    </li>
                </ul>

                <div class="flex-1 p-6 gap-6 flex flex-col">
                    <EmailAddresses />

                    <YourHandle />
                </div>
            </div>
        </>
    );
}
