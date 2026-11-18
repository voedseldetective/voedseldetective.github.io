import { test } from "node:test";
import assert from "node:assert/strict";
import { lookup, renderDossier, renderNotFound, renderEggShell, renderHome, escapeHtml } from "../../site/js/render.js";
import { parseCode } from "../../site/js/codes.js";
import { STRINGS } from "../../site/js/i18n.js";

const est = (name, extra = {}) => ({ name, trade: null, city: "Reeuwijk", private: false, type: "dairy",
  evidence: "official", source_id: "cokz_zuivel", source_url: "https://cokz.nl/x", date: "2026-11-04", ...extra });
const prod = (name, brand, chain) => ({ barcode: "1", name, brand, chain, country: "netherlands",
  evidence: "community", source_url: "https://world.openfoodfacts.org/product/1" });

const data = {
  generated: "2026-11-18", sources: {},
  codes: {
    "NL-Z507": { kind: "oval", country: "NL", region: null, group: null,
      establishments: [est("Th. Vergeer en Zonen B.V.", { trade: "Vergeer Holland" })],
      products: [prod("Jong 30+", "Milbona", "Lidl"), prod("Jong belegen", "Plus", "Plus")] },
    "NL-1005": { kind: "oval", country: "NL", region: null, group: null,
      establishments: [est("Slachterij X B.V.", { type: "meat" })], products: [] },
    "EGGPACK-NL1005": { kind: "egg_pack", country: "NL", region: null, group: null,
      establishments: [est(null, { private: true, type: "egg_pack", city: "Rhenen" })], products: [] },
    "MSC-C-50572": { kind: "msc", country: null, region: null, group: null,
      establishments: [est("FishPartners B.V.", { type: "fish", city: "Spakenburg" })],
      products: [prod("<img src=x onerror=alert(1)>", "Jumbo", "Jumbo")] },
  },
  cases: [],
};

test("dossier for a dairy code", () => {
  const { parsed, matches } = lookup(data, "nl z0507 eg");
  assert.equal(matches.length, 1);
  const html = renderDossier("tr", parsed, matches, data);
  for (const s of ["Th. Vergeer en Zonen B.V.", "Milbona", "Plus", STRINGS.tr.disclaimer, "Lidl"])
    assert.ok(html.includes(s), s);
});

test("ambiguous NL code shows both matches", () => {
  const { parsed, matches } = lookup(data, "NL 1005");
  assert.deepEqual(matches.map((m) => m.key), ["NL-1005", "EGGPACK-NL1005"]);
  const html = renderDossier("en", parsed, matches, data);
  assert.ok(html.includes("Slachterij X B.V."));
  assert.ok(html.includes(STRINGS.en.ambiguous_note));
});

test("private facility shows the fixed text, not a name", () => {
  const { parsed, matches } = lookup(data, "NL 1005");
  const html = renderDossier("nl", parsed, [matches[1]], data);
  assert.ok(html.includes(STRINGS.nl.private_facility));
  assert.ok(html.includes("Rhenen"));
  assert.ok(!html.includes("null"));
});

test("MSC sub-site falls back to base code", () => {
  const { parsed, matches } = lookup(data, "MSC-C-50572-3");
  assert.equal(matches.length, 1);
  assert.equal(matches[0].key, "MSC-C-50572");
  const html = renderDossier("en", parsed, matches, data);
  assert.ok(html.includes(STRINGS.en.msc_note));
  assert.ok(html.includes("FishPartners B.V."));
});

test("valid code without data still explains it", () => {
  const html = renderNotFound("en", parseCode("DE NI 010 EG"));
  assert.ok(html.includes("Lower Saxony"));
  assert.ok(html.includes("Germany"));
  assert.ok(html.includes("https://world.openfoodfacts.org/"));
  assert.ok(html.includes(STRINGS.en.disclaimer));
});

test("unparseable input shows where-to-find help", () => {
  assert.ok(renderNotFound("nl", null).includes(STRINGS.nl.where_code));
});

test("data is escaped", () => {
  const { parsed, matches } = lookup(data, "MSC-C-50572");
  const html = renderDossier("en", parsed, matches, data);
  assert.ok(!html.includes("<img"));
  assert.ok(html.includes("&lt;img"));
  assert.equal(escapeHtml(`<a href="x">'&`), "&lt;a href=&quot;x&quot;&gt;&#39;&amp;");
});

test("egg shell stamp explains system without a farm", () => {
  const html = renderEggShell("nl", parseCode("0-NL-4195701"));
  assert.ok(html.includes("biologisch"));
  assert.ok(html.includes(STRINGS.nl.egg_shell_none));
  assert.ok(html.includes("Nederland"));
});

test("home lists cases in the chosen language", () => {
  const html = renderHome("en", [{ id: "a", key: "NL-Z507", title: { nl: "Kaas", en: "Cheese", tr: "Peynir" },
    text: { nl: "", en: "Story", tr: "" } }]);
  assert.ok(html.includes("Cheese"));
  assert.ok(html.includes("#/en/kod/NL-Z507"));
});

test("group step shows its source date", () => {
  const d = { codes: { "DE-NI10": { kind: "oval", country: "DE", region: "NI", products: [],
    establishments: [est("DMK Deutsches Milchkontor GmbH", { city: "Zeven" })],
    group: { group: "DMK Group", evidence: "company", source_url: "https://www.dmk.de/", date: "2026-11-17" } } } };
  const { parsed, matches } = lookup(d, "DE NI 010 EG");
  const html = renderDossier("en", parsed, matches, d);
  assert.ok(html.includes("DMK Group"));
  assert.ok(html.includes("2026-11-17"));
});

// ---- design pass ----
const many = (n) => Array.from({ length: n }, (_, i) => prod(`P${i}`, `Brand${i}`, null));

test("home offers clickable example codes", () => {
  const html = renderHome("nl", []);
  assert.ok(html.includes(STRINGS.nl.try_examples));
  assert.ok(html.includes('href="#/nl/kod/NL%20Z0507%20EG"'));
  assert.ok(html.includes("MSC-C-50572"));
});

test("long other-brands list collapses after 5, chains stay open", () => {
  const d = { codes: { "NL-Z507": { ...data.codes["NL-Z507"], products: [prod("L", "Milbona", "Lidl"), ...many(12)] } } };
  const { parsed, matches } = lookup(d, "NL Z0507 EG");
  const html = renderDossier("tr", parsed, matches, d);
  assert.ok(html.includes("<details"));
  assert.ok(html.includes("Tümünü göster (12)"));
  assert.ok(html.indexOf("P4") < html.indexOf("<details"));
  assert.ok(html.indexOf("P5") > html.indexOf("<details"));
  assert.ok(html.indexOf("Milbona") < html.indexOf("<details"));
});

test("community badge shown once per product section", () => {
  const { parsed, matches } = lookup(data, "NL Z0507 EG");
  const html = renderDossier("en", parsed, matches, data);
  assert.equal(html.split(STRINGS.en.badge_community).length - 1, 1);
  assert.ok(html.includes("Open Food Facts"));
});

test("product country is translated and unknown ones hidden", () => {
  const d = { codes: { "NL-Z507": { ...data.codes["NL-Z507"],
    products: [{ ...prod("A", "Milbona", "Lidl"), country: "germany" }, { ...prod("B", "X", null), country: "afghanistan" }] } } };
  const { parsed, matches } = lookup(d, "NL Z0507 EG");
  const html = renderDossier("tr", parsed, matches, d);
  assert.ok(html.includes("(Almanya)"));
  assert.ok(!html.includes("germany"));
  assert.ok(!html.includes("afghanistan"));
});

test("step numbers stay sequential without an establishment", () => {
  const d = { codes: { "NL-Z999": { kind: "oval", country: "NL", region: null, group: null, establishments: [],
    products: [prod("A", "Milbona", "Lidl")] } } };
  const { parsed, matches } = lookup(d, "NL Z0999 EG");
  const html = renderDossier("nl", parsed, matches, d);
  assert.ok(html.includes('<span class="num">2</span>'));
  assert.ok(!html.includes('<span class="num">3</span>'));
});

test("ambiguous dossiers label both codes the same way", () => {
  const { parsed, matches } = lookup(data, "NL 1005");
  const html = renderDossier("nl", parsed, matches, data);
  assert.equal(html.split('<p class="code">NL 1005</p>').length - 1, 2);
});

test("about page explains every badge and keeps sources safe", async () => {
  const { renderAbout } = await import("../../site/js/render.js");
  const html = renderAbout("tr", { cokz_zuivel: { url: "https://cokz.nl/x", date: "2026-11-04" }, bad: { url: "javascript:alert(1)" } }, "info@example.org");
  for (const k of ["badge_official_desc", "badge_company_desc", "badge_community_desc", "badge_verified_desc", "badges_title", "disclaimer"])
    assert.ok(html.includes(STRINGS.tr[k]), k);
  assert.ok(html.includes("2026-11-04"));
  assert.ok(!html.includes("javascript:"));
  assert.ok(html.includes("info@example.org"));
  assert.ok(html.includes("COKZ – erkende zuivelbedrijven"));
  assert.ok(!html.includes(">cokz_zuivel<"));
});
