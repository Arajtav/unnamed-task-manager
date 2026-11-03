import { For } from "solid-js";
import { Locale, locale, locales, t, useSetLocale } from "../i18n";

export default function LanguagePicker() {
    const setLocale = useSetLocale();

    return (
        <label class="form-control w-full max-w-xs">
            <span class="label-text mb-1">{t("settings.language.label")}</span>
            <select
                class="select select-bordered"
                value={locale()}
                onChange={e => setLocale(e.currentTarget.value as Locale)}
            >
                <For each={locales}>{l => <option value={l}>{l}</option>}</For>
            </select>
        </label>
    );
}
