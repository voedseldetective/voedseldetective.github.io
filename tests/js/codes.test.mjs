import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseCode, candidateKeys } from "../../site/js/codes.js";

const vectors = JSON.parse(readFileSync(new URL("../code_vectors.json", import.meta.url), "utf8"));

test("shared code vectors", () => {
  for (const v of vectors) {
    const p = parseCode(v.raw);
    assert.equal(p?.kind ?? null, v.kind, v.raw);
    assert.equal(p?.key ?? null, v.key, v.raw);
    assert.deepEqual(candidateKeys(v.raw), v.candidates, v.raw);
  }
});

test("German region", () => {
  assert.equal(parseCode("DE NI 010 EG").region, "NI");
});
