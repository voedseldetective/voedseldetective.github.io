// Pure functions that turn codes.json records into HTML strings.
// Every value that comes from data is escaped.
import { parseCode, candidateKeys } from "./codes.js";
import { t } from "./i18n.js";
import { countryName, regionName, offCountryCode } from "./regions.js";

const OFF_URL = "https://world.openfoodfacts.org/";
const EXAMPLES = ["NL Z0507 EG", "DE NI 010 EG", "MSC-C-50572"];
const SHOW_FIRST = 6;
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

// One trail node: a colored dot (decorative), a small label and its body.
function node(name, icon, label, body) {
  return `<li class="node node-${name}"><span class="dot" aria-hidden="true">${icon}</span>`
    + `<h3>${escapeHtml(label)}</h3>${body}</li>`;
}

function sourceLine(lang, evidence, url, date) {
  const asOf = date ? ` (${escapeHtml(t(lang, "as_of"))} ${escapeHtml(date)})` : "";
  return `<span class="src">${badge(lang, evidence)} ${escapeHtml(t(lang, "source"))}: ${link(url, hostOf(url))}${asOf}</span>`;
}

// The code as a stamp, then the trail; the clue node is always first.
function codeSection(lang, kind, country, region, display, moreNodes = "") {
  const clue = [t(lang, KIND_LABEL[kind] || "kind_oval"), country ? countryName(country, lang) : "", regionName(country, region, lang)]
    .filter(Boolean).map(escapeHtml).join(" · ");
  return `<p class="code">${escapeHtml(display)}</p><ol class="trail">`
    + node("clue", "🔍", t(lang, "step_clue"), `<p>${clue}</p>`) + moreNodes + "</ol>";
}

function establishmentItem(lang, e) {
  const title = e.private ? `<em>${escapeHtml(t(lang, "private_facility"))}</em>`
    : `<strong>${escapeHtml(e.name)}</strong>${e.trade ? ` <span class="trade">(${escapeHtml(e.trade)})</span>` : ""}`;
  const type = TYPE_LABEL[e.type] ? ` · ${escapeHtml(t(lang, TYPE_LABEL[e.type]))}` : "";
  return `<li>${title}<br>${escapeHtml(e.city || "")}${type}${sourceLine(lang, e.evidence, e.source_url, e.date)}</li>`;
}

function hostOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return String(url || ""); }
}

// NL products first (store brands before others), then other countries by size, unknown last.
export function orderProducts(products) {
  const nlChain = [], nlOther = [], unknown = [], byCountry = new Map();
  for (const p of products) {
    const code = offCountryCode(p.country);
    if (code === "NL") (p.chain ? nlChain : nlOther).push(p);
    else if (!code) unknown.push(p);
    else {
      if (!byCountry.has(code)) byCountry.set(code, []);
      byCountry.get(code).push(p);
    }
  }
  const others = [...byCountry.entries()]
    .sort(([a, xs], [b, ys]) => ys.length - xs.length || a.localeCompare(b))
    .flatMap(([, xs]) => xs);
  return [...nlChain, ...nlOther, ...others, ...unknown];
}

function productTag(p) {
  const code = offCountryCode(p.country);
  if (!code) return "";
  const text = p.chain ? `${code} · ${p.chain}` : code;
  return `<span class="tag${code === "NL" ? " tag-nl" : ""}">${escapeHtml(text)}</span>`;
}

function productItem(lang, p) {
  const brand = p.brand ? `<strong>${escapeHtml(p.brand)}</strong> ` : "";
  return `<li><span class="pname">${brand}${link(p.source_url, p.name || p.barcode)}</span>${productTag(p)}`
    + `${p.evidence !== "community" ? badge(lang, p.evidence) : ""}</li>`;
}

function productsSection(lang, products) {
  if (!products.length) return `<p class="muted">${escapeHtml(t(lang, "no_products"))}</p>`;
  const ordered = orderProducts(products);
  const nlCount = ordered.filter((p) => offCountryCode(p.country) === "NL").length;
  const elsewhere = ordered.length - nlCount;
  const parts = [nlCount ? `<strong>${escapeHtml(t(lang, "products_in_nl", { n: nlCount }))}</strong>`
    : escapeHtml(t(lang, "products_none_nl"))];
  if (elsewhere) parts.push(escapeHtml(t(lang, "products_elsewhere", { n: elsewhere })));
  const visible = ordered.slice(0, Math.min(SHOW_FIRST, nlCount)); // other countries only behind "show more"
  const hidden = ordered.slice(visible.length);
  const list = (xs) => `<ul class="products">${xs.map((p) => productItem(lang, p)).join("")}</ul>`;
  let html = `<p class="products-summary">${parts.join(" · ")}</p>`;
  if (visible.length) html += list(visible);
  if (hidden.length) {
    html += `<details><summary>${escapeHtml(t(lang, "show_more", { n: hidden.length }))}</summary>${list(hidden)}</details>`;
  }
  return html + `<p class="src">${escapeHtml(t(lang, "products_source"))} ${badge(lang, "community")}</p>`;
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
    let nodes = "";
    if (record.establishments.length) {
      nodes += node("facility", "🏭", t(lang, "step_facility"),
        `<ul class="est">${record.establishments.map((e) => establishmentItem(lang, e)).join("")}</ul>`);
    }
    if (record.group) {
      const g = record.group;
      nodes += node("group", "🏢", t(lang, "step_group"),
        `<p><strong>${escapeHtml(g.group)}</strong>${sourceLine(lang, g.evidence, g.source_url, g.date)}</p>`);
    }
    nodes += node("products", "🛒", t(lang, "step_products"), productsSection(lang, record.products));
    html += `<article class="dossier" data-key="${escapeHtml(key)}">`
      + codeSection(lang, record.kind, record.country, record.region, display, nodes)
      + disclaimer(lang, record.kind) + "</article>";
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
