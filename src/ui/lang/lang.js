const TRANSLATIONS = {
  en: __EN_JSON__,
  es: __ES_JSON__,
  hi: __HI_JSON__,
};

/**
 * Translates a key based on the active language in uiPrefs or appState.
 * Supports dot-notation for nested dictionaries.
 * @param {string} key - The dictionary key
 * @param {object} [data] - Optional variable replacements
 * @returns {string} Translated string
 */
function t(key, data = {}) {
  const lang = (typeof uiPrefs !== "undefined" && uiPrefs.language) || (typeof appState !== "undefined" && appState.language) || "en";
  const dict = TRANSLATIONS[lang] || TRANSLATIONS.en;

  const getNested = (obj, path) => {
    if (!obj) return undefined;
    if (obj[path] !== undefined) return obj[path]; // support flat keys first
    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
  };

  let text = getNested(dict, key) || getNested(TRANSLATIONS.en, key) || key;

  Object.keys(data).forEach((k) => {
    text = text.replace(new RegExp(`{${k}}`, "g"), data[k]);
  });

  return text;
}
