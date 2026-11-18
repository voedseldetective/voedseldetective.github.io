"""Parse packaging codes (EU oval mark, MSC/ASC, egg codes) into lookup keys.

The same rules live in site/js/codes.js; tests/code_vectors.json keeps them in sync.
"""
import re
from dataclasses import dataclass, field

# Countries whose oval marks we accept (EU/EEA + UK/CH). Greece uses EL.
COUNTRIES = {
    "AT", "BE", "BG", "CY", "CZ", "DE", "DK", "EE", "EL", "GR", "ES", "FI", "FR",
    "HR", "HU", "IE", "IT", "LT", "LU", "LV", "MT", "NL", "PL", "PT", "RO", "SE",
    "SI", "SK", "GB", "UK", "CH", "NO", "IS",
}
SUFFIX = re.compile(r"(?<=[\s\-./\d])(EEG|EWG|EG|EC|EU|CE|EK|WE|EF|EY|EZ|EB|ES|EÜ|KE)$")
SEPARATORS = re.compile(r"[\s.\-/]+")
BODY = re.compile(r"^([A-Z]*)0*(\d+)([A-Z]*)$")
MSC = re.compile(r"^(?:MSC|ASC)-?C-?(\d+)(?:-(\d+))?$")
EGG_SHELL = re.compile(r"^([0-3])-?([A-Z]{2})-?(\d{5,})")


@dataclass
class ParsedCode:
    kind: str
    country: str | None
    key: str
    display: str
    region: str | None = None
    extra: dict = field(default_factory=dict)


def _parse_msc(s: str) -> ParsedCode | None:
    m = MSC.match(re.sub(r"[\s-]+", "-", s.strip()))
    if not m:
        return None
    base = f"MSC-C-{m.group(1)}"
    key = f"{base}-{m.group(2)}" if m.group(2) else base
    return ParsedCode("msc", None, key, key, None, {"base": base})


def _parse_egg_shell(s: str) -> ParsedCode | None:
    m = EGG_SHELL.match(re.sub(r"\s+", "", s))
    if not m:
        return None
    return ParsedCode("egg_shell", m.group(2), "EGGSHELL", m.group(0), None,
                      {"system": int(m.group(1)), "country": m.group(2)})


def _parse_oval(s: str) -> ParsedCode | None:
    s = s.strip()
    suffix = False
    while m := SUFFIX.search(s):  # codes can carry two suffixes, e.g. "EG/EC"
        s = s[: m.start()].rstrip(" 	-./")
        suffix = True
    compact = SEPARATORS.sub("", s)
    country, body = compact[:2], compact[2:]
    if country not in COUNTRIES or not body or not re.search(r"\d", body):
        return None
    m = BODY.match(body)
    norm = f"{m.group(1)}{int(m.group(2))}{m.group(3)}" if m else body
    region = None
    if country == "DE" and m and len(m.group(1)) == 2:
        region = m.group(1)
    ambiguous = (not suffix and country == "NL" and body.isdigit())
    return ParsedCode("oval", country, f"{country}-{norm}", f"{country} {body}", region,
                      {"suffix": suffix, "ambiguous": ambiguous, "number": int(body) if body.isdigit() else None})


def parse_code(raw: str) -> ParsedCode | None:
    if not raw or not raw.strip():
        return None
    s = raw.upper().strip()
    return _parse_msc(s) or _parse_egg_shell(s) or _parse_oval(s)


def candidate_keys(raw: str) -> list[str]:
    p = parse_code(raw)
    if p is None:
        return []
    if p.kind == "msc" and p.key != p.extra["base"]:
        return [p.key, p.extra["base"]]
    if p.kind == "oval" and p.extra["ambiguous"]:
        return [p.key, f"EGGPACK-NL{p.extra['number']}"]
    return [p.key]


def oval_key(raw: str) -> str | None:
    p = parse_code(raw)
    return p.key if p and p.kind == "oval" else None
