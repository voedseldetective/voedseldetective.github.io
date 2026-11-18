import json
import shutil
import tempfile
import unittest
from pathlib import Path

from build.build import main, merge
from build.cokz import parse_register
from build.manual import load_establishments, load_groups
from build.off import products_from_hits

ROOT = Path(__file__).resolve().parent.parent
FIX = ROOT / "tests" / "fixtures"


def fixture_data():
    est = (parse_register((FIX / "cokz_zuivel.html").read_text(encoding="utf-8"), "cokz_zuivel")
           + parse_register((FIX / "cokz_pak.html").read_text(encoding="utf-8"), "cokz_pak")
           + load_establishments(ROOT / "elle" / "tesisler.csv"))
    hits = json.loads((FIX / "off_page.json").read_text(encoding="utf-8"))["hits"]
    hits.append({"code": "4000000000001", "product_name": "Schlagsahne", "brands": ["Milbona"],
                 "emb_codes": ["DE NI 010 EG"], "countries_tags": ["en:germany"]})
    hits.append({"code": "4000000000002", "product_name": "Kaas zonder winkel", "brands": ["Zott"],
                 "emb_codes": ["NL Z0507 EG"], "countries_tags": ["en:netherlands"]})
    return est, products_from_hits(hits), load_groups(ROOT / "elle" / "gruplar.csv")


class BuildTests(unittest.TestCase):
    def setUp(self):
        est, prods, groups = fixture_data()
        self.out = merge(est, prods, groups, [], {"cokz_zuivel": {"url": "u", "date": "2026-11-04"}},
                         generated="2026-11-18")

    def test_vergeer_with_products_sorted(self):
        rec = self.out["codes"]["NL-Z507"]
        self.assertEqual((rec["kind"], rec["country"]), ("oval", "NL"))
        self.assertEqual([e["name"] for e in rec["establishments"]], ["Th. Vergeer en Zonen B.V."])
        self.assertEqual([p["chain"] for p in rec["products"]], ["Lidl", "Plus", None])
        self.assertNotIn("_raw_codes", rec["products"][0])
        self.assertNotIn("keys", rec["products"][0])

    def test_private_pack_station(self):
        rec = self.out["codes"]["EGGPACK-NL80026"]
        self.assertEqual(rec["kind"], "egg_pack")
        self.assertIsNone(rec["establishments"][0]["name"])

    def test_group_and_region(self):
        rec = self.out["codes"]["DE-NI10"]
        self.assertEqual(rec["group"]["group"], "DMK Group (Milram, Oldenburger)")
        self.assertEqual(rec["region"], "NI")
        self.assertEqual(rec["products"][0]["name"], "Schlagsahne")

    def test_msc_kind(self):
        self.assertEqual(self.out["codes"]["MSC-C-50572"]["kind"], "msc")

    def test_no_contact_data(self):
        text = json.dumps(self.out, ensure_ascii=False)
        self.assertNotIn("@", text)
        self.assertNotIn("+31", text)

    def test_main_offline_writes_json_and_report(self):
        d = Path(tempfile.mkdtemp())
        shutil.copy(FIX / "cokz_zuivel.html", d / "cokz_zuivel.html")
        shutil.copy(FIX / "cokz_pak.html", d / "cokz_pak.html")
        shutil.copy(FIX / "off_page.json", d / "off.json")
        out, report = d / "codes.json", d / "report.txt"
        main(["--offline", str(d), "--out", str(out), "--report", str(report)])
        data = json.loads(out.read_text(encoding="utf-8"))
        self.assertIn("NL-Z507", data["codes"])
        self.assertEqual(data["sources"]["cokz_zuivel"]["date"], "2026-11-04")
        self.assertEqual(data["sources"]["off"]["license"], "ODbL")
        self.assertIn("NL-Z507", data["codes"])
        self.assertIn("keys:", report.read_text(encoding="utf-8"))
