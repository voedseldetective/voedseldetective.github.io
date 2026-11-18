"""Read the COKZ registers (static HTML tables) of approved dairy plants and egg packing stations."""
import re
import time
import urllib.request
from html.parser import HTMLParser

from build.codes import oval_key
from build.privacy import public_establishment

SOURCES = {
    "cokz_zuivel": "https://cokz.nl/zuivel/register/register-erkende-zuivelbedrijven/",
    "cokz_boerderij": "https://cokz.nl/zuivel/register/register-erkende-boerderij-zuivelbedrijven/",
    "cokz_pak": "https://cokz.nl/pluimvee-en-eieren/register/register-erkende-pakstations/",
}
MONTHS = {m: i for i, m in enumerate(
    ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus",
     "september", "oktober", "november", "december"], start=1)}
USER_AGENT = "Voedseldetective-build/0.1"


class _TableParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.rows, self._row, self._cell = [], None, None

    def handle_starttag(self, tag, attrs):
        if tag == "tr":
            self._row = []
        elif tag == "td" and self._row is not None:
            self._cell = []

    def handle_endtag(self, tag):
        if tag == "td" and self._cell is not None:
            self._row.append(" ".join("".join(self._cell).split()))
            self._cell = None
        elif tag == "tr" and self._row is not None:
            if self._row:  # header rows use <th> and stay empty
                self.rows.append(self._row)
            self._row = None

    def handle_data(self, data):
        if self._cell is not None:
            self._cell.append(data)


def parse_register(html: str, source_id: str) -> list[dict]:
    parser = _TableParser()
    parser.feed(html)
    out = []
    for row in parser.rows:
        if len(row) < 6:
            continue
        name, trade, _address, _postcode, city, number = row[:6]
        number = number.replace(" ", "").upper()
        if source_id == "cokz_pak":
            m = re.fullmatch(r"NL0*(\d+)", number)
            if not m:
                continue
            key, typ = f"EGGPACK-NL{int(m.group(1))}", "egg_pack"
        else:
            if not number.startswith("Z"):
                continue  # export/storage registrations, no oval mark
            key, typ = oval_key("NL " + number), "dairy"
            if key is None:
                continue
        rec = public_establishment(name, trade, city)
        rec.update({"key": key, "country": "NL", "type": typ, "evidence": "official",
                    "source_id": source_id, "source_url": SOURCES[source_id]})
        out.append(rec)
    return out


def parse_date(html: str) -> str | None:
    m = re.search(r"Datum\s*(?:<[^>]+>\s*)*(\d{1,2})\s+([a-z]+)\s+(\d{4})", html, re.I)
    if not m or m.group(2).lower() not in MONTHS:
        return None
    return f"{m.group(3)}-{MONTHS[m.group(2).lower()]:02d}-{int(m.group(1)):02d}"


def fetch(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                return resp.read().decode("utf-8", errors="replace")
        except OSError:
            if attempt == 2:
                raise
            time.sleep(2 * (attempt + 1))
    raise AssertionError("unreachable")
