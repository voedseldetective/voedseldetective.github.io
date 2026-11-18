// Pure functions that turn codes.json records into HTML strings.
// Every value that comes from data is escaped.
import { parseCode, candidateKeys } from "./codes.js";
import { t } from "./i18n.js";
import { countryName, regionName, offCountryName } from "./regions.js";

const OFF_URL = "https://world.openfoodfacts.org/";
const EXAMPLES = ["NL Z0507 EG", "DE NI 010 EG", "MSC-C-50572"];
const SHOW_FIRST = 5;
// Register names are proper names and stay in Dutch.
const SOURCE_NAMES = {
  cokz_zuivel: "COKZ – erkende zuivelbedrijven",
  cokz_boerderij: "COKZ – erkende boerderij-zuivelbedrijven",
  cokz_pak: "COKZ – erkende pakstations",
  off: "Open Food Facts",
};
const KIND_LABEL = { oval: "kind_oval", msc: "kind_msc", egg_pack: "kind_egg_pack", egg_shell: "kind_egg_shell" };
const TYPE_LABEL = { dairy: "type_dairy", meat: "type_meat", fish: "type_fish", egg_pack: "type_egg_pack" };

export function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

const safeUrl = (u) => (/^https?:\/\//i.test(u || "") ? escapeHtml(u) : "#");
const link = (url, text) => `<a href="${safeUrl(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(text)}</a>`;

export function lookup(data, raw) {
  const codes = data?.codes || {};
  const direct = String(raw || "").trim().toUpperCase();
  if (codes[direct]) {
    return { parsed: parseCode(direct) || { kind: codes[direct].kind, key: direct, display: direct, country: codes[direct].country, region: null, extra: {} },
      matches: [{ key: direct, record: codes[direct] }] };
  }
  const parsed = parseCode(raw);
  let keys = candidateKeys(raw).filter((k) => codes[k]);
  if (parsed?.kind === "msc") keys = keys.slice(0, 1); // sub-site first, else the base certificate
  return { parsed, matches: keys.map((key) => ({ key, record: codes[key] })) };
}

function badge(lang, evidence) {
  return `<span class="badge badge-${escapeHtml(evidence)}">${escapeHtml(t(lang, `badge_${evidence}`))}</span>`;
}

function codeSection(lang, kind, country, region, display) {
  const reg = regionName(country, region, lang);
  return `<section class="step"><h3><span class="num">1</span> ${escapeHtml(t(lang, "step_code"))}</h3>
<p class="code">${escapeHtml(display)}</p>
<p>${escapeHtml(t(lang, KIND_LABEL[kind] || "kind_oval"))}</p>
${country ? `<p>${escapeHtml(t(lang, "country"))}: ${escapeHtml(countryName(country, lang))}</p>` : ""}
${reg ? `<p>${escapeHtml(t(lang, "region"))}: ${escapeHtml(reg)}</p>` : ""}</section>`;
}

function establishmentItem(lang, e) {
  const title = e.private ? `<em>${escapeHtml(t(lang, "private_facility"))}</em>`
    : `<strong>${escapeHtml(e.name)}</strong>${e.trade ? ` <span class="trade">(${escapeHtml(e.trade)})</span>` : ""}`;
  const type = TYPE_LABEL[e.type] ? ` · ${escapeHtml(t(lang, TYPE_LABEL[e.type]))}` : "";
  const date = e.date ? ` (${escapeHtml(t(lang, "as_of"))} ${escapeHtml(e.date)})` : "";
  return `<li>${title}<br>${escapeHtml(e.city || "")}${type}<br>${badge(lang, e.evidence)}
<span class="src">${escapeHtml(t(lang, "source"))}: ${link(e.source_url, hostOf(e.source_url))}${date}</span></li>`;
}

function hostOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return String(url || ""); }
}

function productItem(lang, p) {
  const country = offCountryName(p.country, lang);
  return `<li>${link(p.source_url, p.name || p.barcode)} — <strong>${escapeHtml(p.brand || "")}</strong>`
    + `${country ? ` <span class="muted">(${escapeHtml(country)})</span>` : ""}`
    + `${p.evidence !== "community" ? ` ${badge(lang, p.evidence)}` : ""}</li>`;
}

function productsSection(lang, products) {
  if (!products.length) return `<p class="muted">${escapeHtml(t(lang, "no_products"))}</p>`;
  const groups = new Map();
  for (const p of products) {
    const g = p.chain || "";
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g).push(p);
  }
  let html = `<p class="src">${escapeHtml(t(lang, "products_source"))} ${badge(lang, "community")}</p>`;
  for (const [chain, items] of groups) {
    const list = (xs) => `<ul class="products">${xs.map((p) => productItem(lang, p)).join("")}</ul>`;
    html += `<h4>${escapeHtml(chain || t(lang, "other_brands"))}</h4>`;
    if (chain || items.length <= SHOW_FIRST + 1) {
      html += list(items); // store brands always stay open
    } else {
      html += list(items.slice(0, SHOW_FIRST))
        + `<details><summary>${escapeHtml(t(lang, "show_all", { n: items.length }))}</summary>`
        + list(items.slice(SHOW_FIRST)) + "</details>";
    }
  }
  return html;
}

function disclaimer(lang, kind) {
  return `<p class="disclaimer">${escapeHtml(t(lang, "disclaimer"))}</p>`
    + (kind === "msc" ? `<p class="disclaimer">${escapeHtml(t(lang, "msc_note"))}</p>` : "");
}

export function renderDossier(lang, parsed, matches, data) {
  let html = "";
  if (matches.length > 1) html += `<p class="note">${escapeHtml(t(lang, "ambiguous_note"))}</p>`;
  for (const { key, record } of matches) {
    const display = matches.length > 1 || record.kind === "egg_pack"
      ? key.replace(/^EGGPACK-/, "").replace(/^([A-Z]{2})-?/, "$1 ")
      : parsed?.display || key;
    let step = 1;
    html += `<article class="dossier" data-key="${escapeHtml(key)}">`;
    html += codeSection(lang, record.kind, record.country, record.region, display);
    if (record.establishments.length) {
      html += `<section class="step"><h3><span class="num">${++step}</span> ${escapeHtml(t(lang, "step_facility"))}</h3><ul class="est">`
        + record.establishments.map((e) => establishmentItem(lang, e)).join("") + "</ul></section>";
    }
    if (record.group) {
      html += `<section class="step"><h3><span class="num">${++step}</span> ${escapeHtml(t(lang, "step_group"))}</h3>`
        + `<p><strong>${escapeHtml(record.group.group)}</strong> ${badge(lang, record.group.evidence)} `
        + `<span class="src">${escapeHtml(t(lang, "source"))}: ${link(record.group.source_url, hostOf(record.group.source_url))}`
        + `${record.group.date ? ` (${escapeHtml(t(lang, "as_of"))} ${escapeHtml(record.group.date)})` : ""}</span></p></section>`;
    }
    html += `<section class="step"><h3><span class="num">${++step}</span> ${escapeHtml(t(lang, "step_products"))}</h3>`
      + productsSection(lang, record.products) + "</section>";
    html += disclaimer(lang, record.kind) + "</article>";
  }
  html += `<p>${link(OFF_URL, t(lang, "off_add"))}</p>`;
  return html;
}

export function renderNotFound(lang, parsed) {
  if (!parsed) {
    return `<section class="help"><p>${escapeHtml(t(lang, "where_code"))}</p></section>`;
  }
  return `<article class="dossier">${codeSection(lang, parsed.kind, parsed.country, parsed.region, parsed.display)}
<p>${escapeHtml(t(lang, "not_found", { code: parsed.display }))}</p>
<p>${link(OFF_URL, t(lang, "off_add"))}</p>${disclaimer(lang, parsed.kind)}</article>`;
}

export function renderEggShell(lang, parsed) {
  const system = t(lang, `egg_${parsed.extra.system}`);
  return `<article class="dossier">${codeSection(lang, "egg_shell", parsed.country, null, parsed.display)}
<p>${escapeHtml(t(lang, "egg_shell_info", { system, country: countryName(parsed.country, lang) }))}</p>
<p>${escapeHtml(t(lang, "egg_shell_none"))}</p></article>`;
}

export function renderHome(lang, cases) {
  const examples = EXAMPLES.map((c) => `<a class="example" href="#/${lang}/kod/${encodeURIComponent(c)}">${escapeHtml(c)}</a>`).join("");
  let html = `<section class="examples"><p>${escapeHtml(t(lang, "try_examples"))}</p><div class="chips">${examples}</div></section>`
    + `<section class="help"><p>${escapeHtml(t(lang, "where_code"))}</p></section>`;
  if (cases?.length) {
    html += `<section class="cases"><h2>${escapeHtml(t(lang, "cases_title"))}</h2><ul>`;
    for (const c of cases) {
      html += `<li><a class="case" data-case="${escapeHtml(c.id)}" href="#/${lang}/kod/${encodeURIComponent(c.key)}">`
        + `<strong>${escapeHtml(c.title?.[lang] || c.title?.nl)}</strong></a>`
        + `<p>${escapeHtml(c.text?.[lang] || "")}</p></li>`;
    }
    html += "</ul></section>";
  }
  return html;
}

export function renderAbout(lang, sources, email) {
  const src = Object.entries(sources || {})
    .filter(([, s]) => s.url)
    .map(([id, s]) => `<li>${link(s.url, SOURCE_NAMES[id] || id)}${s.date ? ` (${escapeHtml(t(lang, "as_of"))} ${escapeHtml(s.date)})` : ""}`
      + `${s.license ? ` – ${escapeHtml(s.license)}` : ""}</li>`)
    .join("");
  const badges = ["official", "company", "community", "verified"]
    .map((b) => `<li>${badge(lang, b)} ${escapeHtml(t(lang, `badge_${b}_desc`))}</li>`).join("");
  return `<article class="dossier"><h2>${escapeHtml(t(lang, "about_title"))}</h2>
<p>${escapeHtml(t(lang, "about_body"))}</p><p class="disclaimer">${escapeHtml(t(lang, "disclaimer"))}</p>
<h3>${escapeHtml(t(lang, "badges_title"))}</h3><ul class="badges">${badges}</ul>
<h3>${escapeHtml(t(lang, "sources_title"))}</h3><ul>${src}</ul><p>${escapeHtml(t(lang, "license_off"))}</p>
<p>${escapeHtml(t(lang, "takedown", { email }))}</p></article>`;
}
