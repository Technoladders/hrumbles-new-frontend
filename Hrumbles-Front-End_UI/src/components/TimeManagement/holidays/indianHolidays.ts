/**
 * indianHolidays.ts
 *
 * Offline static dataset of Indian public holidays.
 * Coverage: National (Gazetted) + all 28 States + 8 UTs
 * Years: 2024 – 2027
 *
 * isFixed = true  → date is always the same (Republic Day, Independence Day…)
 * isFixed = false → lunar/religious, date shifts yearly → use variableDates
 */

// ── State / UT codes ────────────────────────────────────────────────────────
export interface IndianState {
  code: string;
  name: string;
  region: "North" | "South" | "East" | "West" | "Central" | "Northeast" | "UT";
}

export const INDIAN_STATES: IndianState[] = [
  // States
  { code: "AP", name: "Andhra Pradesh",        region: "South"     },
  { code: "AR", name: "Arunachal Pradesh",      region: "Northeast" },
  { code: "AS", name: "Assam",                  region: "Northeast" },
  { code: "BR", name: "Bihar",                  region: "East"      },
  { code: "CT", name: "Chhattisgarh",           region: "Central"   },
  { code: "GA", name: "Goa",                    region: "West"      },
  { code: "GJ", name: "Gujarat",                region: "West"      },
  { code: "HR", name: "Haryana",                region: "North"     },
  { code: "HP", name: "Himachal Pradesh",       region: "North"     },
  { code: "JH", name: "Jharkhand",              region: "East"      },
  { code: "KA", name: "Karnataka",              region: "South"     },
  { code: "KL", name: "Kerala",                 region: "South"     },
  { code: "MP", name: "Madhya Pradesh",         region: "Central"   },
  { code: "MH", name: "Maharashtra",            region: "West"      },
  { code: "MN", name: "Manipur",                region: "Northeast" },
  { code: "ML", name: "Meghalaya",              region: "Northeast" },
  { code: "MZ", name: "Mizoram",                region: "Northeast" },
  { code: "NL", name: "Nagaland",               region: "Northeast" },
  { code: "OD", name: "Odisha",                 region: "East"      },
  { code: "PB", name: "Punjab",                 region: "North"     },
  { code: "RJ", name: "Rajasthan",              region: "North"     },
  { code: "SK", name: "Sikkim",                 region: "Northeast" },
  { code: "TN", name: "Tamil Nadu",             region: "South"     },
  { code: "TS", name: "Telangana",              region: "South"     },
  { code: "TR", name: "Tripura",                region: "Northeast" },
  { code: "UK", name: "Uttarakhand",            region: "North"     },
  { code: "UP", name: "Uttar Pradesh",          region: "North"     },
  { code: "WB", name: "West Bengal",            region: "East"      },
  // Union Territories
  { code: "AN", name: "Andaman & Nicobar",      region: "UT"        },
  { code: "CH", name: "Chandigarh",             region: "UT"        },
  { code: "DL", name: "Delhi",                  region: "UT"        },
  { code: "DN", name: "Dadra & Nagar Haveli",   region: "UT"        },
  { code: "DD", name: "Daman & Diu",            region: "UT"        },
  { code: "JK", name: "Jammu & Kashmir",        region: "UT"        },
  { code: "LA", name: "Ladakh",                 region: "UT"        },
  { code: "LD", name: "Lakshadweep",            region: "UT"        },
  { code: "PY", name: "Puducherry",             region: "UT"        },
];

export const ALL_STATE_CODES = INDIAN_STATES.map(s => s.code);

// ── Holiday entry type ───────────────────────────────────────────────────────
export type HolidayCategory = "national" | "religious_hindu" | "religious_muslim" |
  "religious_christian" | "religious_sikh" | "religious_buddhist" | "cultural" | "regional";

export interface IndianHolidayEntry {
  id: string;
  name: string;
  description?: string;
  type: "National" | "Regional";
  category: HolidayCategory;
  /** ["ALL"] = every state/UT; otherwise list of state codes */
  states: string[];
  isFixed: boolean;
  /** Fixed holidays only */
  month?: number;
  day?: number;
  /** Variable holidays — exact dates per year */
  variableDates?: Record<number, string>; // { 2025: "2025-03-14" }
}

// ── Utility: resolve a holiday to a specific date string ────────────────────
export function resolveHolidayDate(
  h: IndianHolidayEntry,
  year: number
): string | null {
  if (h.isFixed && h.month && h.day) {
    return `${year}-${String(h.month).padStart(2, "0")}-${String(h.day).padStart(2, "0")}`;
  }
  return h.variableDates?.[year] ?? null;
}

/** Returns true if a holiday applies to a given state code */
export function appliesToState(h: IndianHolidayEntry, stateCode: string): boolean {
  return h.states.includes("ALL") || h.states.includes(stateCode);
}

/** Get all holidays for a given year + list of state codes */
export function getHolidaysForYearAndStates(
  year: number,
  stateCodes: string[]
): Array<IndianHolidayEntry & { resolvedDate: string }> {
  const results: Array<IndianHolidayEntry & { resolvedDate: string }> = [];
  for (const h of INDIAN_HOLIDAYS) {
    const matches = stateCodes.some(sc => appliesToState(h, sc));
    if (!matches) continue;
    const date = resolveHolidayDate(h, year);
    if (!date) continue;
    results.push({ ...h, resolvedDate: date });
  }
  return results.sort((a, b) => a.resolvedDate.localeCompare(b.resolvedDate));
}

// ═══════════════════════════════════════════════════════════════════════════
// DATASET
// ═══════════════════════════════════════════════════════════════════════════
export const INDIAN_HOLIDAYS: IndianHolidayEntry[] = [

  // ── FIXED NATIONAL (GAZETTED) ──────────────────────────────────────────
  {
    id: "republic_day",
    name: "Republic Day",
    description: "Commemorates the Constitution of India coming into effect",
    type: "National", category: "national",
    states: ["ALL"], isFixed: true, month: 1, day: 26,
  },
  {
    id: "independence_day",
    name: "Independence Day",
    description: "India's independence from British rule in 1947",
    type: "National", category: "national",
    states: ["ALL"], isFixed: true, month: 8, day: 15,
  },
  {
    id: "gandhi_jayanti",
    name: "Gandhi Jayanti",
    description: "Birthday of Mahatma Gandhi",
    type: "National", category: "national",
    states: ["ALL"], isFixed: true, month: 10, day: 2,
  },
  {
    id: "christmas",
    name: "Christmas",
    description: "Birth of Jesus Christ",
    type: "National", category: "religious_christian",
    states: ["ALL"], isFixed: true, month: 12, day: 25,
  },
  {
    id: "new_years",
    name: "New Year's Day",
    description: "First day of the Gregorian calendar year",
    type: "National", category: "national",
    states: ["ALL"], isFixed: true, month: 1, day: 1,
  },

  // ── VARIABLE NATIONAL / MAJOR FESTIVALS ────────────────────────────────
  {
    id: "holi",
    name: "Holi",
    description: "Festival of colours — marks end of winter",
    type: "National", category: "religious_hindu",
    states: ["ALL"],
    isFixed: false,
    variableDates: {
      2024: "2024-03-25",
      2025: "2025-03-14",
      2026: "2026-03-03",
      2027: "2027-03-22",
    },
  },
  {
    id: "good_friday",
    name: "Good Friday",
    description: "Crucifixion of Jesus Christ",
    type: "National", category: "religious_christian",
    states: ["ALL"],
    isFixed: false,
    variableDates: {
      2024: "2024-03-29",
      2025: "2025-04-18",
      2026: "2026-04-03",
      2027: "2027-03-26",
    },
  },
  {
    id: "eid_ul_fitr",
    name: "Eid ul-Fitr",
    description: "Marks the end of Ramadan",
    type: "National", category: "religious_muslim",
    states: ["ALL"],
    isFixed: false,
    variableDates: {
      2024: "2024-04-11",
      2025: "2025-03-31",
      2026: "2026-03-20",
      2027: "2027-03-09",
    },
  },
  {
    id: "eid_ul_adha",
    name: "Eid ul-Adha",
    description: "Festival of Sacrifice",
    type: "National", category: "religious_muslim",
    states: ["ALL"],
    isFixed: false,
    variableDates: {
      2024: "2024-06-17",
      2025: "2025-06-07",
      2026: "2026-05-27",
      2027: "2027-05-17",
    },
  },
  {
    id: "dussehra",
    name: "Dussehra (Vijaya Dashami)",
    description: "Victory of good over evil — end of Navaratri",
    type: "National", category: "religious_hindu",
    states: ["ALL"],
    isFixed: false,
    variableDates: {
      2024: "2024-10-12",
      2025: "2025-10-02",
      2026: "2026-10-21",
      2027: "2027-10-10",
    },
  },
  {
    id: "diwali",
    name: "Diwali (Deepavali)",
    description: "Festival of lights",
    type: "National", category: "religious_hindu",
    states: ["ALL"],
    isFixed: false,
    variableDates: {
      2024: "2024-11-01",
      2025: "2025-10-20",
      2026: "2026-11-08",
      2027: "2027-10-29",
    },
  },
  {
    id: "buddha_purnima",
    name: "Buddha Purnima",
    description: "Birth, enlightenment and death of Gautama Buddha",
    type: "National", category: "religious_buddhist",
    states: ["ALL"],
    isFixed: false,
    variableDates: {
      2024: "2024-05-23",
      2025: "2025-05-12",
      2026: "2026-05-31",
      2027: "2027-05-20",
    },
  },
  {
    id: "janmashtami",
    name: "Krishna Janmashtami",
    description: "Birth anniversary of Lord Krishna",
    type: "National", category: "religious_hindu",
    states: ["ALL"],
    isFixed: false,
    variableDates: {
      2024: "2024-08-26",
      2025: "2025-08-16",
      2026: "2026-08-05",
      2027: "2027-08-24",
    },
  },
  {
    id: "guru_nanak_jayanti",
    name: "Guru Nanak Jayanti",
    description: "Birth anniversary of Guru Nanak, founder of Sikhism",
    type: "National", category: "religious_sikh",
    states: ["ALL"],
    isFixed: false,
    variableDates: {
      2024: "2024-11-15",
      2025: "2025-11-05",
      2026: "2026-11-24",
      2027: "2027-11-13",
    },
  },
  {
    id: "muharram",
    name: "Muharram (Ashura)",
    description: "Islamic New Year",
    type: "National", category: "religious_muslim",
    states: ["ALL"],
    isFixed: false,
    variableDates: {
      2024: "2024-07-17",
      2025: "2025-07-06",
      2026: "2026-06-25",
      2027: "2027-06-15",
    },
  },
  {
    id: "milad_un_nabi",
    name: "Milad-un-Nabi",
    description: "Birth anniversary of Prophet Muhammad",
    type: "National", category: "religious_muslim",
    states: ["ALL"],
    isFixed: false,
    variableDates: {
      2024: "2024-09-16",
      2025: "2025-09-05",
      2026: "2026-08-25",
      2027: "2027-08-14",
    },
  },
  {
    id: "ambedkar_jayanti",
    name: "Ambedkar Jayanti",
    description: "Birthday of Dr. B.R. Ambedkar",
    type: "National", category: "national",
    states: ["ALL"], isFixed: true, month: 4, day: 14,
  },
  {
    id: "mahavir_jayanti",
    name: "Mahavir Jayanti",
    description: "Birth anniversary of Mahavira, 24th Jain Tirthankara",
    type: "National", category: "religious_hindu",
    states: ["ALL"],
    isFixed: false,
    variableDates: {
      2024: "2024-04-21",
      2025: "2025-04-10",
      2026: "2026-03-31",
      2027: "2027-04-18",
    },
  },

  // ── SOUTH INDIA ─────────────────────────────────────────────────────────

  // Tamil Nadu
  {
    id: "pongal",
    name: "Pongal",
    description: "Tamil harvest festival — four days of celebration",
    type: "Regional", category: "cultural",
    states: ["TN", "PY"],
    isFixed: true, month: 1, day: 14,
  },
  {
    id: "pongal_day2",
    name: "Pongal (Mattu Pongal)",
    description: "Second day of Pongal — cattle worship",
    type: "Regional", category: "cultural",
    states: ["TN"],
    isFixed: true, month: 1, day: 15,
  },
  {
    id: "tamil_new_year",
    name: "Tamil New Year (Puthandu)",
    description: "Tamil New Year",
    type: "Regional", category: "cultural",
    states: ["TN", "PY"],
    isFixed: true, month: 4, day: 14,
  },
  {
    id: "karthigai_deepam",
    name: "Karthigai Deepam",
    description: "Festival of lights celebrated in Tamil Nadu",
    type: "Regional", category: "religious_hindu",
    states: ["TN"],
    isFixed: false,
    variableDates: {
      2024: "2024-11-26",
      2025: "2025-12-15",
      2026: "2026-12-04",
      2027: "2027-11-24",
    },
  },

  // Kerala
  {
    id: "vishu",
    name: "Vishu",
    description: "Malayalam New Year",
    type: "Regional", category: "cultural",
    states: ["KL"],
    isFixed: true, month: 4, day: 14,
  },
  {
    id: "onam",
    name: "Onam (Thiruvonam)",
    description: "Harvest festival of Kerala",
    type: "Regional", category: "cultural",
    states: ["KL"],
    isFixed: false,
    variableDates: {
      2024: "2024-09-15",
      2025: "2025-09-05",
      2026: "2026-08-26",
      2027: "2027-09-13",
    },
  },
  {
    id: "kerala_piravi",
    name: "Kerala Piravi",
    description: "Formation of Kerala state",
    type: "Regional", category: "national",
    states: ["KL"],
    isFixed: true, month: 11, day: 1,
  },

  // Karnataka
  {
    id: "ugadi_ka",
    name: "Ugadi",
    description: "Kannada New Year",
    type: "Regional", category: "cultural",
    states: ["KA", "AP", "TS"],
    isFixed: false,
    variableDates: {
      2024: "2024-04-09",
      2025: "2025-03-30",
      2026: "2026-03-19",
      2027: "2027-04-07",
    },
  },
  {
    id: "rajyotsava",
    name: "Karnataka Rajyotsava",
    description: "Formation of Karnataka state",
    type: "Regional", category: "national",
    states: ["KA"],
    isFixed: true, month: 11, day: 1,
  },
  {
    id: "ganesh_chaturthi",
    name: "Ganesh Chaturthi",
    description: "Birth anniversary of Lord Ganesha",
    type: "Regional", category: "religious_hindu",
    states: ["MH", "KA", "TN", "AP", "TS", "GJ"],
    isFixed: false,
    variableDates: {
      2024: "2024-09-07",
      2025: "2025-08-27",
      2026: "2026-09-15",
      2027: "2027-09-04",
    },
  },

  // Andhra Pradesh & Telangana
  {
    id: "sankranti_ap",
    name: "Makar Sankranti",
    description: "Harvest festival",
    type: "Regional", category: "cultural",
    states: ["AP", "TS", "KA"],
    isFixed: true, month: 1, day: 14,
  },
  {
    id: "bonalu",
    name: "Bonalu",
    description: "Telangana folk festival",
    type: "Regional", category: "religious_hindu",
    states: ["TS"],
    isFixed: false,
    variableDates: {
      2024: "2024-07-14",
      2025: "2025-07-06",
      2026: "2026-07-26",
      2027: "2027-07-15",
    },
  },
  {
    id: "bathukamma",
    name: "Bathukamma",
    description: "Floral festival of Telangana",
    type: "Regional", category: "cultural",
    states: ["TS"],
    isFixed: false,
    variableDates: {
      2024: "2024-10-02",
      2025: "2025-09-22",
      2026: "2026-10-10",
      2027: "2027-09-29",
    },
  },

  // ── WEST INDIA ──────────────────────────────────────────────────────────

  // Maharashtra
  {
    id: "gudi_padwa",
    name: "Gudi Padwa",
    description: "Marathi New Year",
    type: "Regional", category: "cultural",
    states: ["MH"],
    isFixed: false,
    variableDates: {
      2024: "2024-04-09",
      2025: "2025-03-30",
      2026: "2026-03-19",
      2027: "2027-04-07",
    },
  },
  {
    id: "maharashtra_day",
    name: "Maharashtra Day",
    description: "Formation of Maharashtra state",
    type: "Regional", category: "national",
    states: ["MH"],
    isFixed: true, month: 5, day: 1,
  },
  {
    id: "chhatrapati_shivaji",
    name: "Chhatrapati Shivaji Maharaj Jayanti",
    description: "Birth anniversary of Chhatrapati Shivaji Maharaj",
    type: "Regional", category: "cultural",
    states: ["MH"],
    isFixed: true, month: 2, day: 19,
  },

  // Gujarat
  {
    id: "gujarat_day",
    name: "Gujarat Day",
    description: "Formation of Gujarat state",
    type: "Regional", category: "national",
    states: ["GJ"],
    isFixed: true, month: 5, day: 1,
  },
  {
    id: "uttarayan",
    name: "Uttarayan (Makar Sankranti)",
    description: "Kite festival",
    type: "Regional", category: "cultural",
    states: ["GJ"],
    isFixed: true, month: 1, day: 14,
  },

  // Goa
  {
    id: "goa_liberation",
    name: "Goa Liberation Day",
    description: "Liberation of Goa from Portuguese rule",
    type: "Regional", category: "national",
    states: ["GA"],
    isFixed: true, month: 12, day: 19,
  },

  // ── NORTH INDIA ─────────────────────────────────────────────────────────

  // Punjab & Haryana
  {
    id: "baisakhi",
    name: "Baisakhi",
    description: "Sikh New Year and harvest festival",
    type: "Regional", category: "religious_sikh",
    states: ["PB", "HR", "HP", "DL", "CH"],
    isFixed: false,
    variableDates: {
      2024: "2024-04-13",
      2025: "2025-04-13",
      2026: "2026-04-14",
      2027: "2027-04-14",
    },
  },
  {
    id: "guru_gobind_jayanti",
    name: "Guru Gobind Singh Jayanti",
    description: "Birth anniversary of Guru Gobind Singh Ji",
    type: "Regional", category: "religious_sikh",
    states: ["PB", "HR", "DL", "CH", "HP"],
    isFixed: false,
    variableDates: {
      2024: "2024-01-17",
      2025: "2025-01-06",
      2026: "2026-01-26",
      2027: "2027-01-15",
    },
  },
  {
    id: "haryana_day",
    name: "Haryana Day",
    description: "Formation of Haryana state",
    type: "Regional", category: "national",
    states: ["HR"],
    isFixed: true, month: 11, day: 1,
  },
  {
    id: "himachal_day",
    name: "Himachal Pradesh Day",
    description: "Formation of Himachal Pradesh state",
    type: "Regional", category: "national",
    states: ["HP"],
    isFixed: true, month: 4, day: 15,
  },

  // Rajasthan
  {
    id: "rajasthan_day",
    name: "Rajasthan Day",
    description: "Formation of Rajasthan state",
    type: "Regional", category: "national",
    states: ["RJ"],
    isFixed: true, month: 3, day: 30,
  },

  // Uttar Pradesh
  {
    id: "ram_navami",
    name: "Ram Navami",
    description: "Birth anniversary of Lord Ram",
    type: "Regional", category: "religious_hindu",
    states: ["UP", "UK", "BR", "JH", "OD", "MP", "RJ", "HR", "DL"],
    isFixed: false,
    variableDates: {
      2024: "2024-04-17",
      2025: "2025-04-06",
      2026: "2026-03-26",
      2027: "2027-04-14",
    },
  },
  {
    id: "chhath_puja",
    name: "Chhath Puja",
    description: "Sun worship festival",
    type: "Regional", category: "religious_hindu",
    states: ["BR", "JH", "UP", "DL", "WB"],
    isFixed: false,
    variableDates: {
      2024: "2024-11-07",
      2025: "2025-10-28",
      2026: "2026-11-16",
      2027: "2027-11-05",
    },
  },
  {
    id: "up_foundation",
    name: "Uttar Pradesh Foundation Day",
    description: "Formation of Uttar Pradesh state",
    type: "Regional", category: "national",
    states: ["UP"],
    isFixed: true, month: 1, day: 24,
  },

  // Uttarakhand
  {
    id: "uttarakhand_day",
    name: "Uttarakhand Foundation Day",
    description: "Formation of Uttarakhand state",
    type: "Regional", category: "national",
    states: ["UK"],
    isFixed: true, month: 11, day: 9,
  },

  // Delhi
  {
    id: "delhi_foundation",
    name: "Delhi Day",
    description: "Coronation of Delhi as Capital",
    type: "Regional", category: "national",
    states: ["DL"],
    isFixed: true, month: 12, day: 12,
  },

  // ── EAST INDIA ──────────────────────────────────────────────────────────

  // West Bengal
  {
    id: "durga_puja",
    name: "Durga Puja (Maha Navami)",
    description: "Worship of Goddess Durga",
    type: "Regional", category: "religious_hindu",
    states: ["WB", "AS", "TR", "OD"],
    isFixed: false,
    variableDates: {
      2024: "2024-10-12",
      2025: "2025-10-01",
      2026: "2026-10-20",
      2027: "2027-10-09",
    },
  },
  {
    id: "poila_baisakh",
    name: "Poila Baisakh (Bengali New Year)",
    description: "Bengali New Year",
    type: "Regional", category: "cultural",
    states: ["WB", "TR"],
    isFixed: true, month: 4, day: 14,
  },
  {
    id: "netaji_jayanti",
    name: "Netaji Subhas Chandra Bose Jayanti",
    description: "Birthday of Netaji Subhas Chandra Bose",
    type: "Regional", category: "national",
    states: ["WB"],
    isFixed: true, month: 1, day: 23,
  },

  // Bihar
  {
    id: "sarhul_bihar",
    name: "Sarhul",
    description: "Nature festival of Jharkhand and Bihar tribal communities",
    type: "Regional", category: "cultural",
    states: ["JH", "BR"],
    isFixed: false,
    variableDates: {
      2024: "2024-03-27",
      2025: "2025-04-06",
      2026: "2026-03-26",
      2027: "2027-04-14",
    },
  },

  // Odisha
  {
    id: "rath_yatra",
    name: "Rath Yatra",
    description: "Chariot festival of Lord Jagannath — Puri",
    type: "Regional", category: "religious_hindu",
    states: ["OD"],
    isFixed: false,
    variableDates: {
      2024: "2024-07-07",
      2025: "2025-06-27",
      2026: "2026-07-16",
      2027: "2027-07-06",
    },
  },
  {
    id: "odisha_day",
    name: "Odisha Day (Utkal Divas)",
    description: "Formation of Odisha state",
    type: "Regional", category: "national",
    states: ["OD"],
    isFixed: true, month: 4, day: 1,
  },

  // Assam
  {
    id: "bihu_rongali",
    name: "Rongali Bihu",
    description: "Assamese New Year and spring harvest festival",
    type: "Regional", category: "cultural",
    states: ["AS", "AR", "MN", "NL"],
    isFixed: true, month: 4, day: 14,
  },
  {
    id: "bihu_kongali",
    name: "Kongali Bihu",
    description: "Autumn Bihu",
    type: "Regional", category: "cultural",
    states: ["AS"],
    isFixed: true, month: 10, day: 17,
  },

  // Northeast India
  {
    id: "statehood_manipur",
    name: "Manipur Day",
    description: "Statehood Day of Manipur",
    type: "Regional", category: "national",
    states: ["MN"],
    isFixed: true, month: 1, day: 21,
  },
  {
    id: "statehood_mizoram",
    name: "Mizoram Day",
    description: "Statehood Day of Mizoram",
    type: "Regional", category: "national",
    states: ["MZ"],
    isFixed: true, month: 2, day: 20,
  },
  {
    id: "christmas_mizoram",
    name: "Christmas Season (Mizoram)",
    description: "Extended Christmas holiday",
    type: "Regional", category: "religious_christian",
    states: ["MZ", "NL", "ML", "MN"],
    isFixed: true, month: 12, day: 24,
  },
  {
    id: "statehood_nagaland",
    name: "Nagaland Statehood Day",
    description: "Formation of Nagaland state",
    type: "Regional", category: "national",
    states: ["NL"],
    isFixed: true, month: 12, day: 1,
  },
  {
    id: "hornbill_festival",
    name: "Hornbill Festival",
    description: "Cultural festival celebrating Naga heritage",
    type: "Regional", category: "cultural",
    states: ["NL"],
    isFixed: true, month: 12, day: 1,
  },
  {
    id: "statehood_arunachal",
    name: "Arunachal Pradesh Statehood Day",
    description: "Formation of Arunachal Pradesh state",
    type: "Regional", category: "national",
    states: ["AR"],
    isFixed: true, month: 2, day: 20,
  },

  // ── CENTRAL INDIA ───────────────────────────────────────────────────────

  // Madhya Pradesh
  {
    id: "mp_foundation",
    name: "Madhya Pradesh Foundation Day",
    description: "Formation of Madhya Pradesh state",
    type: "Regional", category: "national",
    states: ["MP"],
    isFixed: true, month: 11, day: 1,
  },

  // Chhattisgarh
  {
    id: "cg_foundation",
    name: "Chhattisgarh Foundation Day",
    description: "Formation of Chhattisgarh state",
    type: "Regional", category: "national",
    states: ["CT"],
    isFixed: true, month: 11, day: 1,
  },

  // ── ADDITIONAL NATIONAL OBSERVANCES ────────────────────────────────────
  {
    id: "labour_day",
    name: "International Labour Day",
    description: "Workers' rights and contributions",
    type: "National", category: "national",
    states: ["ALL"],
    isFixed: true, month: 5, day: 1,
  },
  {
    id: "diwali_day2",
    name: "Diwali (Govardhan Puja)",
    description: "Day after Diwali — Govardhan Puja / Padwa",
    type: "Regional", category: "religious_hindu",
    states: ["UP", "BR", "HR", "RJ", "DL", "UK", "MP"],
    isFixed: false,
    variableDates: {
      2024: "2024-11-02",
      2025: "2025-10-21",
      2026: "2026-11-09",
      2027: "2027-10-30",
    },
  },
  {
    id: "bhai_dooj",
    name: "Bhai Dooj",
    description: "Celebration of the bond between brothers and sisters",
    type: "Regional", category: "religious_hindu",
    states: ["UP", "BR", "HR", "RJ", "DL", "UK", "WB", "MH"],
    isFixed: false,
    variableDates: {
      2024: "2024-11-03",
      2025: "2025-10-23",
      2026: "2026-11-11",
      2027: "2027-10-31",
    },
  },

  // J&K specific
  {
    id: "jk_accession",
    name: "Jammu & Kashmir Accession Day",
    description: "Accession of J&K to India",
    type: "Regional", category: "national",
    states: ["JK", "LA"],
    isFixed: true, month: 10, day: 26,
  },

  // Puducherry
  {
    id: "pondicherry_liberation",
    name: "Puducherry Liberation Day",
    description: "Liberation of Puducherry from French rule",
    type: "Regional", category: "national",
    states: ["PY"],
    isFixed: true, month: 11, day: 1,
  },
];