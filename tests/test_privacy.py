import unittest

from build.privacy import is_legal_entity, public_establishment


class PrivacyTests(unittest.TestCase):
    def test_legal_entities(self):
        for name in ["Th. Vergeer en Zonen B.V.", "FrieslandCampina Nederland B.V.",
                     "DMK Deutsches Milchkontor GmbH",
                     "Coöperatieve Zuivelonderneming CONO B.A.",
                     "Zuivelcoöperatie DeltaMilk B.A."]:
            with self.subTest(name=name):
                self.assertTrue(is_legal_entity(name))

    def test_natural_persons_and_partnerships(self):
        for name in ["Acht, M. van", "Beek, Vof Pluimveehouderij",
                     "Allers Agritrade & Productions, Mts.", "Jansen"]:
            with self.subTest(name=name):
                self.assertFalse(is_legal_entity(name))

    def test_partnership_beats_legal_token(self):
        self.assertFalse(is_legal_entity("Holding Jansen V.O.F."))

    def test_public_establishment_hides_private(self):
        e = public_establishment("Acht, M. van", "", "ST. OEDENRODE")
        self.assertIsNone(e["name"])
        self.assertIsNone(e["trade"])
        self.assertTrue(e["private"])
        self.assertEqual(e["city"], "St. Oedenrode")

    def test_city_title_case_keeps_dutch_s(self):
        self.assertEqual(public_establishment("X B.V.", "", "'S-HERTOGENBOSCH")["city"], "'s-Hertogenbosch")
        self.assertEqual(public_establishment("X B.V.", "", "'T ZANDT")["city"], "'t Zandt")

    def test_public_establishment_keeps_company(self):
        e = public_establishment("Th. Vergeer en Zonen B.V.", "Vergeer Holland", "REEUWIJK")
        self.assertEqual(e, {"name": "Th. Vergeer en Zonen B.V.", "trade": "Vergeer Holland",
                             "city": "Reeuwijk", "private": False})
