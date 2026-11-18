// Parse packaging codes into lookup keys. Mirrors build/codes.py;
// tests/code_vectors.json keeps both in sync.
const COUNTRIES = new Set(["AT", "BE", "BG", "CY", "CZ", "DE", "DK", "EE", "EL", "GR", "ES", "FI", "FR",
  "HR", "HU", "IE", "IT", "LT", "LU", "LV", "MT", "NL", "PL", "PT", "RO", "SE",
  "SI", "SK", "GB", "UK", "CH", "NO", "IS"]);
const SUFFIX = /(?<=[\s\-./\d])(EEG|EWG|EG|EC|EU|CE|EK|WE|EF|EY|EZ|EB|ES|EÜ|KE)$/;
const SEPARATORS = /[\s.\-/]+/g;
const BODY = /^([A-Z]*)0*(\d+)([A-Z]*)$/;
const MSC = /^(?:MSC|ASC)-?C-?(\d+)(?:-(\d+))?$/;
const EGG_SHELL = /^([0-3])-?([A-Z]{2})-?(\d{5,})/;

function parseMsc(s) {
  const m = s.trim().replace(/[\s-]+/g, "-").match(MSC);
  if (!m) return null;
  const base = `MSC-C-${m[1]}`;
  const key = m[2] ? `${base}-${m[2]}` : base;
  return { kind: "msc", country: null, key, display: key, region: null, extra: { base } };
}

function parseEggShell(s) {
  const m = s.replace(/\s+/g, "").match(EGG_SHELL);
  if (!m) return null;
  return { kind: "egg_shell", country: m[2], key: "EGGSHELL", display: m[0], region: null,
    extra: { system: Number(m[1]), country: m[2] } };
}

function parseOval(s) {
  s = s.trim();
  let suffix = false;
  for (let m = s.match(SUFFIX); m; m = s.match(SUFFIX)) { // codes can carry two suffixes, e.g. "EG/EC"
    s = s.slice(0, m.index).replace(/[ 	\-./]+$/, "");
    suffix = true;
  }
  const compact = s.replace(SEPARATORS, "");
  const country = compact.slice(0, 2);
  const body = compact.slice(2);
  if (!COUNTRIES.has(country) || !body || !/\d/.test(body)) return null;
  const m = body.match(BODY);
  const norm = m ? `${m[1]}${parseInt(m[2], 10)}${m[3]}` : body;
  const region = country === "DE" && m && m[1].length === 2 ? m[1] : null;
  const isDigits = /^\d+$/.test(body);
  return { kind: "oval", country, key: `${country}-${norm}`, display: `${country} ${body}`, region,
    extra: { suffix, ambiguous: !suffix && country === "NL" && isDigits,
      number: isDigits ? parseInt(body, 10) : null } };
}

export function parseCode(raw) {
  if (!raw || !raw.trim()) return null;
  const s = raw.toUpperCase().trim();
  return parseMsc(s) || parseEggShell(s) || parseOval(s);
}

export function candidateKeys(raw) {
  const p = parseCode(raw);
  if (!p) return [];
  if (p.kind === "msc" && p.key !== p.extra.base) return [p.key, p.extra.base];
  if (p.kind === "oval" && p.extra.ambiguous) return [p.key, `EGGPACK-NL${p.extra.number}`];
  return [p.key];
}
