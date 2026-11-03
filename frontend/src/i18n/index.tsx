import { createEffect, createResource, createSignal, onCleanup } from "solid-js";
import * as i18n from "@solid-primitives/i18n";
import { dict as base } from "./debug";
import { useUserAppData } from "../contexts/clientAppDataContext";

const loaders = {
    debug: () => import("./debug").then(m => m.dict),
    eng: () => import("./eng").then(m => m.dict),
} satisfies Record<string, () => Promise<typeof base>>;

export type Locale = keyof typeof loaders;
export const locales = Object.keys(loaders) as Locale[];

export const DEFAULT_LOCALE: Locale = "eng";
const LOCALE_KEY = "locale";

const isLocale = (value: unknown): value is Locale =>
    typeof value === "string" && Object.hasOwn(loaders, value);

const [locale, setLocaleSignal] = createSignal<Locale>(DEFAULT_LOCALE);

const [dict] = createResource(locale, async (l: Locale) => i18n.flatten(await loaders[l]()), {
    initialValue: i18n.flatten(base),
});

const t = i18n.translator(dict, i18n.resolveTemplate);

const applyLocale = (l: Locale) => {
    setLocaleSignal(l);
    document.documentElement.lang = l;
};

export function useLocaleSync() {
    const user = useUserAppData();

    createEffect(() => {
        const stored = user.get<string>(LOCALE_KEY);
        applyLocale(isLocale(stored) ? stored : DEFAULT_LOCALE);
    });

    onCleanup(() => applyLocale(DEFAULT_LOCALE));
}

export function useSetLocale() {
    const user = useUserAppData();
    return (l: Locale) => user.set(LOCALE_KEY, l);
}

export { locale, t };
