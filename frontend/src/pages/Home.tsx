import { Title } from "@solidjs/meta";
import TimeGraph from "../components/TimeGraph";
import { t } from "../i18n";

export default function Home() {
    return (
        <div class="w-full h-full flex items-center justify-center">
            <Title>{t("title")}</Title>
            <TimeGraph />
        </div>
    );
}
