"""Import products with packaging codes from Open Food Facts (ODbL) via search-a-licious."""
import json
import time
import urllib.parse
import urllib.request
from pathlib import Path

from build.codes import parse_code

SEARCH_URL = "https://search.openfoodfacts.org/search"
FIELDS = "code,product_name,brands,emb_codes,countries_tags"
USER_AGENT = "Voedseldetective-build/0.1"
CHAINS = json.loads((Path(__file__).parent / "chains.json").read_text(encoding="utf-8"))


def _norm(s: str) -> str:
    return " ".join((s or "").lower().split())


_BRAND_TO_CHAIN = {_norm(b): chain for chain, brands in CHAINS.items() for b in brands}
_CANONICAL = {_norm(b): b for brands in CHAINS.values() for b in brands}


def map_chain(brands: list[str]) -> str | None:
    for b in brands or []:
        chain = _BRAND_TO_CHAIN.get(_norm(b))
        if chain:
            return chain
    return None


def _keys(emb_codes) -> list[str]:
    keys = []
    for raw in emb_codes or []:
        p = parse_code(raw)
        if p and p.kind in ("oval", "msc") and p.key not in keys:
            keys.append(p.key)
    return keys


def products_from_hits(hits: list[dict]) -> list[dict]:
    out = []
    for h in hits:
        keys = _keys(h.get("emb_codes"))
        if not keys or not h.get("code"):
            continue
        brands = h.get("brands") or []
        if isinstance(brands, str):
            brands = [b.strip() for b in brands.split(",") if b.strip()]
        countries = h.get("countries_tags") or []
        out.append({
            "barcode": h["code"],
            "name": (h.get("product_name") or "").strip(),
            "brand": _CANONICAL.get(_norm(brands[0]), brands[0].strip()) if brands else None,
            "chain": map_chain(brands),
            "country": countries[0].split(":", 1)[-1] if countries else None,
            "keys": keys,
            "evidence": "community",
            "source_id": "off",
            "source_url": f"https://world.openfoodfacts.org/product/{h['code']}",
            "_raw_codes": [c.strip() for c in h.get("emb_codes") or [] if parse_code(c)],
        })
    return out


def search_json(query: str, page: int) -> dict:
    url = SEARCH_URL + "?" + urllib.parse.urlencode(
        {"q": query, "page": page, "page_size": 100, "fields": FIELDS})
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                return json.loads(resp.read())
        except (OSError, ValueError):
            if attempt == 2:
                raise
            time.sleep(5)
    raise AssertionError("unreachable")


def _all_pages(query, fetch_json, sleep):
    page = 1
    while True:
        data = fetch_json(query, page)
        yield from data.get("hits", [])
        if page >= data.get("page_count", 1):
            return
        page += 1
        sleep(1)


def fetch_products(brands: list[str], fetch_json=search_json, sleep=time.sleep) -> list[dict]:
    found: dict[str, dict] = {}

    def add(hits):
        for p in products_from_hits(hits):
            found.setdefault(p["barcode"], p)

    for brand in brands:
        add(_all_pages(f'brands:"{brand}" AND emb_codes:* AND countries_tags:"en:netherlands"', fetch_json, sleep))
        sleep(1)
    # Follow every code to find sister products, also outside the Netherlands.
    raw_codes = sorted({c.replace('"', "") for p in found.values() for c in p["_raw_codes"]})
    for raw in raw_codes:
        add(_all_pages(f'emb_codes:"{raw}"', fetch_json, sleep))
        sleep(1)
    return list(found.values())  # _raw_codes stays for the cache; merge() does not publish it


def rekey(products: list[dict]) -> list[dict]:
    """Recompute keys from cached raw codes so parser fixes apply in --offline builds."""
    for p in products:
        if p.get("_raw_codes"):
            p["keys"] = _keys(p["_raw_codes"])
        if p.get("brand"):
            p["brand"] = _CANONICAL.get(_norm(p["brand"]), p["brand"])
    return [p for p in products if p["keys"]]
