# Dossier trail and NL-first product list: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Change the code result page in two ways:
- Product list: a flat list with NL products first, the first 6 visible and the rest behind "show more".
- Trail: the step cards become a colorful dotted trail of nodes.

**Architecture:** All changes are in pure string-rendering functions in `site/js/render.js`, plus a slug→ISO helper in `regions.js`, new i18n strings and CSS. No data or build changes.

**Tech Stack:** Plain ES modules, `node:test`, CSS. No dependencies.

**Spec:** `docs/superpowers/specs/2026-11-19-dossier-trail-design.md`

## Global Constraints

- **Copy rule:** never say "same product"; say "same facility". Keep the header comment in `i18n.js`.
- **Languages:** every new string exists in `nl`, `en` and `tr`.
- **Escaping:** every data value is escaped with `escapeHtml`, and links go through `link()`.
- **No animation, no new libraries, no flag emoji.** Country tags use ISO text codes (`NL`, `DE`).
- **Layout:** works at 360 px width without horizontal scroll.
- **Branch:** work on branch `design-trail`. Never push to `main` without user approval, because a push to `main` deploys.
- **JS tests:** `node --test tests/js/*.test.mjs`
- **Python tests:** `python -m unittest discover -s tests -t .`

## Review Focus

1. **List of exactly 6 vs 7 products:** 6 products → no `<details>`. 7 products → `<details>` with "Toon meer (1)". *(Task 1 test.)*
2. **Every product has an unknown or non-NL country:** the summary shows the "none in NL" text, the "elsewhere" count includes unknown-country products, and all rows are behind `<details>`. *(Task 1 test.)*
3. **HTML in chain or brand names:** escaped inside the tag and the row. *(Task 1 test.)*
4. **Long names at 360 px:** the tag wraps under the name instead of overflowing. *(Task 2 manual check.)*
5. **Ambiguous code (`NL 1005`):** two dossiers, each with its own complete trail, and `<p class="code">` appears twice. *(The existing test is kept in Task 2.)*

---

### Task 1: NL-first flat product list

**Files:**
- Modify: `site/js/regions.js`. Add `offCountryCode` and reuse `OFF_SLUGS`.
- Modify: `site/js/render.js`. Change `SHOW_FIRST` to 6, and rewrite `productItem` and `productsSection` (lines ~67-96).
- Modify: `site/js/i18n.js`. Add these strings:

  | Key | nl | en | tr |
  |---|---|---|---|
  | `show_more` | `"Toon meer ({n})"` | `"Show more ({n})"` | `"Daha fazla göster ({n})"` |
  | `products_in_nl` | `"{n} in Nederland"` | `"{n} in the Netherlands"` | `"Hollanda'da {n} ürün"` |
  | `products_elsewhere` | `"{n} elders"` | `"{n} elsewhere"` | `"başka ülkelerde {n}"` |
  | `products_none_nl` | `"Nog geen producten in Nederland bekend"` | `"No products known in the Netherlands yet"` | `"Hollanda'da henüz ürün bilinmiyor"` |

  Remove `other_brands` only if it is no longer used anywhere.
- Modify: `site/style.css`. Add `.products li` as a flex row, plus `.tag`, `.tag-nl` and `.products-summary`.
- Test: `tests/js/render.test.mjs`. Replace the old "store brands open / others collapse after 5" test (around lines 117-125) with the tests below.

**Interfaces:**
- Produces: `offCountryCode(slug: string|null) -> string|null`, exported from `regions.js`. It returns the ISO2 code, or null for unknown slugs.
- Produces: `orderProducts(products: Product[]) -> Product[]`, exported from `render.js` for tests. The order is:
  1. NL products that have a chain
  2. NL products without a chain
  3. non-NL products with a known country, grouped by country, groups by count descending (ties by ISO code ascending)
  4. unknown-country products

  The original order is kept within each bucket.
- Produces: `productsSection(lang, products) -> string` (internal). Task 2 places its output inside the products node.

- [ ] **Step 1: Write the failing tests** in `tests/js/render.test.mjs`. Use the existing `prod()` helper and override `country`.

```js
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
  const nl = Array.from({ length: 4 }, (_, i) => ({ ...prod(`N${i}`, "B", "Lidl") }));
  const fr = Array.from({ length: 5 }, (_, i) => ({ ...prod(`F${i}`, "B", null), country: "france" }));
  const html = dossierFor([...nl, ...fr]); // helper: renders NL-Z507 with these products in "nl"
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
  assert.ok(html.indexOf("<details") < html.indexOf(">X<"));
});

test("chain and brand are escaped in tag and row", () => {
  const html = dossierFor([{ ...prod("n", "<b>x</b>", "<i>c</i>") }]);
  assert.ok(!html.includes("<i>c</i>") && !html.includes("<b>x</b>"));
});
```

  Two more details for the tests:
  - Add a small `dossierFor(products, lang = "nl")` helper at the top of the test file. It renders `NL-Z507` with the given products through `lookup` and `renderDossier`.
  - Import `offCountryCode` from `regions.js` and `orderProducts` from `render.js`.

- [ ] **Step 2: Run the tests to verify they fail.** Run `node --test tests/js/*.test.mjs`. Expected: the new tests FAIL (e.g. `offCountryCode is not a function`).

- [ ] **Step 3: Implement.**
  - **Summary line:** `productsSection` starts with `<p class="products-summary">`. When the NL count > 0 it shows `products_in_nl`, otherwise `products_none_nl`. If the elsewhere count > 0, it adds ` · ` and `products_elsewhere`.
  - **List:** next comes `<ul class="products">` with the first 6 rows of `orderProducts`. If more rows remain, they go in `<details><summary>show_more{n}</summary><ul class="products">…</ul></details>`.
  - **No NL products:** in that case, all rows go behind `<details>`.
  - **Source line:** keep the existing "Bron: Open Food Facts" line after the list.
  - **Row:** `<li><span class="pname"><strong>{brand}</strong> {link(name||barcode)}</span>{tag}{badge if evidence !== "community"}</li>`.
  - **Tag:** `<span class="tag tag-nl">NL · Lidl</span>` when the country is NL. Non-NL countries use `class="tag"`. Without a chain, the tag shows the ISO code only. Without a known country, there is no tag.
  - **Empty list:** keep the existing `no_products` text.
  - **CSS:**
    - `.products li { display:flex; flex-wrap:wrap; justify-content:space-between; gap:.35rem .5rem; }`
    - `.tag` is a pill: 0.78rem, bold, background `var(--tag-bg)`, ink `var(--muted)`.
    - `.tag-nl` uses `var(--tag-nl-bg)` `#ffedd5` and `var(--tag-nl-ink)` `#9a3412`.
    - Add these tokens to `:root`.

- [ ] **Step 4: Run all tests.** Run `node --test tests/js/*.test.mjs` and expect all PASS; also run the Python tests and expect OK.

- [ ] **Step 5: Commit** with message `feat: NL-first flat product list with country/chain tags`.

---

### Task 2: Colorful trail

**Files:**
- Modify: `site/js/render.js`.
  - `renderDossier` (lines ~103-127) and `codeSection` now emit the trail.
  - `establishmentItem` keeps its content, but the badge and source sit in a `.src` line under the main line.
- Modify: `site/js/i18n.js`. Add `step_clue`: nl `"Het spoor"`, en `"The clue"`, tr `"İpucu"`.
- Modify: `site/style.css`.
  - Replace `.step` and `.num` with `.trail`, `.node`, `.dot` and `.node-*`.
  - Add tokens `--dot-clue #ede9fe`, `--dot-facility #fef3c7`, `--dot-group #dcfce7`, `--dot-products #dbeafe` and `--trail-line #c4b5fd`.
- Test: `tests/js/render.test.mjs`. Replace the "step numbers stay sequential" test (around lines 144-151).

**Interfaces:**
- Consumes: `productsSection(lang, products)` from Task 1.
- Produces markup (CSS and tests rely on these exact class names):

```html
<p class="code">DE NI 010 EG</p>
<ol class="trail">
  <li class="node node-clue"><span class="dot" aria-hidden="true">🔍</span><h3>Het spoor</h3><p>EU-erkenningscode (ovaal) · Duitsland · Nedersaksen</p></li>
  <li class="node node-facility">…🏭… <h3>De vestiging</h3><ul class="est">…</ul></li>
  <li class="node node-group">…🏢… <h3>Het bedrijf erachter</h3><p><strong>DMK Group…</strong></p><p class="src">badge · Bron …</p></li>
  <li class="node node-products">…🛒… <h3>Andere producten met deze code</h3>{productsSection}</li>
</ol>
```

  - **Node 1 line:** the kind label, country name and region name joined with ` · `, leaving out empty parts.
  - **Missing data:** if there are no establishments, the facility node is not rendered. If there is no group, the group node is not rendered.
  - **Unchanged:** the ambiguous note, the disclaimer, the MSC note and the OFF link stay where they are.
  - `renderNotFound` and `renderEggShell` also use `codeSection`. They keep working by rendering the code and a one-node trail (clue only).

- [ ] **Step 1: Write the failing tests.**

```js
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
  const { parsed, matches } = lookup(d, "NL Z999 EG");
  const html = renderDossier("nl", parsed, matches, d);
  assert.ok(!html.includes("node-facility") && !html.includes("node-group"));
  assert.ok(html.includes("node-products"));
});
```

  Also update any remaining assertions on `class="num"` or `class="step"`. Keep the `<p class="code">NL 1005</p>` count test.

- [ ] **Step 2: Run the tests to verify they fail.** Run `node --test tests/js/*.test.mjs`. Expected: the new trail tests FAIL.

- [ ] **Step 3: Implement the markup above and the CSS.**
  - `.trail { list-style:none; padding:0; margin:.75rem 0 0; }`
  - `.node { position:relative; padding:0 0 1.1rem 3rem; }`
  - `.dot` is a 2.25rem circle, absolutely positioned at left 0.
  - `.node:not(:last-child)::before` draws the dashed connector: `left:1.05rem; top:2.4rem; bottom:0; width:3px; background:repeating-linear-gradient(var(--trail-line) 0 6px, transparent 6px 11px)`.
  - `.node h3` is a small uppercase muted label.
  - Each `.node-* .dot` uses its own `--dot-*` token.
  - The code `p.code` keeps the oval stamp look.

- [ ] **Step 4: Run all tests.** Run the JS and Python test commands; expect all PASS / OK.

- [ ] **Step 5: Manual check.** Run `python -m http.server 8000 -d site`. In a 360 px-wide viewport, open:
  - `#/nl/kod/DE-BY303` (crowded)
  - `#/nl/kod/NL-Z507`
  - `#/tr/kod/MSC-C-50572`
  - `#/en/kod/DE-SN16` (no facility)
  - `#/nl/kod/NL%201005` (ambiguous)

  Check all of these:
  - no horizontal scroll
  - long names wrap and the tag goes under the name
  - the dashed line stops at the last node
  - no console errors

- [ ] **Step 6: Commit** with message `feat: colorful dossier trail`. Then show the local page to the user and wait for approval. Only then merge into `main` and push.
