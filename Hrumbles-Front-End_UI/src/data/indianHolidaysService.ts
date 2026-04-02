/**
 * indianHolidaysService.ts
 *
 * Hybrid holiday service for India:
 *
 *  Layer 1 — date-holidays (npm)
 *    Algorithmically correct, maintained, covers all 35 states/UTs.
 *    Handles: gazetted public holidays, state formation days, Jayantis,
 *    Good Friday (Easter-relative), Vaisakhi, etc.
 *
 *  Layer 2 — Supplementary festivals (our own small dataset)
 *    Major religious festivals whose dates are lunar/Islamic and NOT covered
 *    by the library: Diwali, Holi, Eid ul-Fitr, Eid ul-Adha, Pongal, Onam,
 *    Dussehra, Guru Nanak Jayanti, Janmashtami, etc.
 *
 * The two layers are merged and deduplicated by date before returning.
 */

import Holidays from "date-holidays";
import { toLibraryCode, INDIAN_STATES } from "./indianStates";
import { format } from "date-fns";

// ── Result type ──────────────────────────────────────────────────────────────
export interface ResolvedHoliday {
  id: string;
  name: string;
  date: string;         // "yyyy-MM-dd"
  type: "National" | "Regional";
  category: string;
  description?: string;
  source: "library" | "supplementary";
  /** Which state codes this applies to ("ALL" = national) */
  states: string[];
}

// ── Supplementary festival dataset ──────────────────────────────────────────
// Only festivals NOT covered by date-holidays. Keyed by year for accuracy.
interface SupplementaryEntry {
  id: string;
  name: string;
  description?: string;
  type: "National" | "Regional";
  category: string;
  states: string[];                       // ["ALL"] or specific codes
  dates: Partial<Record<number, string>>; // { 2025: "2025-03-14" }
}

const SUPPLEMENTARY: SupplementaryEntry[] = [
  // ── Hindu festivals ───────────────────────────────────────────────────
  {
    id: "holi",
    name: "Holi",
    description: "Festival of colours — marks end of winter",
    type: "National", category: "Hindu festival",
    states: ["ALL"],
    dates: { 2024: "2024-03-25", 2025: "2025-03-14", 2026: "2026-03-03", 2027: "2027-03-22" },
  },
  {
    id: "dussehra",
    name: "Dussehra (Vijaya Dashami)",
    description: "Victory of good over evil — end of Navaratri",
    type: "National", category: "Hindu festival",
    states: ["ALL"],
    dates: { 2024: "2024-10-12", 2025: "2025-10-02", 2026: "2026-10-21", 2027: "2027-10-10" },
  },
  {
    id: "diwali",
    name: "Diwali (Deepavali)",
    description: "Festival of lights",
    type: "National", category: "Hindu festival",
    states: ["ALL"],
    dates: { 2024: "2024-11-01", 2025: "2025-10-20", 2026: "2026-11-08", 2027: "2027-10-29" },
  },
  {
    id: "janmashtami",
    name: "Krishna Janmashtami",
    description: "Birth anniversary of Lord Krishna",
    type: "National", category: "Hindu festival",
    states: ["ALL"],
    dates: { 2024: "2024-08-26", 2025: "2025-08-16", 2026: "2026-08-05", 2027: "2027-08-24" },
  },
  {
    id: "ram_navami",
    name: "Ram Navami",
    description: "Birth anniversary of Lord Ram",
    type: "National", category: "Hindu festival",
    states: ["ALL"],
    dates: { 2024: "2024-04-17", 2025: "2025-04-06", 2026: "2026-03-26", 2027: "2027-04-14" },
  },
  {
    id: "mahashivratri",
    name: "Maha Shivratri",
    description: "Night of Lord Shiva",
    type: "National", category: "Hindu festival",
    states: ["ALL"],
    dates: { 2024: "2024-03-08", 2025: "2025-02-26", 2026: "2026-02-15", 2027: "2027-03-06" },
  },
  {
    id: "navratri_start",
    name: "Navratri",
    description: "Nine nights — Goddess Durga worship",
    type: "National", category: "Hindu festival",
    states: ["ALL"],
    dates: { 2024: "2024-10-03", 2025: "2025-09-22", 2026: "2026-10-12", 2027: "2027-10-01" },
  },
  {
    id: "ganesh_chaturthi",
    name: "Ganesh Chaturthi",
    description: "Birth anniversary of Lord Ganesha",
    type: "Regional", category: "Hindu festival",
    states: ["MH", "KA", "TN", "AP", "TS", "GJ", "DL"],
    dates: { 2024: "2024-09-07", 2025: "2025-08-27", 2026: "2026-09-15", 2027: "2027-09-04" },
  },
  {
    id: "chhath_puja",
    name: "Chhath Puja",
    description: "Sun worship festival",
    type: "Regional", category: "Hindu festival",
    states: ["BR", "JH", "UP", "DL", "WB"],
    dates: { 2024: "2024-11-07", 2025: "2025-10-28", 2026: "2026-11-16", 2027: "2027-11-05" },
  },
  {
    id: "pongal",
    name: "Pongal",
    description: "Tamil harvest festival",
    type: "Regional", category: "Cultural festival",
    states: ["TN", "PY"],
    dates: { 2024: "2024-01-14", 2025: "2025-01-14", 2026: "2026-01-14", 2027: "2027-01-14" },
  },
  {
    id: "pongal_mattu",
    name: "Pongal (Mattu Pongal)",
    description: "Second day of Pongal",
    type: "Regional", category: "Cultural festival",
    states: ["TN"],
    dates: { 2024: "2024-01-15", 2025: "2025-01-15", 2026: "2026-01-15", 2027: "2027-01-15" },
  },
  {
    id: "onam",
    name: "Onam (Thiruvonam)",
    description: "Harvest festival of Kerala",
    type: "Regional", category: "Cultural festival",
    states: ["KL"],
    dates: { 2024: "2024-09-15", 2025: "2025-09-05", 2026: "2026-08-26", 2027: "2027-09-13" },
  },
  {
    id: "ugadi",
    name: "Ugadi",
    description: "Telugu / Kannada New Year",
    type: "Regional", category: "Cultural festival",
    states: ["AP", "TS", "KA"],
    dates: { 2024: "2024-04-09", 2025: "2025-03-30", 2026: "2026-03-19", 2027: "2027-04-07" },
  },
  {
    id: "gudi_padwa",
    name: "Gudi Padwa",
    description: "Marathi New Year",
    type: "Regional", category: "Cultural festival",
    states: ["MH"],
    dates: { 2024: "2024-04-09", 2025: "2025-03-30", 2026: "2026-03-19", 2027: "2027-04-07" },
  },
  {
    id: "vishu",
    name: "Vishu",
    description: "Malayalam New Year",
    type: "Regional", category: "Cultural festival",
    states: ["KL"],
    dates: { 2024: "2024-04-14", 2025: "2025-04-14", 2026: "2026-04-14", 2027: "2027-04-14" },
  },
  {
    id: "bihu_rongali",
    name: "Rongali Bihu",
    description: "Assamese New Year",
    type: "Regional", category: "Cultural festival",
    states: ["AS", "AR", "MN", "NL"],
    dates: { 2024: "2024-04-14", 2025: "2025-04-14", 2026: "2026-04-14", 2027: "2027-04-14" },
  },
  {
    id: "durga_puja",
    name: "Durga Puja (Maha Saptami)",
    description: "Worship of Goddess Durga",
    type: "Regional", category: "Hindu festival",
    states: ["WB", "AS", "TR", "OD"],
    dates: { 2024: "2024-10-10", 2025: "2025-09-29", 2026: "2026-10-18", 2027: "2027-10-07" },
  },
  {
    id: "karthigai_deepam",
    name: "Karthigai Deepam",
    description: "Festival of lights in Tamil Nadu",
    type: "Regional", category: "Hindu festival",
    states: ["TN"],
    dates: { 2024: "2024-11-26", 2025: "2025-12-15", 2026: "2026-12-04", 2027: "2027-11-24" },
  },
  {
    id: "bonalu",
    name: "Bonalu",
    description: "Telangana folk festival",
    type: "Regional", category: "Cultural festival",
    states: ["TS"],
    dates: { 2024: "2024-07-14", 2025: "2025-07-06", 2026: "2026-07-26", 2027: "2027-07-15" },
  },
  {
    id: "rath_yatra",
    name: "Rath Yatra",
    description: "Chariot festival of Lord Jagannath — Puri",
    type: "Regional", category: "Hindu festival",
    states: ["OD"],
    dates: { 2024: "2024-07-07", 2025: "2025-06-27", 2026: "2026-07-16", 2027: "2027-07-06" },
  },

  // ── Muslim festivals ──────────────────────────────────────────────────
  {
    id: "eid_ul_fitr",
    name: "Eid ul-Fitr",
    description: "End of Ramadan",
    type: "National", category: "Muslim festival",
    states: ["ALL"],
    dates: { 2024: "2024-04-11", 2025: "2025-03-31", 2026: "2026-03-20", 2027: "2027-03-09" },
  },
  {
    id: "eid_ul_adha",
    name: "Eid ul-Adha (Bakrid)",
    description: "Festival of Sacrifice",
    type: "National", category: "Muslim festival",
    states: ["ALL"],
    dates: { 2024: "2024-06-17", 2025: "2025-06-07", 2026: "2026-05-27", 2027: "2027-05-17" },
  },
  {
    id: "muharram",
    name: "Muharram (Ashura)",
    description: "Islamic New Year / Day of Ashura",
    type: "National", category: "Muslim festival",
    states: ["ALL"],
    dates: { 2024: "2024-07-17", 2025: "2025-07-06", 2026: "2026-06-25", 2027: "2027-06-15" },
  },
  {
    id: "milad_un_nabi",
    name: "Milad-un-Nabi",
    description: "Birth anniversary of Prophet Muhammad",
    type: "National", category: "Muslim festival",
    states: ["ALL"],
    dates: { 2024: "2024-09-16", 2025: "2025-09-05", 2026: "2026-08-25", 2027: "2027-08-14" },
  },

  // ── Sikh festivals ────────────────────────────────────────────────────
  {
    id: "guru_nanak_jayanti",
    name: "Guru Nanak Jayanti",
    description: "Birth anniversary of Guru Nanak",
    type: "National", category: "Sikh festival",
    states: ["ALL"],
    dates: { 2024: "2024-11-15", 2025: "2025-11-05", 2026: "2026-11-24", 2027: "2027-11-13" },
  },

  // ── Buddhist festivals ────────────────────────────────────────────────
  {
    id: "buddha_purnima",
    name: "Buddha Purnima",
    description: "Birth, enlightenment and death of Gautama Buddha",
    type: "National", category: "Buddhist festival",
    states: ["ALL"],
    dates: { 2024: "2024-05-23", 2025: "2025-05-12", 2026: "2026-05-31", 2027: "2027-05-20" },
  },

  // ── Jain festivals ────────────────────────────────────────────────────
  {
    id: "mahavir_jayanti",
    name: "Mahavir Jayanti",
    description: "Birth anniversary of Mahavira",
    type: "National", category: "Jain festival",
    states: ["ALL"],
    dates: { 2024: "2024-04-21", 2025: "2025-04-10", 2026: "2026-03-31", 2027: "2027-04-18" },
  },
];

// ── Helper: check if supplementary entry applies to a state set ─────────────
function supplementaryApplies(entry: SupplementaryEntry, stateCodes: string[]): boolean {
  if (entry.states.includes("ALL")) return true;
  return entry.states.some(sc => stateCodes.includes(sc));
}

// ── Main export ──────────────────────────────────────────────────────────────
/**
 * Returns merged, deduplicated holidays for the given year and state codes.
 * Layer 1 (date-holidays) + Layer 2 (supplementary festivals), sorted by date.
 *
 * @param year        e.g. 2026
 * @param stateCodes  Our internal codes: ["ALL"] or ["TN","KL","MH",…]
 */
export function getHolidaysForYearAndStates(
  year: number,
  stateCodes: string[]
): ResolvedHoliday[] {
  const resultMap = new Map<string, ResolvedHoliday>();

  const isAll = stateCodes.includes("ALL");
  const targetCodes = isAll
    ? INDIAN_STATES.map(s => s.code)
    : stateCodes;

  // ── Layer 1: date-holidays library ────────────────────────────────────
  const libCodesToQuery = isAll
    ? [...new Set(INDIAN_STATES.map(s => s.libraryCode))]
    : [...new Set(targetCodes.map(c => toLibraryCode(c)))];

  // Normalise a name to a map key — strips punctuation + whitespace
  const nameKey = (name: string) =>
    name.toLowerCase().replace(/[^a-z0-9]/g, "_").replace(/_+/g, "_");

  // Always include base national holidays
  const nationalHd = new Holidays("IN");
  for (const h of nationalHd.getHolidays(year)) {
    const dateStr = h.date.slice(0, 10);
    const key = `${dateStr}_${nameKey(h.name)}`;
    if (!resultMap.has(key)) {
      resultMap.set(key, {
        id:          `lib_national_${dateStr}`,
        name:        h.name,
        date:        dateStr,
        type:        "National",
        category:    "Public holiday",
        description: (h as any).note,
        source:      "library",
        states:      ["ALL"],
      });
    }
  }

  // State-specific
  for (const libCode of libCodesToQuery) {
    try {
      const hd = new Holidays("IN", libCode);
      for (const h of hd.getHolidays(year)) {
        const dateStr = h.date.slice(0, 10);
        const key = `${dateStr}_${nameKey(h.name)}`;
        if (!resultMap.has(key)) {
          // Find our internal code(s) that map to this library code
          const ourCodes = INDIAN_STATES
            .filter(s => s.libraryCode === libCode)
            .map(s => s.code);
          resultMap.set(key, {
            id:          `lib_${libCode}_${dateStr}`,
            name:        h.name,
            date:        dateStr,
            type:        h.type === "public" ? "National" : "Regional",
            category:    "Public holiday",
            description: (h as any).note,
            source:      "library",
            states:      ourCodes.length > 0 ? ourCodes : [libCode],
          });
        }
      }
    } catch {
      // Some state codes may not be supported — skip silently
    }
  }

  // ── Layer 2: supplementary festivals ─────────────────────────────────
  for (const entry of SUPPLEMENTARY) {
    if (!supplementaryApplies(entry, isAll ? ["ALL"] : targetCodes)) continue;
    const dateStr = entry.dates[year];
    if (!dateStr) continue;

    const key = `${dateStr}_${nameKey(entry.name)}`;

    resultMap.set(key, {
      id:          entry.id,
      name:        entry.name,
      date:        dateStr,
      type:        entry.type,
      category:    entry.category,
      description: entry.description,
      source:      "supplementary",
      states:      entry.states,
    });
  }

  // ── Sort by date ─────────────────────────────────────────────────────
  return [...resultMap.values()]
    .sort((a, b) => a.date.localeCompare(b.date));
}

// ── Category colour helper (for ImportHolidaysDialog) ───────────────────────
export const CATEGORY_COLOR: Record<string, string> = {
  "Public holiday":    "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-950 dark:text-violet-300",
  "Hindu festival":    "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300",
  "Muslim festival":   "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300",
  "Christian festival":"bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300",
  "Sikh festival":     "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300",
  "Buddhist festival": "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-300",
  "Jain festival":     "bg-lime-100 text-lime-700 border-lime-200 dark:bg-lime-950 dark:text-lime-300",
  "Cultural festival": "bg-pink-100 text-pink-700 border-pink-200 dark:bg-pink-950 dark:text-pink-300",
};