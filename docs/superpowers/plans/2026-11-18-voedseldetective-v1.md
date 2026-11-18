# Voedseldetective v1: Uygulama Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Kullanıcının girdiği ambalaj kodunu (oval AB kodu, MSC/ASC kodu, yumurta paketleme veya kabuk kodu) tesise, şirkete ve aynı kodu taşıyan ürünlere bağlayan; üç dilli (NL/EN/TR), yalnızca okunan statik bir web sitesi.

**Architecture:**
- **Veri hazırlama:** Python (yalnızca standart kütüphane) COKZ tablolarını, Open Food Facts verisini ve elle tutulan CSV dosyalarını birleştirir ve tek bir `site/data/codes.json` üretir.
- **Arayüz:** Düz HTML/JS. Hash ile yönlendirme yapar (`#/tr/kod/NL-Z507`), bu JSON'u okur ve dedektif dosyasını çizer. Sunucu yoktur.
- **Kod çözümleme:** Python ve JS'de aynı kurallarla ayrı ayrı yazılır. İkisinin uyumu ortak bir test vektörleri dosyasıyla garanti edilir.

**Tech Stack:** Python 3.14 (stdlib, `unittest`), Node 24 (`node --test`, yalnızca testler için), düz HTML/CSS/ES modules, GitHub Pages, GoatCounter (çerezsiz ölçüm).

**Spec:** `C:\Users\saids\gida-dedektifi\docs\2026-11-18-tasarim.md`

## Global Constraints

- **Bağımlılık:** Üçüncü parti kütüphane yok. Python yalnızca stdlib; JS'de npm paketi yok.
- **Dil:** NL (varsayılan), EN ve TR. Her arayüz metni üç dilde bulunur. Şirket ve ürün adları çevrilmez.
- **İfade kuralı:** "aynı ürün" ya da "aynı tarif" denmez. Oval kod için "aynı tesiste işlenmiş/paketlenmiş", MSC için "aynı sertifikalı tedarikçi" denir.
- **Sabit uyarı metni** (birebir kullanılır):
  - NL: `Een erkenningscode toont waar een product als laatste is verwerkt of verpakt. Dezelfde vestiging betekent niet hetzelfde product of recept.`
  - EN: `An approval code shows where a product was last processed or packed. The same facility does not mean the same product or recipe.`
  - TR: `Onay kodu, ürünün en son işlendiği veya paketlendiği tesisi gösterir. Aynı tesis, aynı ürün veya tarif anlamına gelmez.`
- **Gizlilik:** Tüzel kişilik biçimi açıkça belli değilse ad ve adres gösterilmez. Telefon, e-posta ve kişi adı hiçbir zaman veri dosyasına girmez. Adres yerine yalnızca şehir gösterilir.
- **Kaynak gösterimi:** Her kurulu kaydın `source_id`, `source_url` ve `date` alanları vardır. OFF için atıf: "Open Food Facts, ODbL".
- **Kanıt rozetleri:** `official` (Resmi kayıt), `company` (Şirket beyanı), `community` (Topluluk verisi), `verified` (Ambalajdan doğrulandı).
- **Market logosu ve marka görseli** kullanılmaz.
- **Ölçüm:** Çerez kullanılmaz. Olaylar: `visit`, `search`, `found`, `notfound`, `case_click`, `share`, `off_add`, `lang_<nl|en|tr>`.

## Review Focus

1. **Kullanıcı kodu farklı yazıyor:** küçük harf, boşluklu, `EG` eki yok, `EC`/`EU`/`CE` eki, `NL Z 0507 EG`, `nl-z0507`. Hepsi aynı anahtara gitmeli. → Task 1/2'deki ortak vektörler.
2. **Ek yazılmamış bir Hollanda kodu iki anlama gelebiliyor:** `NL 1005` hem et/oval kodu hem yumurta paketleme kodu olabilir. Her iki eşleşme de gösterilmeli. → Task 1 (`candidate_keys`), Task 9.
3. **Şahıs işletmesi kayıtları:** "Acht, M. van", V.O.F., Mts. adları asla görünmemeli. → Task 3 ve Task 6.
4. **Kayıtta olmayan ama geçerli bir kod** (ör. `DE NI 010 EG` için tesis verisi yok): yine de ülke, bölge ve kod türü açıklanmalı, OFF'a ekleme bağlantısı verilmeli. → Task 9.
5. **MSC alt lokasyon kodu** (`MSC-C-50572-3`) kendi kaydı yoksa ana kodun kaydına düşmeli. → Task 1 ve Task 9.

---

## Dosya yapısı

```
gida-dedektifi/
  build/
    codes.py          # kod çözümleme ve anahtar üretimi
    privacy.py        # tüzel kişi kontrolü, kamuya açık ad
    cokz.py           # COKZ HTML tablolarını okuma
    off.py            # Open Food Facts çekme ve market eşlemesi
    manual.py         # elle/*.csv yükleme ve doğrulama
    build.py          # birleştirme → site/data/codes.json + rapor (CLI)
    chains.json       # marka → market eşlemesi
  elle/
    tesisler.csv  gruplar.csv  vakalar.csv
  tests/
    code_vectors.json # Python ve JS için ortak kod vektörleri
    fixtures/         # cokz_zuivel.html, cokz_pak.html, off_page.json
    test_codes.py  test_privacy.py  test_cokz.py  test_off.py  test_manual.py  test_build.py
    js/codes.test.mjs  js/i18n.test.mjs  js/render.test.mjs
  site/
    index.html  style.css
    js/codes.js  js/i18n.js  js/regions.js  js/render.js  js/app.js
    data/codes.json   # üretilir
```

Testleri çalıştırma:
- Python: `python -m unittest discover -s tests -t .`
- JS: `node --test tests/js/`

---

### Task 1: Python kod çözümleme

**Files:**
- Create: `build/__init__.py`, `build/codes.py`, `tests/__init__.py`, `tests/code_vectors.json`, `tests/test_codes.py`, `.gitignore`
- İlk adım: `git init` (proje kökünde).

**Interfaces:**
- Produces:
  - `ParsedCode = dataclass(kind: str, country: str|None, key: str, display: str, region: str|None, extra: dict)`
    - `kind ∈ {"oval","msc","egg_pack","egg_shell"}`
  - `parse_code(raw: str) -> ParsedCode | None`: kesin tür
  - `candidate_keys(raw: str) -> list[str]`: belirsiz girişte olası tüm anahtarlar
  - `oval_key(raw: str) -> str | None`: veri tarafındaki (COKZ/OFF) oval kod metinleri için

**Anahtar kuralları:**
- **Oval:**
  1. Büyük harfe çevir.
  2. `EEG|EG|EC|EU|CE|EK|WE|EF|EY|EZ` son ekini at.
  3. Boşluk, `.`, `-`, `/` karakterlerini at.
  4. İlk 2 harf ülke, kalanı gövde.
  5. Gövde `^([A-Z]*)0*(\d+)([A-Z]*)$` kalıbına uyarsa `harfler + int(sayı) + son harfler` olur. Uymazsa olduğu gibi kalır.
  6. Anahtar: `"{CC}-{gövde}"`.
- **MSC/ASC:** `MSC-C-50572` biçiminde; alt lokasyon varsa `MSC-C-50572-3`. `extra["base"]="MSC-C-50572"`.
- **Yumurta paketleme:** `EGGPACK-NL{int}`.
- **Yumurta kabuğu:** `^[0-3]-?[A-Z]{2}-?\d{5,}`.
  - `key="EGGSHELL"`
  - `extra={"system": int, "country": "NL"}`
- **Bölge:** Alman kodlarında gövdenin baş harfleri (`NI`, `BY`, `NW`, `SH`, `SN`, `RP`, `HE`, `MV`, `TH`, `BE`, `EV`…) `region` alanına yazılır. Bölge adı JS tarafında çevrilir.
- **Belirsiz giriş** (`EG` vb. eki yok, ülke `NL`, gövde yalnızca rakam): `candidate_keys` hem `NL-{int}` hem `EGGPACK-NL{int}` döner.

- [ ] **Step 1: `tests/code_vectors.json` dosyasını yaz** (JS de aynı dosyayı kullanacak). Her kayıt: `{"raw","kind","key","candidates"}`. Örnekler:

```json
[
 {"raw":"NL Z0507 EG","kind":"oval","key":"NL-Z507","candidates":["NL-Z507"]},
 {"raw":"nl z 0507 ec","kind":"oval","key":"NL-Z507","candidates":["NL-Z507"]},
 {"raw":"NL-Z0507","kind":"oval","key":"NL-Z507","candidates":["NL-Z507"]},
 {"raw":"NL Z 0217 B EG","kind":"oval","key":"NL-Z217B","candidates":["NL-Z217B"]},
 {"raw":"DE NI-010 EC","kind":"oval","key":"DE-NI10","candidates":["DE-NI10"]},
 {"raw":"DE NI 010 EU","kind":"oval","key":"DE-NI10","candidates":["DE-NI10"]},
 {"raw":"BE M157-II EG","kind":"oval","key":"BE-M157II","candidates":["BE-M157II"]},
 {"raw":"NL 371 EG","kind":"oval","key":"NL-371","candidates":["NL-371"]},
 {"raw":"NL 1005","kind":"oval","key":"NL-1005","candidates":["NL-1005","EGGPACK-NL1005"]},
 {"raw":"NL80026","kind":"oval","key":"NL-80026","candidates":["NL-80026","EGGPACK-NL80026"]},
 {"raw":"msc-c-50572","kind":"msc","key":"MSC-C-50572","candidates":["MSC-C-50572"]},
 {"raw":"MSC-C-50572-3","kind":"msc","key":"MSC-C-50572-3","candidates":["MSC-C-50572-3","MSC-C-50572"]},
 {"raw":"0-NL-4195701","kind":"egg_shell","key":"EGGSHELL","candidates":["EGGSHELL"]},
 {"raw":"1NL4195701","kind":"egg_shell","key":"EGGSHELL","candidates":["EGGSHELL"]},
 {"raw":"hello","kind":null,"key":null,"candidates":[]},
 {"raw":"","kind":null,"key":null,"candidates":[]}
]
```

- [ ] **Step 2: Testi yaz.** `tests/test_codes.py`:
  - `test_vectors`: her vektör için `parse_code(raw)` sonucunun `kind` ve `key` alanlarının (None ise None) eşleştiğini, ve `candidate_keys(raw) == candidates` olduğunu kontrol eder.
  - `test_region`: `parse_code("DE NI 010 EG").region == "NI"`.
  - `test_oval_key_from_data`: `oval_key("Z0507")` için ülke yoksa `None` döner. `oval_key("NL Z0507 EG") == "NL-Z507"`.
- [ ] **Step 3: Çalıştır ve testin başarısız olduğunu gör.** `python -m unittest tests.test_codes -v` → ImportError.
- [ ] **Step 4: `build/codes.py` dosyasını yukarıdaki kurallara göre yaz.**
- [ ] **Step 5: Testi çalıştır.** → hepsi PASS.
- [ ] **Step 6: Commit.** `git add -A && git commit -m "feat: code parsing with shared vectors"`

### Task 2: JS kod çözümleme (aynı vektörler)

**Files:** Create `site/js/codes.js`, `tests/js/codes.test.mjs`

**Interfaces:**
- Produces:
  - `export function parseCode(raw: string): {kind, country, key, display, region, extra} | null`
  - `export function candidateKeys(raw: string): string[]`
  - Kurallar Task 1 ile aynıdır.

- [ ] **Step 1: Testi yaz.** `tests/js/codes.test.mjs` `tests/code_vectors.json` dosyasını okur ve her vektör için `parseCode(raw)?.kind ?? null`, `?.key ?? null` ve `candidateKeys(raw)` değerlerinin beklenenle eşleştiğini kontrol eder.
- [ ] **Step 2: Çalıştır.** `node --test tests/js/` → FAIL (modül yok).
- [ ] **Step 3: `site/js/codes.js` dosyasını yaz.**
- [ ] **Step 4: Çalıştır.** → PASS.
- [ ] **Step 5: Commit.** `feat: JS code parsing matching Python vectors`

### Task 3: Gizlilik filtresi

**Files:** Create `build/privacy.py`, `tests/test_privacy.py`

**Interfaces:**
- Produces:
  - `is_legal_entity(name: str) -> bool`
  - `public_establishment(name: str, trade: str, city: str) -> dict`
    - tüzel kişiyse: `{"name": name, "trade": trade or None, "city": city.title(), "private": False}`
    - değilse: `{"name": None, "trade": None, "city": city.title(), "private": True}`

**Kurallar:**
- **True olur:** adda (büyük/küçük harf duyarsız, kelime sınırıyla) şunlardan biri geçiyorsa: `B.V.`, `BV`, `N.V.`, `NV`, `Coöperatie`, `Cooperatie`, `U.A.`, `Stichting`, `GmbH`, `AG`, `SA`, `S.A.`, `Ltd`, `S.p.A.`, `SpA`, `A/S`, `AB`, `KG`, `Holding`.
- **False olur:** adda `V.O.F.`, `Vof`, `Mts.`, `Maatschap`, `eenmanszaak` geçiyorsa (bunlar her durumda önce gelir), ya da ad `^[^,]+, [A-Z]\.` biçimindeyse ("Acht, M. van").

- [ ] **Step 1: Testi yaz.**
  - True: `Th. Vergeer en Zonen B.V.`, `FrieslandCampina Nederland B.V.`, `DMK Deutsches Milchkontor GmbH`.
  - False: `Acht, M. van`, `Beek, Vof Pluimveehouderij`, `Allers Agritrade & Productions, Mts.`, `Jansen`.
  - `public_establishment("Acht, M. van","","ST. OEDENRODE")["name"] is None` ve `["city"] == "St. Oedenrode"`.
- [ ] **Step 2: Çalıştır.** → FAIL.
- [ ] **Step 3: `build/privacy.py` dosyasını yaz.**
- [ ] **Step 4: Çalıştır.** → PASS.
- [ ] **Step 5: Commit.** `feat: privacy filter for establishment names`

### Task 4: COKZ okuyucu

**Files:**
- Create `build/cokz.py`, `tests/test_cokz.py`
- Fixtures: `tests/fixtures/cokz_zuivel.html`, `tests/fixtures/cokz_pak.html`. Gerçek sayfadan 3'er satırlık küçük kesitler alınır: zuivel listesinden Vergeer Z0507 ve Bouter Z0461 ile 6 haneli sayısal numaralı bir satır; pakstation listesinden NL1005 Beek B.V. ve NL80026 Acht.

**Interfaces:**
- Consumes: `codes.oval_key`, `privacy.public_establishment`
- Produces:
  - `SOURCES = {"cokz_zuivel": url, "cokz_boerderij": url, "cokz_pak": url}`
    - `cokz_zuivel`: `https://cokz.nl/zuivel/register/register-erkende-zuivelbedrijven/`
    - `cokz_pak`: `https://cokz.nl/pluimvee-en-eieren/register/register-erkende-pakstations/`
    - `cokz_boerderij`: URL'yi uygulayıcı COKZ zuivel menüsünden alır ("erkende boerderij zuivelbedrijven").
  - `parse_register(html: str, source_id: str) -> list[dict]`. Her kayıt: `public_establishment(...)` alanları + `{"key", "country":"NL", "type": "dairy"|"egg_pack", "evidence":"official", "source_id", "source_url"}`.
    - Anahtar: zuivel kaynakları için `"NL " + approval_no` metninin `oval_key` değeri. Pak için `"EGGPACK-NL{int}"`.
    - `Z` ile başlamayan zuivel numaraları (`006448` vb.; ihracat ve depolama kayıtları) atlanır.
  - `parse_date(html: str) -> str | None`: sayfadaki "Datum"un yanındaki tarih (ör. `4 november 2026`), ISO biçimine çevrilmiş.
  - `fetch(url: str) -> str`: `urllib`, User-Agent `Voedseldetective-build/0.1`, 60 sn zaman aşımı, 3 deneme.

- [ ] **Step 1: Testi yaz.**
  - Zuivel fixture'ında `NL-Z507` kaydının adı `Th. Vergeer en Zonen B.V.`, şehri `Reeuwijk`, `private` değeri False.
  - Sayısal numaralı satır atlanmış.
  - Pak fixture'ında `EGGPACK-NL80026` kaydında `name is None` ve `private` True.
  - `parse_date` → `"2026-11-04"`.
- [ ] **Step 2: Çalıştır.** → FAIL.
- [ ] **Step 3: Yaz.** Satırlar `<tr>` ve `<td>` ile regex yerine stdlib `html.parser.HTMLParser` kullanılarak okunur. Başlık satırı atlanır. Hollandaca ay adları için bir sözlük kullanılır.
- [ ] **Step 4: Çalıştır.** → PASS.
- [ ] **Step 5: Commit.** `feat: COKZ register parser`

### Task 5: Open Food Facts çekme ve market eşlemesi

**Files:**
- Create: `build/off.py`, `build/chains.json`, `tests/test_off.py`
- Fixture: `tests/fixtures/off_page.json` (search-a-licious yanıt biçiminde 4 ürün):
  - Milbona, `NL Z0507 EG`
  - Plus, `NL Z 0507 EG`
  - FSC kodlu bir ürün
  - kodsuz bir ürün

**Interfaces:**
- Consumes: `codes.parse_code`
- Produces:
  - `chains.json`: `{"AH":["Albert Heijn","AH","AH Basic","AH Biologisch","AH Excellent","AH Terra","De Zaanse Hoeve"],"Jumbo":["Jumbo"],"Lidl":["Milbona","Lidl","Pilos","Dulano","Linessa","Ocean Sea","Nixe","Cremosano","Goldessa","1001 delights"],"Aldi":["Milsani","Aldi","Westminster","Landmolen","Golden Seafood","Optifit"],"Plus":["Plus"],"Dirk":["1 de Beste","Dirk"]}`
  - `map_chain(brands: list[str]) -> str | None`: büyük/küçük harf ve boşluk duyarsız tam eşleşme. İlk eşleşen market döner.
  - `products_from_hits(hits: list[dict]) -> list[dict]`: her ürün için `{"barcode","name","brand","chain","country","keys":[...],"evidence":"community","source_id":"off","source_url":"https://world.openfoodfacts.org/product/{barcode}"}`.
    - `keys`: `emb_codes` içinde `parse_code` ile `oval` ya da `msc` türüne çözülenler.
    - Anahtarı olmayan ürün atılır.
    - `brand`: ilk marka.
    - `country`: `countries_tags` içindeki ilk ülke, `en:` öneki atılmış.
  - `fetch_products(brands: list[str], fetch_json) -> list[dict]`:
    - search-a-licious sorgusu: `brands:"X" AND emb_codes:* AND countries_tags:"en:netherlands"`, sayfa boyutu 100, tüm sayfalar, istekler arasında 1 sn.
    - Ayrıca her anahtar için bulunan ham kodlarla `emb_codes:"<ham>"` sorgusu yapılır (ülke filtresi yok), böylece yurt dışındaki kardeş ürünler de bulunur.
    - Aynı barkod iki kez eklenmez.
    - `fetch_json` dışarıdan verilir; testte sahte bir fonksiyon kullanılır.

- [ ] **Step 1: Testi yaz.**
  - `map_chain(["milbona"]) == "Lidl"`, `map_chain(["Zott"]) is None`.
  - Fixture'dan `products_from_hits` 2 ürün döner, ikisinin de `keys` değeri `["NL-Z507"]`.
  - Sahte `fetch_json` ile `fetch_products` aynı barkodu iki kez döndürmez.
- [ ] **Step 2: Çalıştır.** → FAIL.
- [ ] **Step 3: Yaz.**
- [ ] **Step 4: Çalıştır.** → PASS.
- [ ] **Step 5: Commit.** `feat: Open Food Facts import and chain mapping`

### Task 6: Elle tutulan CSV dosyaları

**Files:** Create `build/manual.py`, `elle/tesisler.csv`, `elle/gruplar.csv`, `elle/vakalar.csv`, `tests/test_manual.py`

**CSV sütunları (UTF-8, virgülle ayrılmış, başlık satırı var):**
- `tesisler.csv`: `code,name,city,country,type,evidence,source_url,date`
- `gruplar.csv`: `name,group,evidence,source_url,date`. `name`, tesis adıyla birebir eşleşir.
- `vakalar.csv`: `id,code,title_nl,title_en,title_tr,text_nl,text_en,text_tr,verified_date`

**Başlangıç satırları** (sohbette doğrulananlar):
- `tesisler.csv`:
  - `DE NI 010 EG,DMK Deutsches Milchkontor GmbH,Zeven,DE,dairy,company,https://www.dmk.de/,2026-11-18`
  - `NL 371 EG,Hilton Foods Holland B.V.,Zaandam,NL,meat,official,https://www.nvwa.nl/…lijsten…,2026-11-18`
  - `NL 5001 EG,Storteboom Food Group B.V.,Zeewolde,NL,meat,official,…,2026-11-18`
  - `MSC-C-50572,FishPartners B.V.,Spakenburg,NL,fish,official,https://cert.msc.org/SupplierDirectory,2026-11-18`
- `gruplar.csv`: `DMK Deutsches Milchkontor GmbH,DMK Group (Milram, Oldenburger),company,https://www.dmk.de/,2026-11-18`
- `vakalar.csv`: boş (yalnızca başlık). Kullanıcı ambalaj doğrulaması yaptıkça doldurur.

**Interfaces:**
- Consumes: `codes.parse_code`, `privacy.public_establishment`
- Produces:
  - `load_establishments(path) -> list[dict]`: Task 4'teki kayıtla aynı alanlar; `source_id="manual"`.
  - `load_groups(path) -> dict[str, dict]`
  - `load_cases(path) -> list[dict]`
  - `validate_row` hataları `ValueError("satır N: …")` fırlatır:
    - çözülemeyen kod
    - `evidence` değeri `official|company|verified` dışında
    - `source_url` boş
    - bir `vakalar` satırında başlık dillerinden biri eksik

- [ ] **Step 1: Testi yaz.**
  - Geçici bir CSV'de `NL 371 EG` satırından gelen kaydın `key` değeri `"NL-371"`.
  - Kaynak URL'si boş bir satır `ValueError` fırlatır ve mesajda `"satır 2"` geçer.
  - Ad `"Jansen, P."` olan bir satır `private=True` olarak gelir.
- [ ] **Step 2: Çalıştır.** → FAIL.
- [ ] **Step 3: Yaz. Başlangıç CSV'lerini oluştur.**
- [ ] **Step 4: Çalıştır.** → PASS.
- [ ] **Step 5: Commit.** `feat: manual CSV sources`

### Task 7: Birleştirme ve `codes.json`

**Files:** Create `build/build.py`, `tests/test_build.py`

**Interfaces:**
- Consumes: Task 4, 5 ve 6.
- Produces:
  - `merge(establishments: list[dict], products: list[dict], groups: dict, cases: list[dict], sources: dict) -> dict`. Çıktı:

```json
{"generated":"YYYY-MM-DD",
 "sources":{"cokz_zuivel":{"url":"…","date":"2026-11-04"},"off":{"url":"https://world.openfoodfacts.org","license":"ODbL"}, "manual":{}},
 "codes":{"NL-Z507":{"kind":"oval","country":"NL","region":null,
     "establishments":[{"name":"Th. Vergeer en Zonen B.V.","trade":"Vergeer Holland","city":"Reeuwijk","private":false,"type":"dairy","evidence":"official","source_id":"cokz_zuivel","source_url":"…"}],
     "group":null,
     "products":[{"barcode":"20968090","name":"Jong 30+ Kaas Plakken","brand":"Milbona","chain":"Lidl","country":"netherlands","evidence":"community","source_url":"…"}]}},
 "cases":[…]}
```

**Kurallar:**
- Bir ürün `keys` listesindeki her anahtarın altına eklenir.
- Grup, tesis adına göre bağlanır.
- Yalnızca ürünü olan ve tesisi olmayan anahtarlar da yazılır (`establishments: []`).
- Ürünler önce `chain` (marketler önce, `null` sonra), sonra `brand` alanına göre sıralanır.
- `main(argv)` komut satırı:
  - `python -m build.build` her şeyi çeker ve `site/data/codes.json` dosyasını yazar.
  - Çıktıyı `build/report.txt` dosyasına yazar: anahtar sayısı, tesisli/tesissiz anahtar sayısı, gizlenen (private) kayıt sayısı, önceki `codes.json` ile farklar (eklenen/silinen anahtarlar).
  - `--offline DIR` seçeneği: COKZ HTML ve OFF JSON ağdan değil, verilen klasördeki dosyalardan okunur (test ve tekrar için).

- [ ] **Step 1: Testi yaz.** Fixture verileriyle `merge`:
  - `NL-Z507` altında 1 tesis ve 2 ürün; ürünlerin `chain` değerleri `["Lidl","Plus"]`.
  - Gizlenen pakstation kaydında `name is None`.
  - `DE-NI10` altında `gruplar.csv`'deki grup var.
  - `json.dumps` çıktısında `@` ve `+31` karakterleri geçmiyor (kişisel iletişim bilgisi sızmadığının kontrolü).
- [ ] **Step 2: Çalıştır.** → FAIL.
- [ ] **Step 3: Yaz.**
- [ ] **Step 4: Çalıştır.** → PASS. Ardından gerçek veriyle: `python -I -X utf8 -m build.build`. Beklenen: `report.txt` dosyasında 200'den fazla anahtar olması, ve `NL-Z507` anahtarı altında Vergeer, Milbona ve Plus'ın görünmesi.
- [ ] **Step 5: Commit.** `site/data/codes.json` dahil. Mesaj: `feat: build pipeline producing codes.json`

### Task 8: Üç dilli metinler ve bölge adları

**Files:** Create `site/js/i18n.js`, `site/js/regions.js`, `tests/js/i18n.test.mjs`

**Interfaces:**
- Produces:
  - `export const STRINGS = {nl:{…}, en:{…}, tr:{…}}`
  - `export function t(lang, key, vars={}) -> string`: `{name}` biçimindeki yer tutucular doldurulur. Anahtar o dilde yoksa NL değeri kullanılır.
  - `export function pickLang(navigatorLanguages: string[]) -> "nl"|"en"|"tr"`
  - `regions.js`:
    - `export const COUNTRIES = {NL:{nl,en,tr}, DE:…, BE:…, FR:…, IT:…, ES:…, DK:…, AT:…, PL:…, IE:…, GB:…}`
    - `export const DE_STATES = {NI:{…}, BY, NW, BW, HE, RP, SL, SH, HH, HB, MV, BB, BE, SN, ST, TH}`. Not: oval kodlardaki `EV` ön eki eyalet değil, "AB/EV onaylı tesis" anlamına gelir; bu şekilde açıklanır.

**Zorunlu anahtarlar** (üç dilde de bulunmalı):
- Genel: `tagline`, `search_placeholder`, `search_button`, `where_code`, `cases_title`
- Dosya adımları: `step_code`, `step_facility`, `step_group`, `step_products`
- Kanıt rozetleri: `badge_official`, `badge_company`, `badge_community`, `badge_verified`
- Uyarı ve sonuçlar: `disclaimer` (Global Constraints'teki metnin birebir aynısı), `private_facility`, `not_found`, `off_add`, `share`, `report_error`, `egg_shell_info`, `egg_shell_none`, `msc_note`
- Sayfalar ve diğer: `about_title`, `about_body`, `sources_title`, `license_off`, `takedown`, `kind_oval`, `kind_msc`, `kind_egg_pack`, `type_dairy`, `type_meat`, `type_fish`, `type_egg_pack`

**Sabit kopya** (birebir):
- `msc_note`: aynı sertifikalı tedarikçi ≠ aynı fabrika.
  - NL: `Een MSC-code toont het gecertificeerde bedrijf, niet per se de fabriek.`
  - EN: `An MSC code shows the certified company, not necessarily the factory.`
  - TR: `MSC kodu sertifikalı şirketi gösterir, fabrikayı göstermeyebilir.`
- `private_facility`:
  - NL: `Geregistreerd bedrijf (eenmanszaak of personenvennootschap) – naam niet getoond`
  - EN: `Registered business (sole trader or partnership) – name not shown`
  - TR: `Kayıtlı işletme (şahıs işletmesi veya ortaklık) – ad gösterilmiyor`

- [ ] **Step 1: Testi yaz.**
  - Her dilin anahtar kümesi zorunlu listeyi içeriyor ve diğer dillerle aynı.
  - `disclaimer` değerleri Global Constraints'tekiyle birebir aynı.
  - `pickLang(["tr-TR"]) == "tr"`, `pickLang(["de-DE"]) == "nl"`.
  - `t("en","off_add",{})` boş değil.
- [ ] **Step 2: Çalıştır.** → FAIL.
- [ ] **Step 3: Yaz.** Metinler sade ve kısa olur. "Aynı ürün" ifadesi geçmez.
- [ ] **Step 4: Çalıştır.** → PASS.
- [ ] **Step 5: Commit.** `feat: NL/EN/TR strings and region names`

### Task 9: Dedektif dosyası çizimi (saf fonksiyonlar)

**Files:** Create `site/js/render.js`, `tests/js/render.test.mjs`

**Interfaces:**
- Consumes: `codes.js` (`parseCode`, `candidateKeys`), `i18n.js` (`t`), `regions.js`
- Produces (hepsi HTML metni döner; veriden gelen her metin kaçırılır):
  - `export function lookup(data, raw): {parsed, matches: [{key, record}]}`
    - `candidateKeys` sırasıyla `data.codes` içinde aranır.
    - MSC alt kodunun kaydı yoksa `extra.base` anahtarı denenir.
  - `export function renderDossier(lang, parsed, matches, data) -> string`
    - **① Kod:** tür, ülke ve bölge adı.
    - **② Tesis:** ad (private ise `private_facility` metni), şehir, kanıt rozeti, kaynak bağlantısı ve tarihi.
    - **③ Grup:** yalnızca varsa.
    - **④ Ürünler:** markete göre gruplanır.
    - **Uyarı:** her zaman `disclaimer`. MSC ise ayrıca `msc_note`.
    - **Birden çok eşleşme** (belirsiz giriş): her eşleşme ayrı bir dosya bölümü olarak gösterilir.
  - `export function renderNotFound(lang, parsed) -> string`
    - Kod çözüldüyse: tür, ülke ve bölge açıklaması + `off_add` bağlantısı (`https://world.openfoodfacts.org/`).
    - Çözülemediyse: `where_code` yardımı.
  - `export function renderEggShell(lang, parsed) -> string`: üretim biçimi (0/1/2/3), ülke ve `egg_shell_none`.
  - `export function renderHome(lang, cases) -> string`
  - `export function escapeHtml(s) -> string`

- [ ] **Step 1: Testi yaz.** Küçük bir sahte `data` nesnesiyle:
  1. `lookup(data,"nl z0507 eg")` bir eşleşme döner; `renderDossier("tr",…)` çıktısında `Th. Vergeer en Zonen B.V.`, `Milbona`, `Plus` ve TR `disclaimer` metni geçer.
  2. `lookup(data,"NL 1005")`: data'da hem `NL-1005` hem `EGGPACK-NL1005` varsa 2 eşleşme döner.
  3. Private tesiste NL `private_facility` metni görünür; adı geçmez.
  4. `lookup(data,"MSC-C-50572-3")` ana kodun kaydını bulur; çıktıda `msc_note` geçer.
  5. `renderNotFound("en", parseCode("DE NI 010 EG"))` çıktısında `Lower Saxony` ve OFF bağlantısı geçer.
  6. Ürün adı `<img src=x onerror=alert(1)>` olduğunda çıktıda `<img` geçmez.
  7. `renderEggShell("nl", parseCode("0-NL-4195701"))` organik üretimi anlatır ve çiftlik adı içermez.
- [ ] **Step 2: Çalıştır.** → FAIL.
- [ ] **Step 3: Yaz.**
- [ ] **Step 4: Çalıştır.** → PASS.
- [ ] **Step 5: Commit.** `feat: dossier rendering`

### Task 10: Uygulama kabuğu, yönlendirme ve ölçüm

**Files:** Create `site/index.html`, `site/style.css`, `site/js/app.js`

**Interfaces:**
- Consumes: Task 8 ve 9; `site/data/codes.json`.
- Produces:
  - **Rotalar:** `#/{lang}`, `#/{lang}/kod/{KEY}`, `#/{lang}/over`. Arama yapınca adres `#/{lang}/kod/{encodeURIComponent(raw normalized display)}` olarak güncellenir.
  - **Dil:** ilk girişte `pickLang(navigator.languages)` kullanılır. Seçilen dil `localStorage` içinde saklanır; okuma ve yazma `try/catch` içinde yapılır. URL'deki dil her zaman önceliklidir.
  - **Paylaş:** `navigator.share` varsa onunla, yoksa panoya kopyalanır. Paylaşılan adres mevcut dilde ve mevcut kodla olur.
  - **Ölçüm:** `track(event)` fonksiyonu GoatCounter'a `window.goatcounter?.count({path: event, event: true})` çağrısı yapar. GoatCounter yüklenmemişse hiçbir şey yapmaz. GoatCounter betiği `index.html` içine bir yer tutucu kod adıyla eklenir; gerçek kod Task 11'de yazılır.
  - **Görünüm:** mobil öncelikli, tek sütun. `<html lang>` dile göre güncellenir. Kanıt rozetleri renk ve metinle gösterilir (yalnızca renkle değil). "Hakkında/Kaynaklar" sayfasında yöntem, lisans atfı ve kaldırma talebi e-postası bulunur (e-posta adresi için yer tutucu: `REPLACE_CONTACT_EMAIL`).

- [ ] **Step 1: Yerel sunucuyla elle doğrula.** `python -m http.server 8000 -d site` komutunu çalıştır ve şunları kontrol et:
  - (a) `http://localhost:8000/#/tr/kod/NL-Z507` Türkçe dosyayı Vergeer, Milbona ve Plus ile gösteriyor.
  - (b) `NL 1005` araması iki bölüm gösteriyor.
  - (c) `xyz` araması yardım ekranını gösteriyor.
  - (d) Dil seçici NL/EN/TR arasında geçiyor ve adres güncelleniyor.
  - (e) Ekran 360 piksel genişlikte yatay kaydırma olmadan düzgün görünüyor.
  - (f) Tarayıcı konsolunda hata yok.
- [ ] **Step 2: Tüm testleri çalıştır.** `python -m unittest discover -s tests -t . && node --test tests/js/` → hepsi PASS.
- [ ] **Step 3: Commit.** `feat: app shell, routing, analytics hooks`

### Task 11: Yayın (kullanıcıyla birlikte)

**Files:** Modify `site/index.html` (GoatCounter kodu), `site/js/i18n.js` (`REPLACE_CONTACT_EMAIL`). Create `README.md`: güncelleme adımları — `python -m build.build`, raporu kontrol et, commit, push.

- [ ] **Step 1: Kullanıcının hesap açması.** Kullanıcı şunları açar:
  - ücretsiz bir GitHub hesabı
  - ücretsiz bir GoatCounter hesabı (site kodu `voedseldetective`)
  - genel bir iletişim e-postası

  Bu hesapların bilgileri kullanıcıdan alınır. Hesapları asistan açmaz.
- [ ] **Step 2: Yer tutucuları doldur.** Testleri tekrar çalıştır → PASS.
- [ ] **Step 3: GitHub'a yükle ve Pages'i aç.** Kullanıcı onay verdikten sonra herkese açık bir depo oluşturulur (veri ODbL olduğu için açık olabilir) ve GitHub Pages `site/` klasöründen yayınlanır. Yayın adresi açılıp Task 10'daki (a)-(f) kontrolleri canlı sitede tekrarlanır.
- [ ] **Step 4: Yayın öncesi kontrol listesi** (tasarım §15). Şunların tamamlandığı kullanıcıyla teyit edilir:
  - BOIP ve Instagram kontrolü
  - COKZ ve NVWA yeniden kullanım şartları
  - vakaların ambalajla doğrulanması
  - Hollandaca metinlerin bir anadili Hollandaca okuyucu tarafından okunması
