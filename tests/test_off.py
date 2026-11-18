import json
import unittest
from pathlib import Path

from build.off import fetch_products, map_chain, products_from_hits, rekey

PAGE = json.loads((Path(__file__).parent / "fixtures" / "off_page.json").read_text(encoding="utf-8"))


class OffTests(unittest.TestCase):
    def test_map_chain(self):
        self.assertEqual(map_chain(["milbona"]), "Lidl")
        self.assertEqual(map_chain(["  AH  basic "]), "AH")
        self.assertIsNone(map_chain(["Zott"]))
        self.assertIsNone(map_chain([]))

    def test_products_from_hits(self):
        products = products_from_hits(PAGE["hits"])
        self.assertEqual([p["barcode"] for p in products], ["20968090", "8719587000001"])
        self.assertEqual([p["keys"] for p in products], [["NL-Z507"], ["NL-Z507"]])
        self.assertEqual([p["chain"] for p in products], ["Lidl", "Plus"])
        p = products[0]
        self.assertEqual((p["brand"], p["country"], p["evidence"], p["source_id"]),
                         ("Milbona", "netherlands", "community", "off"))
        self.assertEqual(p["source_url"], "https://world.openfoodfacts.org/product/20968090")

    def test_fetch_products_dedupes_and_follows_codes(self):
        queries = []

        def fake_fetch(query, page):
            queries.append(query)
            return PAGE

        products = fetch_products(["Milbona", "Plus"], fake_fetch, sleep=lambda s: None)
        barcodes = [p["barcode"] for p in products]
        self.assertEqual(sorted(barcodes), ["20968090", "8719587000001"])
        self.assertIn('brands:"Milbona" AND emb_codes:* AND countries_tags:"en:netherlands"', queries)
        self.assertIn('emb_codes:"NL Z0507 EG"', queries)
        self.assertIn('emb_codes:"NL Z 0507 EG"', queries)


class RekeyTests(unittest.TestCase):
    def test_rekey_recomputes_stale_keys(self):
        stale = [{"barcode": "1", "keys": ["BE-L352EG"], "_raw_codes": ["BE L352 EG/EC"]},
                 {"barcode": "2", "keys": ["X"], "_raw_codes": ["FSC-C1"]}]
        self.assertEqual([p["keys"] for p in rekey(stale)], [["BE-L352"]])
