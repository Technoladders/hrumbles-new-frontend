// src/utils/eduNormalize.ts
// Normalizes education / degree strings so formatting variants
// (M.B.A., Master of Business Administration, MBA) all collapse to the same token.

/** Strip punctuation, lowercase, collapse whitespace */
export function normalizeEduToken(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ') // kill all punctuation
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Synonym dictionary: each entry maps a set of surface forms (already normalised)
 * to a canonical key.  We match by checking whether the normalized input *contains*
 * or *equals* any of the synonyms.
 */
const SYNONYMS: Array<{ key: string; aliases: string[] }> = [
  // ── Masters ──────────────────────────────────────────────────────────────
  {
    key: 'mba',
    aliases: [
      'mba', 'm b a', 'master of business administration',
      'masters of business administration', 'master in business administration',
      'masters in business administration', 'master business administration',
      'masters business administration', 'pgdm', 'pg diploma in management',
      'post graduate diploma in management', 'pgpm', 'mms',
    ],
  },
  {
    key: 'mca',
    aliases: [
      'mca', 'm c a', 'master of computer application',
      'master of computer applications', 'masters of computer application',
      'masters of computer applications', 'master in computer application',
      'master in computer applications', 'master computer application',
    ],
  },
  {
    key: 'mtech',
    aliases: [
      'mtech', 'm tech', 'master of technology', 'masters of technology',
      'master in technology', 'me ', 'm e ', 'master of engineering',
    ],
  },
  {
    key: 'msc',
    aliases: [
      'msc', 'm sc', 'master of science', 'masters of science',
      'master in science', 'm s c',
    ],
  },
  {
    key: 'mcom',
    aliases: [
      'mcom', 'm com', 'master of commerce', 'masters of commerce',
    ],
  },
  {
    key: 'ma',
    aliases: ['ma ', ' m a ', 'master of arts', 'masters of arts'],
  },

  // ── Bachelors ────────────────────────────────────────────────────────────
  {
    key: 'btech',
    aliases: [
      'btech', 'b tech', 'bachelor of technology', 'bachelors of technology',
      'bachelor in technology', 'bachelors in technology',
      'b e ', 'be ', 'bachelor of engineering', 'bachelors of engineering',
      'bachelor in engineering', 'bachelors in engineering',
      'bachelor of engineering technology',
    ],
  },
  {
    key: 'bsc',
    aliases: [
      'bsc', 'b sc', 'bachelor of science', 'bachelors of science',
      'bachelor in science', 'b s c',
    ],
  },
  {
    key: 'bca',
    aliases: [
      'bca', 'b c a', 'bachelor of computer application',
      'bachelor of computer applications', 'bachelors of computer application',
      'bachelor in computer application', 'bachelor computer application',
    ],
  },
  {
    key: 'bcom',
    aliases: [
      'bcom', 'b com', 'bachelor of commerce', 'bachelors of commerce',
      'bachelor in commerce',
    ],
  },
  {
    key: 'bba',
    aliases: [
      'bba', 'b b a', 'bachelor of business administration',
      'bachelors of business administration', 'bachelor in business administration',
    ],
  },
  {
    key: 'ba',
    aliases: ['ba ', ' b a ', 'bachelor of arts', 'bachelors of arts'],
  },

  // ── Diplomas ─────────────────────────────────────────────────────────────
  {
    key: 'diploma',
    aliases: ['diploma', 'dme', 'd m e'],
  },

  // ── Professional ────────────────────────────────────────────────────────
  {
    key: 'ca',
    aliases: [
      'ca ', ' c a ', 'chartered accountant', 'aca ', ' aca',
      'ca inter', 'ca final',
    ],
  },
  {
    key: 'cma',
    aliases: ['cma', 'icwa', 'cost management accountant', 'cost and management accountant'],
  },
  {
    key: 'phd',
    aliases: [
      'phd', 'ph d', 'doctor of philosophy', 'doctorate', 'ph d in',
    ],
  },
  {
    key: 'mbbs',
    aliases: ['mbbs', 'm b b s', 'bachelor of medicine', 'bachelor of surgery'],
  },
];

/** Return canonical key if a match is found, otherwise return the normalised input */
export function canonicalizeEdu(raw: string): string {
  const n = normalizeEduToken(raw);
  for (const { key, aliases } of SYNONYMS) {
    for (const alias of aliases) {
      // exact match or contained in normalised string with word boundaries
      if (n === alias.trim() || n.startsWith(alias.trim()) || n.includes(` ${alias.trim()}`) || n.includes(`${alias.trim()} `)) {
        return key;
      }
    }
  }
  return n;
}

/**
 * Returns true if the stored value matches the search query after normalization.
 * Handles: exact, contains, and synonym expansion.
 */
export function eduMatches(stored: string, query: string): boolean {
  if (!stored || !query) return false;
  const nStored = canonicalizeEdu(stored);
  const nQuery  = canonicalizeEdu(query);
  // also try plain normalize (no synonym) for partial matches
  const pStored = normalizeEduToken(stored);
  const pQuery  = normalizeEduToken(query);
  return (
    nStored === nQuery ||
    nStored.includes(nQuery) ||
    nQuery.includes(nStored) ||
    pStored.includes(pQuery) ||
    pQuery.includes(pStored)
  );
}

/**
 * Group an array of raw education strings into canonical buckets for display.
 * Useful for deduplicating suggestions.
 */
export function groupEducations(raws: string[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const r of raws) {
    const key = canonicalizeEdu(r);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(r);
  }
  return map;
}