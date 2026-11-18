import json
import unittest
from pathlib import Path

from build.codes import candidate_keys, oval_key, parse_code

VECTORS = json.loads((Path(__file__).parent / "code_vectors.json").read_text(encoding="utf-8"))


class CodeTests(unittest.TestCase):
    def test_vectors(self):
        for v in VECTORS:
            with self.subTest(raw=v["raw"]):
                p = parse_code(v["raw"])
                self.assertEqual(p.kind if p else None, v["kind"])
                self.assertEqual(p.key if p else None, v["key"])
                self.assertEqual(candidate_keys(v["raw"]), v["candidates"])

    def test_region(self):
        self.assertEqual(parse_code("DE NI 010 EG").region, "NI")

    def test_oval_key_from_data(self):
        self.assertIsNone(oval_key("Z0507"))
        self.assertEqual(oval_key("NL Z0507 EG"), "NL-Z507")


if __name__ == "__main__":
    unittest.main()
