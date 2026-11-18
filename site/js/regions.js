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
};

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
