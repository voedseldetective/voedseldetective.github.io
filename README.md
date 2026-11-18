# Voedseldetective

Static, read-only site (NL/EN/TR) that links the approval code on a food pack
(EU oval mark, MSC/ASC, egg packing station) to the registered facility and to
other products carrying the same code.

## Update the data

```sh
python -X utf8 -m build.build          # downloads COKZ + Open Food Facts (~10 min)
cat build/report.txt                    # check counts and added/removed keys
git add site/data/codes.json && git commit -m "data: refresh" && git push
```

Re-run from the last download without network: `python -m build.build --offline build/cache`.

Hand-curated data lives in `elle/` (`tesisler.csv`, `gruplar.csv`, `vakalar.csv`).
Every row needs a `source_url`; names without a legal form (B.V., GmbH, …) are hidden.

## Tests

```sh
python -m unittest discover -s tests -t .
node --test "tests/js/*.test.mjs"
```

## Run locally

```sh
python -m http.server 8000 -d site      # open http://localhost:8000
```

## Data and licences

Product data: Open Food Facts, ODbL. Establishment data: COKZ registers, NVWA lists.
