import { test } from "node:test";
import assert from "node:assert/strict";
import { lookup, renderDossier, renderNotFound, renderEggShell, renderHome, escapeHtml, orderProducts } from "../../site/js/render.js";
import { offCountryCode } from "../../site/js/regions.js";
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

// ---- NL-first flat product list ----
const dossierFor = (products, lang = "nl") => {
  const d = { codes: { "NL-Z507": { ...data.codes["NL-Z507"], products } } };
  const { parsed, matches } = lookup(d, "NL Z0507 EG");
  return renderDossier(lang, parsed, matches, d);
};

test("offCountryCode maps slugs to ISO", () => {
  assert.equal(offCountryCode("netherlands"), "NL");
  assert.equal(offCountryCode("afghanistan"), null);
  assert.equal(offCountryCode(null), null);
});

test("orderProducts: NL chain, NL no chain, countries by count, unknown last", () => {
  const p = (n, chain, country) => ({ ...prod(n, "B", chain), country });
  const out = orderProducts([p("u", null, "mars"), p("fr1", null, "france"), p("de1", "Lidl", "germany"),
    p("nl-x", null, "netherlands"), p("fr2", "Lidl", "france"), p("nl-l", "Lidl", "netherlands")]);
  assert.deepEqual(out.map((x) => x.name), ["nl-l", "nl-x", "fr1", "fr2", "de1", "u"]);
});

test("product list: summary, first 6 visible, rest in details", () => {
  const nl = Array.from({ length: 4 }, (_, i) => prod(`N${i}`, "B", "Lidl"));
  const fr = Array.from({ length: 5 }, (_, i) => ({ ...prod(`F${i}`, "B", null), country: "france" }));
  const html = dossierFor([...nl, ...fr]);
  assert.ok(html.includes("4 in Nederland"));
  assert.ok(html.includes("5 elders"));
  assert.ok(html.includes("Toon meer (3)"));
  assert.ok(html.indexOf("F1") < html.indexOf("<details"));
  assert.ok(html.indexOf("F2") > html.indexOf("<details"));
  assert.ok(html.includes('class="tag tag-nl">NL · Lidl<'));
  assert.ok(html.includes('class="tag">FR<'));
});

test("exactly 6 products: no details; 7: one hidden", () => {
  const six = Array.from({ length: 6 }, (_, i) => prod(`P${i}`, "B", "AH"));
  assert.ok(!dossierFor(six).includes("<details"));
  assert.ok(dossierFor([...six, prod("P6", "B", "AH")]).includes("Toon meer (1)"));
});

test("no NL products: none-in-NL summary, unknown counts as elsewhere, all behind details", () => {
  const html = dossierFor([{ ...prod("X", "B", null), country: "france" }, { ...prod("Y", "B", null), country: "mars" }]);
  assert.ok(html.includes(STRINGS.nl.products_none_nl));
  assert.ok(html.includes("2 elders"));
  assert.ok(html.indexOf("<details") > 0 && html.indexOf("<details") < html.indexOf(">X<"));
});

test("chain and brand are escaped in tag and row", () => {
  const html = dossierFor([prod("n", "<b>x</b>", "<i>c</i>")]);
  assert.ok(!html.includes("<i>c</i>") && !html.includes("<b>x</b>"));
});

test("community badge shown once per product section", () => {
  const { parsed, matches } = lookup(data, "NL Z0507 EG");
  const html = renderDossier("en", parsed, matches, data);
  assert.equal(html.split(STRINGS.en.badge_community).length - 1, 1);
  assert.ok(html.includes("Open Food Facts"));
});

test("product country shows as ISO tag and unknown ones get no tag", () => {
  const html = dossierFor([{ ...prod("A", "Milbona", "Lidl"), country: "germany" }, { ...prod("B", "X", null), country: "afghanistan" }], "tr");
  assert.ok(html.includes('class="tag">DE · Lidl<'));
  assert.ok(!html.includes("germany"));
  assert.ok(!html.includes("afghanistan"));
  assert.equal(html.split('class="tag').length - 1, 1);
});

test("trail: nodes in order with dots hidden from screen readers", () => {
  const d = { codes: { "DE-NI10": { kind: "oval", country: "DE", region: "NI",
    establishments: [est("DMK", { city: "Zeven" })], group: { group: "DMK Group", evidence: "official", source_url: "https://gleif.org", date: "2026-11-18" },
    products: [prod("Slagroom", "Milsani", "Aldi")] } } };
  const { parsed, matches } = lookup(d, "DE NI 010 EG");
  const html = renderDossier("nl", parsed, matches, d);
  const order = ["node-clue", "node-facility", "node-group", "node-products"].map((c) => html.indexOf(c));
  assert.deepEqual([...order].sort((a, b) => a - b), order);
  assert.ok(order.every((i) => i > 0));
  assert.ok(html.includes(STRINGS.nl.step_clue));
  assert.ok(html.includes("Nedersaksen"));
  assert.equal(html.split('class="dot" aria-hidden="true"').length - 1, 4);
});

test("trail omits facility and group nodes when data is missing", () => {
  const d = { codes: { "NL-Z999": { kind: "oval", country: "NL", region: null, group: null, establishments: [],
    products: [prod("A", "Milbona", "Lidl")] } } };
  const { parsed, matches } = lookup(d, "NL Z0999 EG");
  const html = renderDossier("nl", parsed, matches, d);
  assert.ok(!html.includes("node-facility") && !html.includes("node-group"));
  assert.ok(html.includes("node-products"));
  assert.ok(!html.includes('class="num"') && !html.includes('class="step"'));
});

test("not-found and egg-shell pages render a clue-only trail", () => {
  const nf = renderNotFound("nl", parseCode("NL Z0999 EG"));
  assert.equal(nf.split('class="node ').length - 1, 1);
  assert.ok(nf.includes("node-clue"));
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
