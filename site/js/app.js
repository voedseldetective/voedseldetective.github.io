// App shell: hash routing, language, search, share and cookieless analytics.
import { parseCode } from "./codes.js";
import { t, pickLang, LANGS } from "./i18n.js";
import { parseHash as parseRouteHash } from "./route.js";
import { lookup, renderDossier, renderNotFound, renderEggShell, renderHome, renderAbout, escapeHtml } from "./render.js";

const CONTACT_EMAIL = "REPLACE_CONTACT_EMAIL";
const $ = (id) => document.getElementById(id);
let data = null;
let lang = "nl";

function track(event) {
  try { window.goatcounter?.count?.({ path: event, event: true }); } catch { /* analytics never breaks the page */ }
}

function storedLang() {
  try { return localStorage.getItem("lang"); } catch { return null; }
}
function storeLang(l) {
  try { localStorage.setItem("lang", l); } catch { /* private mode */ }
}

const parseHash = () => parseRouteHash(location.hash);

function setChrome() {
  document.documentElement.lang = lang;
  $("tagline").textContent = t(lang, "tagline");
  $("q").placeholder = t(lang, "search_placeholder");
  $("q-label").textContent = t(lang, "search_placeholder");
  $("search-button").textContent = t(lang, "search_button");
  $("about-link").textContent = t(lang, "about_title");
  $("about-link").href = `#/${lang}/over`;
  $("license").textContent = t(lang, "license_off");
  document.querySelector(".wordmark").href = `#/${lang}`;
  const { page, arg } = parseHash();
  for (const a of document.querySelectorAll(".langs a")) {
    const l = a.dataset.lang;
    a.href = page === "kod" && arg ? `#/${l}/kod/${encodeURIComponent(arg)}` : page === "over" ? `#/${l}/over` : `#/${l}`;
    a.setAttribute("aria-current", String(l === lang));
  }
}

function actions(shareable) {
  const mail = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("Voedseldetective " + (shareable || ""))}`;
  return `<div class="actions">${shareable ? `<button type="button" id="share">${escapeHtml(t(lang, "share"))}</button>` : ""}
<a href="${escapeHtml(mail)}">${escapeHtml(t(lang, "report_error"))}</a></div>`;
}

function renderCode(raw) {
  $("q").value = raw;
  const parsed = parseCode(raw);
  let html;
  if (parsed?.kind === "egg_shell") {
    html = renderEggShell(lang, parsed);
    track("found");
  } else {
    const res = lookup(data, raw);
    if (res.matches.length) {
      html = renderDossier(lang, res.parsed, res.matches, data);
      track("found");
    } else {
      html = renderNotFound(lang, parsed);
      track("notfound");
    }
  }
  $("view").innerHTML = html + actions(raw);
  document.title = `${raw} – Voedseldetective`;
}

function renderAboutPage() {
  $("view").innerHTML = renderAbout(lang, data?.sources, CONTACT_EMAIL);
  document.title = `${t(lang, "about_title")} – Voedseldetective`;
}

function route() {
  const h = parseHash();
  if (!h.lang) {
    lang = storedLang() || pickLang(navigator.languages || [navigator.language]);
    location.replace(`#/${lang}${h.page !== "home" ? "/" + h.page + (h.arg ? "/" + encodeURIComponent(h.arg) : "") : ""}`);
    return;
  }
  lang = h.lang;
  storeLang(lang);
  setChrome();
  if (h.page === "kod" && h.arg) renderCode(h.arg);
  else if (h.page === "over") renderAboutPage();
  else {
    $("q").value = "";
    $("view").innerHTML = renderHome(lang, data?.cases || []);
    document.title = "Voedseldetective";
  }
}

function onSearch(e) {
  e.preventDefault();
  const raw = $("q").value.trim();
  if (!raw) return;
  track("search");
  const p = parseCode(raw);
  const value = p ? p.display : raw;
  const target = `#/${lang}/kod/${encodeURIComponent(value)}`;
  if (location.hash === target) route();
  else location.hash = target;
}

async function share() {
  const url = location.href;
  track("share");
  try {
    if (navigator.share) await navigator.share({ title: "Voedseldetective", url });
    else {
      await navigator.clipboard.writeText(url);
      $("share").textContent = t(lang, "copied");
    }
  } catch { /* user cancelled */ }
}

document.addEventListener("click", (e) => {
  const a = e.target.closest("a, button");
  if (!a) return;
  if (a.id === "share") share();
  else if (a.dataset.case) track("case_click");
  else if (a.dataset.lang) track(`lang_${a.dataset.lang}`);
  else if (a.href?.startsWith("https://world.openfoodfacts.org/") && !a.href.includes("/product/")) track("off_add");
});

async function start() {
  $("search").addEventListener("submit", onSearch);
  window.addEventListener("hashchange", route);
  try {
    const res = await fetch("data/codes.json");
    data = await res.json();
  } catch {
    data = { codes: {}, cases: [], sources: {} };
  }
  track("visit");
  route();
}

start();
