# Code result page: colorful trail and NL-first product list (short design)

Date: 2026-11-19 · Status: draft, awaiting user approval · Size: small change

## Intent

The code result page ("detective dossier") is what visitors coming from Instagram see. Two problems:

1. **The "other products with this code" section gets crowded.** For example, `DE-BY303` shows 129 Lidl products in one open list, and most of them are sold outside NL.
2. **The trail reads like a flat list.**

The user wants the trail to read like a story, but an extremely short one. The user also wants NL products first and products from other countries only behind an "expand".

## Goals

- The page shows at most 6 products before the visitor taps anything.
- The trail can be read top to bottom in a few seconds, with one line per step.
- The page looks fine at 360 px width, with no horizontal scroll.

## Non-goals

These stay as they are:

- the home page
- search
- the about page
- the "not found" page and the egg-shell page
- the data and the build script

## Anti-goals

- **No "same product" claim.** We say "same facility" only. The wording rule in `i18n.js` stays.
- **No animation and no new libraries.** The site is plain HTML/CSS/JS.
- **No group headings** in the product list. The user found too many headings ugly.

## Approaches

| Approach | Notes |
|---|---|
| **Change the existing `render.js` and `style.css` in place (chosen)** | Plain HTML/CSS. Builds on what is already there. |
| Add a CSS library (Tailwind etc.) | Rejected: extra load the site doesn't need. |
| Animated trail with steps appearing one by one | Rejected: works against "extremely short", slows reading, and needs a reduced-motion variant. |

The user chose these options in the visual companion:

- **Product list A (flat list):** one list without headings. Each row has a small tag on the right showing the country and chain. NL products come first, and the first 6 are visible. The rest open with a single "show more (N)" control.
- **Trail B (colorful chain):** the 4 steps are joined by a dotted line. Each step has a round, colored icon and one line of text.

## Design

### Trail

The trail replaces the current step cards inside each `article.dossier`. It is an `ol` list with up to four nodes:

| Node | Icon | Label (NL) | Line shown |
|---|---|---|---|
| 1 | 🔍 | Het spoor (clue) | code type · country · region |
| 2 | 🏭 | De vestiging | name (+ trade name), city · type |
| 3 | 🏢 | Het bedrijf erachter | group / parent |
| 4 | 🛒 | Andere producten met deze code | NL summary + list |

Above the trail, the code itself stays as the large oval stamp.

The node label strings keep the current i18n keys (`step_code` etc.), so the wording barely changes. **My call:** "Het spoor" is a new NL/EN/TR string for node 1.

Node details:

- **Missing information:** a node without data is left out, as today. If there is no facility, node 2 is not shown; if there is no group, node 3 is not shown. The dotted line joins whatever nodes remain. **My call:** the user asked for "extremely short", so empty nodes saying "unknown" would only add length.
- **Several facilities:** if a code has several facilities, they appear as short lines inside node 2.
- **Evidence badge and source:** these go in a small muted line under the main line of each node, exactly as they work today.
- **Colors:** each node's dot gets its own pastel color: purple, amber, green, blue. The colors are defined as `:root` tokens, and the text on each dot must reach WCAG AA contrast.
- **Icons:** the icons are emoji, so no image files are needed. Emoji are decorative and use `aria-hidden`; the label text carries the meaning.

### Product list (inside node 4)

1. **Summary line:** first a line like "**7 in Nederland** · 46 elders". It uses new i18n strings in 3 languages.
2. **Sort order:**
   1. products sold in NL, with store-brand products (those with a chain) before the others
   2. the remaining products, grouped by country, with the country with the most products first
   3. products with an unknown country last
3. **Visible rows:** the first 6 rows are shown. The rest go inside a native `<details>` element, whose summary reads "Toon meer ({n})". The existing `show_all` style string is reused or adapted.
4. **Row:** brand in bold, then the product name (linked to OFF as today). On the right is a tag with the country code and chain, e.g. `NL · Lidl`. The tag shows just `NL` if there is no chain, and is left out if the country is unknown. NL tags get a highlight color.
5. **Empty NL list:** if the code has no NL products, the summary reads "Nog geen producten in Nederland bekend · {m} elders" (in all 3 languages). The rest of the list stays behind "Toon meer".

**My call:** the tag uses text country codes (`NL`, `DE`, `FR`), not flag emoji. Windows does not render flag emoji; it shows two letters instead. The country slug → ISO code mapping goes next to `offCountryName` in `regions.js`.

### Unchanged

- the disclaimer at the bottom of the dossier
- the MSC note
- the "add to Open Food Facts" link
- the double-reading notice for ambiguous codes

## Left to the builder

- **Spacing and sizes:** exact spacing, font sizes and the colors of the dashed line, matching the mockups in `.superpowers/brainstorm/…/trail-story.html` (option B) and `products-list-v2.html` (option A).
- **Tests:** update `tests/js/render.test.mjs` for the new structure. Add tests for:
  - the sort order
  - the 6-row limit and the `details` count
  - the empty-NL summary
  - nodes being left out when data is missing
  - tags for chain, no chain and unknown country

  All existing tests must keep passing.
- **Before deploy:** check by hand at 360 px with `DE-BY303` (crowded), `NL-Z507` (NL-heavy), `MSC-C-50572` (MSC) and one code without a facility.
- **Branch:** do the work on a branch. Push to `main` only after the user approves the result, because a push to `main` deploys the live site.
