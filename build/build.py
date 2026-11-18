"""Merge COKZ, Open Food Facts and the manual CSVs into site/data/codes.json.

Usage:
  python -m build.build                 # download everything (cached in build/cache/)
  python -m build.build --offline DIR   # read cokz_*.html and off.json from DIR
"""
import argparse
import datetime as dt
import json
from pathlib import Path

from build import cokz, manual, off
from build.codes import parse_code

ROOT = Path(__file__).resolve().parent.parent
EST_FIELDS = ("name", "trade", "city", "private", "type", "evidence", "source_id", "source_url", "date")
PRODUCT_FIELDS = ("barcode", "name", "brand", "chain", "country", "evidence", "source_url")


def _describe(key: str) -> dict:
    if key.startswith("EGGPACK-"):
        return {"kind": "egg_pack", "country": "NL", "region": None}
    p = parse_code(key)
    if p is None:
        return {"kind": None, "country": None, "region": None}
    return {"kind": p.kind, "country": p.country, "region": p.region}


def merge(establishments, products, groups, cases, sources, generated=None) -> dict:
    codes: dict[str, dict] = {}

    def record(key):
        if key not in codes:
            codes[key] = {**_describe(key), "establishments": [], "group": None, "products": []}
        return codes[key]

    for e in establishments:
        rec = record(e["key"])
        item = {f: e.get(f) for f in EST_FIELDS}
        if item["date"] is None:
            item["date"] = (sources.get(e.get("source_id")) or {}).get("date")
        rec["establishments"].append(item)
        if rec["group"] is None and e.get("name") in groups:
            rec["group"] = groups[e["name"]]
    for p in products:
        item = {f: p.get(f) for f in PRODUCT_FIELDS}
        for key in p["keys"]:
            record(key)["products"].append(item)
    for rec in codes.values():
        rec["products"].sort(key=lambda p: (p["chain"] is None, p["chain"] or "",
                                            (p["brand"] or "").lower(), (p["name"] or "").lower()))
    return {"generated": generated or dt.date.today().isoformat(), "sources": sources,
            "codes": dict(sorted(codes.items())), "cases": cases}


def _report(data, previous) -> str:
    codes = data["codes"]
    with_est = sum(1 for r in codes.values() if r["establishments"])
    private = sum(1 for r in codes.values() for e in r["establishments"] if e["private"])
    lines = [f"generated: {data['generated']}", f"keys: {len(codes)}",
             f"keys with establishment: {with_est}", f"keys without establishment: {len(codes) - with_est}",
             f"private (hidden) establishments: {private}",
             f"products: {len({p['barcode'] for r in codes.values() for p in r['products']})}"]
    if previous is not None:
        old, new = set(previous.get("codes", {})), set(codes)
        lines.append(f"added keys ({len(new - old)}): {', '.join(sorted(new - old)[:50])}")
        lines.append(f"removed keys ({len(old - new)}): {', '.join(sorted(old - new)[:50])}")
    return "\n".join(lines) + "\n"


def main(argv=None):
    ap = argparse.ArgumentParser(prog="python -m build.build")
    ap.add_argument("--offline", metavar="DIR", help="read downloads from DIR instead of the network")
    ap.add_argument("--out", default=str(ROOT / "site" / "data" / "codes.json"))
    ap.add_argument("--report", default=str(ROOT / "build" / "report.txt"))
    args = ap.parse_args(argv)

    cache = Path(args.offline) if args.offline else ROOT / "build" / "cache"
    cache.mkdir(parents=True, exist_ok=True)
    sources, establishments = {}, []
    for source_id, url in cokz.SOURCES.items():
        path = cache / f"{source_id}.html"
        if not args.offline:
            path.write_text(cokz.fetch(url), encoding="utf-8")
        if not path.exists():
            continue
        html = path.read_text(encoding="utf-8")
        establishments += cokz.parse_register(html, source_id)
        sources[source_id] = {"url": url, "date": cokz.parse_date(html)}

    elle = ROOT / "elle"
    establishments += manual.load_establishments(elle / "tesisler.csv")
    groups = manual.load_groups(elle / "gruplar.csv")
    cases = manual.load_cases(elle / "vakalar.csv")

    off_path = cache / "off.json"
    if args.offline:
        cached = json.loads(off_path.read_text(encoding="utf-8"))
        products = cached.get("products") or off.products_from_hits(cached.get("hits", []))
    else:
        brands = [b for bs in off.CHAINS.values() for b in bs]
        products = off.fetch_products(brands)
        off_path.write_text(json.dumps({"hits": [], "products": products}, ensure_ascii=False), encoding="utf-8")
    sources["off"] = {"url": "https://world.openfoodfacts.org", "license": "ODbL",
                      "attribution": "Open Food Facts, ODbL", "date": dt.date.today().isoformat()}
    sources["manual"] = {}

    data = merge(establishments, products, groups, cases, sources)
    out = Path(args.out)
    previous = json.loads(out.read_text(encoding="utf-8")) if out.exists() else None
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    report = _report(data, previous)
    Path(args.report).write_text(report, encoding="utf-8")
    print(report, end="")


if __name__ == "__main__":
    main()
