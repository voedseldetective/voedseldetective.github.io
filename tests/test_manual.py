import tempfile
import unittest
from pathlib import Path

from build.manual import load_cases, load_establishments, load_groups

HEAD_E = "code,name,city,country,type,evidence,source_url,date\n"
ROOT = Path(__file__).resolve().parent.parent


class ManualTests(unittest.TestCase):
    def write(self, text):
        d = tempfile.mkdtemp()
        p = Path(d) / "f.csv"
        p.write_text(text, encoding="utf-8")
        return p

    def test_establishment_key(self):
        p = self.write(HEAD_E + "NL 371 EG,Hilton Foods Holland B.V.,ZAANDAM,NL,meat,official,https://x.example/,2026-11-18\n")
        [r] = load_establishments(p)
        self.assertEqual(r["key"], "NL-371")
        self.assertEqual((r["name"], r["city"], r["source_id"], r["date"]),
                         ("Hilton Foods Holland B.V.", "Zaandam", "manual", "2026-11-18"))

    def test_missing_source_url(self):
        p = self.write(HEAD_E + "NL 371 EG,Hilton Foods Holland B.V.,Zaandam,NL,meat,official,,2026-11-18\n")
        with self.assertRaisesRegex(ValueError, "satır 2"):
            load_establishments(p)

    def test_bad_code_and_evidence(self):
        with self.assertRaisesRegex(ValueError, "satır 2"):
            load_establishments(self.write(HEAD_E + "hello,X B.V.,A,NL,meat,official,https://x/,2026-11-18\n"))
        with self.assertRaisesRegex(ValueError, "satır 3"):
            load_establishments(self.write(HEAD_E
                + "NL 371 EG,X B.V.,A,NL,meat,official,https://x/,2026-11-18\n"
                + "NL 372 EG,X B.V.,A,NL,meat,community,https://x/,2026-11-18\n"))

    def test_person_is_private(self):
        p = self.write(HEAD_E + "NL 371 EG,\"Jansen, P.\",Zaandam,NL,meat,official,https://x/,2026-11-18\n")
        [r] = load_establishments(p)
        self.assertTrue(r["private"])
        self.assertIsNone(r["name"])

    def test_case_requires_all_titles(self):
        head = "id,code,title_nl,title_en,title_tr,text_nl,text_en,text_tr,verified_date\n"
        p = self.write(head + "kaas,NL Z0507 EG,Kaas,Cheese,,a,b,c,2026-11-18\n")
        with self.assertRaisesRegex(ValueError, "satır 2"):
            load_cases(p)

    def test_seed_files_load(self):
        est = load_establishments(ROOT / "elle" / "tesisler.csv")
        self.assertIn("MSC-C-50572", [e["key"] for e in est])
        groups = load_groups(ROOT / "elle" / "gruplar.csv")
        self.assertIn("DMK Deutsches Milchkontor GmbH", groups)
        self.assertEqual(load_cases(ROOT / "elle" / "vakalar.csv"), [])

    def test_gleif_groups(self):
        groups = load_groups(ROOT / "elle" / "gruplar.csv")
        g = groups["Storteboom Food Group B.V."]
        self.assertEqual(g["group"], "Boparan Private Office Limited")
        self.assertEqual(g["evidence"], "official")
        self.assertTrue(g["source_url"].startswith("https://search.gleif.org/#/record/"))
        self.assertEqual(groups["Nestlé Nederland B.V."]["group"], "Société des Produits Nestlé S.A. → Nestlé S.A.")
        self.assertNotIn("DOC Kaas B.V.", groups)  # lapsed LEI, not added until verified
