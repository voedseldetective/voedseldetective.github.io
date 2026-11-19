import { test } from "node:test";
import assert from "node:assert/strict";
import { STRINGS, t, pickLang } from "../../site/js/i18n.js";
import { COUNTRIES, DE_STATES } from "../../site/js/regions.js";

const REQUIRED = ["tagline", "search_placeholder", "search_button", "where_code", "cases_title",
  "step_code", "step_facility", "step_group", "step_products",
  "badge_official", "badge_company", "badge_community", "badge_verified",
  "disclaimer", "private_facility", "not_found", "off_add", "share", "report_error",
  "egg_shell_info", "egg_shell_none", "msc_note",
  "about_title", "about_body", "sources_title", "license_off", "takedown",
  "kind_oval", "kind_msc", "kind_egg_pack", "type_dairy", "type_meat", "type_fish", "type_egg_pack"];

const DISCLAIMER = {
  nl: "Een erkenningscode toont waar een product als laatste is verwerkt of verpakt. Dezelfde vestiging betekent niet hetzelfde product of recept.",
  en: "An approval code shows where a product was last processed or packed. The same facility does not mean the same product or recipe.",
  tr: "Onay kodu, ürünün en son işlendiği veya paketlendiği tesisi gösterir. Aynı tesis, aynı ürün veya tarif anlamına gelmez.",
};

test("all languages have the same, complete key set", () => {
  const nlKeys = Object.keys(STRINGS.nl).sort();
  for (const lang of ["nl", "en", "tr"]) {
    for (const k of REQUIRED) assert.ok(STRINGS[lang][k], `${lang}.${k}`);
    assert.deepEqual(Object.keys(STRINGS[lang]).sort(), nlKeys, lang);
  }
});

test("fixed copy is verbatim", () => {
  for (const lang of ["nl", "en", "tr"]) assert.equal(STRINGS[lang].disclaimer, DISCLAIMER[lang]);
  assert.equal(STRINGS.en.msc_note, "An MSC code shows the certified company, not necessarily the factory.");
  assert.equal(STRINGS.nl.private_facility, "Geregistreerd bedrijf (eenmanszaak of personenvennootschap) – naam niet getoond");
  assert.equal(STRINGS.tr.private_facility, "Kayıtlı işletme (şahıs işletmesi veya ortaklık) – ad gösterilmiyor");
});

test("no 'same product' wording outside the disclaimer", () => {
  const bad = { nl: /zelfde product/i, en: /same product/i, tr: /aynı ürün/i };
  for (const lang of ["nl", "en", "tr"])
    for (const [k, v] of Object.entries(STRINGS[lang]))
      if (k !== "disclaimer") assert.doesNotMatch(v, bad[lang], `${lang}.${k}`);
});

test("pickLang", () => {
  assert.equal(pickLang(["tr-TR"]), "tr");
  assert.equal(pickLang(["de-DE"]), "nl");
  assert.equal(pickLang(["de-DE", "en-GB"]), "en");
  assert.equal(pickLang([]), "nl");
});

test("t fills placeholders and falls back to nl", () => {
  assert.ok(t("en", "off_add", {}));
  assert.equal(t("xx", "search_button"), STRINGS.nl.search_button);
  assert.equal(t("en", "missing_key_x"), "missing_key_x");
});

test("regions", () => {
  assert.equal(DE_STATES.NI.en, "Lower Saxony");
  assert.equal(COUNTRIES.NL.tr, "Hollanda");
  assert.ok(DE_STATES.EV.en.includes("EU"));
});

test("design pass strings and countries", () => {
  for (const lang of ["nl", "en", "tr"]) {
    for (const k of ["try_examples", "show_more", "products_in_nl", "products_elsewhere", "products_none_nl", "badge_official_desc", "badge_company_desc", "badge_community_desc", "badge_verified_desc"])
      assert.ok(STRINGS[lang][k], `${lang}.${k}`);
  }
  for (const c of ["BG", "CY", "EE", "HR", "LV", "MT", "RO", "SI", "SK", "IS", "SE", "FI", "CZ"]) assert.ok(COUNTRIES[c]?.tr, c);
});
