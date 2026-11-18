"""Decide whether a register name is a legal entity that may be shown publicly.

Natural persons, sole traders and partnerships (V.O.F., maatschap) are personal
data under the GDPR; for those we keep only the city.
"""
import re

_B, _E = r"(?<![\w.])", r"(?![\w])"
# Case-insensitive legal-form tokens.
_LEGAL_CI = ["B.V.", "N.V.", "B.A.", "Coöperatie", "Cooperatie", "Coöperatieve", "Cooperatieve", "U.A.", "Stichting", "GmbH",
             "S.A.", "Ltd", "S.p.A.", "SpA", "A/S", "Holding"]
# Short tokens matched case-sensitively, so a first name like "Ab" is not a legal form.
_LEGAL_CS = ["BV", "NV", "BA", "AG", "SA", "AB", "KG"]
_PERSONAL = ["V.O.F.", "Vof", "Mts.", "Maatschap", "eenmanszaak"]


def _alt(tokens):
    return "|".join(re.escape(t) for t in tokens)


LEGAL_CI = re.compile(_B + "(?:" + _alt(_LEGAL_CI) + ")" + _E, re.I)
LEGAL_CS = re.compile(_B + "(?:" + _alt(_LEGAL_CS) + ")" + _E)
PERSONAL = re.compile(_B + "(?:" + _alt(_PERSONAL) + ")" + _E, re.I)
SURNAME_INITIAL = re.compile(r"^[^,]+, [A-Z]\.")


def is_legal_entity(name: str) -> bool:
    name = (name or "").strip()
    if not name or PERSONAL.search(name) or SURNAME_INITIAL.match(name):
        return False
    return bool(LEGAL_CI.search(name) or LEGAL_CS.search(name))


def _city(city: str) -> str | None:
    city = (city or "").strip().title()
    return re.sub(r"^'([ST])\b", lambda m: "'" + m.group(1).lower(), city) or None  # 's-Hertogenbosch, 't Zandt


def public_establishment(name: str, trade: str, city: str) -> dict:
    city = _city(city)
    if is_legal_entity(name):
        return {"name": name.strip(), "trade": (trade or "").strip() or None, "city": city, "private": False}
    return {"name": None, "trade": None, "city": city, "private": True}
