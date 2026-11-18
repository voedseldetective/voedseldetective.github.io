// Country and German state names for explaining a code. Only names are translated.
export const COUNTRIES = {
  NL: { nl: "Nederland", en: "Netherlands", tr: "Hollanda" },
  DE: { nl: "Duitsland", en: "Germany", tr: "Almanya" },
  BE: { nl: "België", en: "Belgium", tr: "Belçika" },
  FR: { nl: "Frankrijk", en: "France", tr: "Fransa" },
  IT: { nl: "Italië", en: "Italy", tr: "İtalya" },
  ES: { nl: "Spanje", en: "Spain", tr: "İspanya" },
  DK: { nl: "Denemarken", en: "Denmark", tr: "Danimarka" },
  AT: { nl: "Oostenrijk", en: "Austria", tr: "Avusturya" },
  PL: { nl: "Polen", en: "Poland", tr: "Polonya" },
  IE: { nl: "Ierland", en: "Ireland", tr: "İrlanda" },
  GB: { nl: "Verenigd Koninkrijk", en: "United Kingdom", tr: "Birleşik Krallık" },
  UK: { nl: "Verenigd Koninkrijk", en: "United Kingdom", tr: "Birleşik Krallık" },
  LU: { nl: "Luxemburg", en: "Luxembourg", tr: "Lüksemburg" },
  PT: { nl: "Portugal", en: "Portugal", tr: "Portekiz" },
  GR: { nl: "Griekenland", en: "Greece", tr: "Yunanistan" },
  EL: { nl: "Griekenland", en: "Greece", tr: "Yunanistan" },
  SE: { nl: "Zweden", en: "Sweden", tr: "İsveç" },
  FI: { nl: "Finland", en: "Finland", tr: "Finlandiya" },
  CZ: { nl: "Tsjechië", en: "Czechia", tr: "Çekya" },
  HU: { nl: "Hongarije", en: "Hungary", tr: "Macaristan" },
  LT: { nl: "Litouwen", en: "Lithuania", tr: "Litvanya" },
  CH: { nl: "Zwitserland", en: "Switzerland", tr: "İsviçre" },
  NO: { nl: "Noorwegen", en: "Norway", tr: "Norveç" },
  BG: { nl: "Bulgarije", en: "Bulgaria", tr: "Bulgaristan" },
  CY: { nl: "Cyprus", en: "Cyprus", tr: "Kıbrıs" },
  EE: { nl: "Estland", en: "Estonia", tr: "Estonya" },
  HR: { nl: "Kroatië", en: "Croatia", tr: "Hırvatistan" },
  LV: { nl: "Letland", en: "Latvia", tr: "Letonya" },
  MT: { nl: "Malta", en: "Malta", tr: "Malta" },
  RO: { nl: "Roemenië", en: "Romania", tr: "Romanya" },
  SI: { nl: "Slovenië", en: "Slovenia", tr: "Slovenya" },
  SK: { nl: "Slowakije", en: "Slovakia", tr: "Slovakya" },
  IS: { nl: "IJsland", en: "Iceland", tr: "İzlanda" },
  US: { nl: "Verenigde Staten", en: "United States", tr: "ABD" },
};

// Open Food Facts country slugs (sale country of a product) to the codes above.
// Unknown slugs are not shown: they are often data-entry noise.
const OFF_SLUGS = {
  netherlands: "NL", germany: "DE", deutschland: "DE", belgium: "BE", belgie: "BE", france: "FR",
  italy: "IT", spain: "ES", denmark: "DK", austria: "AT", poland: "PL", ireland: "IE",
  "united-kingdom": "GB", luxembourg: "LU", portugal: "PT", greece: "GR", sweden: "SE",
  finland: "FI", "czech-republic": "CZ", hungary: "HU", lithuania: "LT", switzerland: "CH",
  norway: "NO", bulgaria: "BG", cyprus: "CY", estonia: "EE", croatia: "HR", latvia: "LV",
  malta: "MT", romania: "RO", slovenia: "SI", slovakia: "SK", iceland: "IS", "united-states": "US",
};

export function offCountryName(slug, lang) {
  const code = OFF_SLUGS[slug];
  return code ? countryName(code, lang) : null;
}

// Prefixes in German oval codes. EV is not a state.
export const DE_STATES = {
  NI: { nl: "Nedersaksen", en: "Lower Saxony", tr: "Aşağı Saksonya" },
  BY: { nl: "Beieren", en: "Bavaria", tr: "Bavyera" },
  NW: { nl: "Noordrijn-Westfalen", en: "North Rhine-Westphalia", tr: "Kuzey Ren-Vestfalya" },
  BW: { nl: "Baden-Württemberg", en: "Baden-Württemberg", tr: "Baden-Württemberg" },
  HE: { nl: "Hessen", en: "Hesse", tr: "Hessen" },
  RP: { nl: "Rijnland-Palts", en: "Rhineland-Palatinate", tr: "Renanya-Pfalz" },
  SL: { nl: "Saarland", en: "Saarland", tr: "Saarland" },
  SH: { nl: "Sleeswijk-Holstein", en: "Schleswig-Holstein", tr: "Schleswig-Holstein" },
  HH: { nl: "Hamburg", en: "Hamburg", tr: "Hamburg" },
  HB: { nl: "Bremen", en: "Bremen", tr: "Bremen" },
  MV: { nl: "Mecklenburg-Voor-Pommeren", en: "Mecklenburg-Western Pomerania", tr: "Mecklenburg-Ön Pomeranya" },
  BB: { nl: "Brandenburg", en: "Brandenburg", tr: "Brandenburg" },
  BE: { nl: "Berlijn", en: "Berlin", tr: "Berlin" },
  SN: { nl: "Saksen", en: "Saxony", tr: "Saksonya" },
  ST: { nl: "Saksen-Anhalt", en: "Saxony-Anhalt", tr: "Saksonya-Anhalt" },
  TH: { nl: "Thüringen", en: "Thuringia", tr: "Thüringen" },
  EV: { nl: "Erkend volgens EU-recht (geen deelstaat)", en: "Approved under EU law (not a state)", tr: "AB mevzuatına göre onaylı (eyalet değil)" },
};

export function countryName(code, lang) {
  return COUNTRIES[code]?.[lang] ?? code ?? "";
}

export function regionName(country, region, lang) {
  if (country === "DE" && region) return DE_STATES[region]?.[lang] ?? region;
  return null;
}
