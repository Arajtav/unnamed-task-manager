import YourHandle from "../components/YourHandle";
import EmailAddresses from "../components/EmailAddresses";
import { Title } from "@solidjs/meta";
import { t } from "../i18n";
import LanguagePicker from "../components/LanguagePicker";

export default function Settings() {
    return (
        <>
            <Title>{t("settings.title")}</Title>
            <div class="w-full h-full flex flex-row">
                <ul class="menu bg-base-200 w-56 h-full">
                    <li>
                        <a class="menu-active">{t("settings.tabs.account.title")}</a>
                    </li>
                </ul>

                <div class="flex-1 p-6 gap-6 flex flex-col">
                    <EmailAddresses />
                    <YourHandle />
                    <LanguagePicker />
                </div>
            </div>
        </>
    );
}
