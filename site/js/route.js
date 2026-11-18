// Hash routes: #/{lang}, #/{lang}/kod/{CODE}, #/{lang}/over
import { LANGS } from "./i18n.js";

function safeDecode(s) {
  try { return decodeURIComponent(s); } catch { return s; } // a broken shared link must not blank the page
}

export function parseHash(hash) {
  const parts = String(hash || "").replace(/^#\/?/, "").split("/").filter(Boolean);
  const lang = LANGS.includes(parts[0]) ? parts[0] : null;
  return { lang, page: parts[1] || "home", arg: parts[2] ? safeDecode(parts.slice(2).join("/")) : null };
}
