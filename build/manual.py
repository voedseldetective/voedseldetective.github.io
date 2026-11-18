"""Load and validate the hand-curated CSV files in elle/."""
import csv
from pathlib import Path

from build.codes import parse_code
from build.privacy import public_establishment

EVIDENCE = {"official", "company", "verified"}
LANGS = ("nl", "en", "tr")


def _rows(path):
    with open(Path(path), encoding="utf-8-sig", newline="") as f:
        for n, row in enumerate(csv.DictReader(f), start=2):  # line 1 is the header
            yield n, {k: (v or "").strip() for k, v in row.items() if k}


def _require(n, ok, msg):
    if not ok:
        raise ValueError(f"satır {n}: {msg}")


def _check_source(n, row):
    _require(n, row.get("evidence") in EVIDENCE,
             f"evidence '{row.get('evidence')}' geçersiz (official|company|verified)")
    _require(n, row.get("source_url"), "source_url boş")


def load_establishments(path) -> list[dict]:
    out = []
    for n, row in _rows(path):
        p = parse_code(row.get("code", ""))
        _require(n, p is not None and p.kind in ("oval", "msc"), f"kod çözülemedi: '{row.get('code')}'")
        _check_source(n, row)
        rec = public_establishment(row.get("name", ""), "", row.get("city", ""))
        rec.update({"key": p.key, "country": row.get("country") or p.country, "type": row.get("type") or None,
                    "evidence": row["evidence"], "source_id": "manual",
                    "source_url": row["source_url"], "date": row.get("date") or None})
        out.append(rec)
    return out


def load_groups(path) -> dict[str, dict]:
    out = {}
    for n, row in _rows(path):
        _require(n, row.get("name") and row.get("group"), "name veya group boş")
        _check_source(n, row)
        out[row["name"]] = {"group": row["group"], "evidence": row["evidence"],
                            "source_url": row["source_url"], "date": row.get("date") or None}
    return out


def load_cases(path) -> list[dict]:
    out = []
    for n, row in _rows(path):
        p = parse_code(row.get("code", ""))
        _require(n, p is not None, f"kod çözülemedi: '{row.get('code')}'")
        for lang in LANGS:
            _require(n, row.get(f"title_{lang}"), f"title_{lang} eksik")
        out.append({"id": row.get("id"), "code": row["code"], "key": p.key,
                    "title": {l: row[f"title_{l}"] for l in LANGS},
                    "text": {l: row.get(f"text_{l}", "") for l in LANGS},
                    "verified_date": row.get("verified_date") or None})
    return out
