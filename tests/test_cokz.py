import unittest
from pathlib import Path

from build.cokz import SOURCES, parse_date, parse_register

FIX = Path(__file__).parent / "fixtures"


def read(name):
    return (FIX / name).read_text(encoding="utf-8")


class CokzTests(unittest.TestCase):
    def setUp(self):
        self.zuivel = {r["key"]: r for r in parse_register(read("cokz_zuivel.html"), "cokz_zuivel")}
        self.pak = {r["key"]: r for r in parse_register(read("cokz_pak.html"), "cokz_pak")}

    def test_vergeer(self):
        r = self.zuivel["NL-Z507"]
        self.assertEqual(r["name"], "Th. Vergeer en Zonen B.V.")
        self.assertEqual(r["trade"], "Vergeer Holland")
        self.assertEqual(r["city"], "Reeuwijk")
        self.assertFalse(r["private"])
        self.assertEqual((r["type"], r["evidence"], r["country"]), ("dairy", "official", "NL"))
        self.assertEqual(r["source_url"], SOURCES["cokz_zuivel"])

    def test_numeric_approval_numbers_skipped(self):
        self.assertEqual(sorted(self.zuivel), ["NL-Z461", "NL-Z507"])

    def test_egg_pack_private(self):
        r = self.pak["EGGPACK-NL80026"]
        self.assertIsNone(r["name"])
        self.assertTrue(r["private"])
        self.assertEqual(r["city"], "St. Oedenrode")
        self.assertEqual(r["type"], "egg_pack")

    def test_egg_pack_company(self):
        self.assertEqual(self.pak["EGGPACK-NL1005"]["name"], "Beek B.V., Eierhandel van")

    def test_no_address_fields(self):
        for r in list(self.zuivel.values()) + list(self.pak.values()):
            self.assertNotIn("Reewal", str(r))
            self.assertNotIn("2811", str(r))

    def test_parse_date(self):
        self.assertEqual(parse_date(read("cokz_zuivel.html")), "2026-11-04")
        self.assertEqual(parse_date(read("cokz_pak.html")), "2026-11-09")
        self.assertIsNone(parse_date("<p>geen datum</p>"))
