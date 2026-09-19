type TranslationSchema = typeof base;

type Translations = {
    [K in keyof TranslationSchema]: TranslationSchema[K];
};

const translations = {
    en: base,
} satisfies Record<string, TranslationSchema>;

type Locale = keyof typeof translations;

// TODO: this doesn't accept args actually.
function t(locale: Locale, key: keyof TranslationSchema) {
    return translations[locale][key]();
}
