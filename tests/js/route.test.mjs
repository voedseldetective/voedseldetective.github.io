import { test } from "node:test";
import assert from "node:assert/strict";
import { parseHash } from "../../site/js/route.js";

test("parses language, page and code", () => {
  assert.deepEqual(parseHash("#/tr/kod/NL%20Z0507"), { lang: "tr", page: "kod", arg: "NL Z0507" });
  assert.deepEqual(parseHash("#/en"), { lang: "en", page: "home", arg: null });
});

test("a malformed escape does not throw", () => {
  assert.deepEqual(parseHash("#/nl/kod/100%"), { lang: "nl", page: "kod", arg: "100%" });
});
