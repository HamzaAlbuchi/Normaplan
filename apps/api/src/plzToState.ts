/**
 * Maps German postal code (PLZ, 5 digits) to Bundesland (federal state) code.
 * Based on the first two digits of the PLZ (Postleitregion).
 * State codes: ISO 3166-2:DE (BW, BY, BE, BB, HB, HH, HE, MV, NI, NW, RP, SL, SN, ST, SH, TH).
 */

const PLZ_PREFIX_TO_STATE: Record<string, string> = {
  "01": "SN", "02": "SN", "03": "SN", "04": "SN", "05": "SN", "06": "ST", "07": "SN", "08": "SN", "09": "SN",
  "10": "BE", "11": "BE", "12": "BE", "13": "BE", "14": "BB", "15": "BB", "16": "BB", "17": "MV", "18": "MV", "19": "BB",
  "20": "HH", "21": "HH",
  "22": "SH", "23": "SH", "24": "SH", "25": "SH",
  "26": "NI", "27": "NI", "28": "HB", "29": "NI",
  "30": "NI", "31": "NI", "32": "NI", "33": "NI", "34": "HE", "35": "HE", "36": "TH", "37": "TH", "38": "ST", "39": "ST",
  "40": "NW", "41": "NW", "42": "NW", "43": "NW", "44": "NW", "45": "NW", "46": "NW", "47": "NW", "48": "NW", "49": "NW",
  "50": "NW", "51": "NW", "52": "NW", "53": "RP", "54": "RP", "55": "RP", "56": "RP",
  "57": "NW", "58": "NW", "59": "NW",
  "60": "HE", "61": "HE", "62": "HE", "63": "HE", "64": "HE", "65": "HE",
  "66": "SL", "67": "SL",
  "68": "BW", "69": "BW",
  "70": "BW", "71": "BW", "72": "BW", "73": "BW", "74": "BW", "75": "BW", "76": "BW", "77": "BW", "78": "BW", "79": "BW",
  "80": "BY", "81": "BY", "82": "BY", "83": "BY", "84": "BY", "85": "BY", "86": "BY", "87": "BY", "88": "BW", "89": "BY",
  "90": "BY", "91": "BY", "92": "BY", "93": "BY", "94": "BY", "95": "BY", "96": "BY", "97": "BY", "98": "TH", "99": "TH",
};

const STATE_NAMES: Record<string, string> = {
  BW: "Baden-Württemberg",
  BY: "Bayern",
  BE: "Berlin",
  BB: "Brandenburg",
  HB: "Bremen",
  HH: "Hamburg",
  HE: "Hessen",
  MV: "Mecklenburg-Vorpommern",
  NI: "Niedersachsen",
  NW: "Nordrhein-Westfalen",
  RP: "Rheinland-Pfalz",
  SL: "Saarland",
  SN: "Sachsen",
  ST: "Sachsen-Anhalt",
  SH: "Schleswig-Holstein",
  TH: "Thüringen",
};

const GERMAN_PLZ_REGEX = /^[0-9]{5}$/;

export function parseGermanZipCode(zipCode: string): string | null {
  const normalized = String(zipCode).trim().replace(/\s/g, "");
  if (!GERMAN_PLZ_REGEX.test(normalized)) return null;
  const prefix = normalized.slice(0, 2);
  return PLZ_PREFIX_TO_STATE[prefix] ?? null;
}

export function getStateName(stateCode: string): string {
  return STATE_NAMES[stateCode] ?? stateCode;
}

export function isValidGermanZipCode(zipCode: string): boolean {
  return parseGermanZipCode(zipCode) !== null;
}

export const VALID_STATE_CODES = Object.keys(STATE_NAMES);
