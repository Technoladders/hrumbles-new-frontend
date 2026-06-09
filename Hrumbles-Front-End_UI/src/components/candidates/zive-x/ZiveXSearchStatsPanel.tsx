// src/components/candidates/zive-x/ZiveXSearchStatsPanel.tsx
//
// Collapsible debug panel that shows what the v8 search hook actually did:
//   • Summary line  ("Searched 352,643 · 3 must · 2 nice · 1 excluded → 47 matched")
//   • Field-match table  (per term: field | mode | hits | capped?)
//   • Query terms sent   (collapsible — raw params Typesense received)
//   • Timing bars        (term searches / hydration / structural / scoring / total)
//
// Why this exists:
//   When a recruiter says "react returned 250 random people not all react devs",
//   the panel makes it instantly obvious whether:
//     - the term hit the right field (skill vs keyword)
//     - the structural filter shrank the pool too aggressively
//     - the term was capped at HARD_TERM_CAP
//   so we can adjust filters without spelunking the network tab.

import { FC, useState } from 'react';
import { ChevronDown, ChevronUp, Activity, Filter, Clock, Search } from 'lucide-react';
import type { SearchStats } from '@/hooks/zive-x/useTypesenseSearch';

interface Props {
  stats?: SearchStats;
}

// purple/violet palette (matches Zive-X design system)
const ACCENT      = '#6D28D9';
const ACCENT_BG   = '#F5F3FF';
const ACCENT_BD   = '#E9D5FF';
const NEUTRAL_FG  = '#475569';
const NEUTRAL_MUT = '#94A3B8';

// ── Mode badge ──────────────────────────────────────────────────────────────
const ModeBadge: FC<{ mode: 'must' | 'nice' | 'exclude' }> = ({ mode }) => {
  const styles = {
    must:    { bg: '#FEE2E2', fg: '#991B1B', label: '✓ must'    },
    nice:    { bg: '#EDE9FE', fg: '#5B21B6', label: '~ nice'    },
    exclude: { bg: '#F1F5F9', fg: '#64748B', label: '✕ exclude' },
  }[mode];
  return (
    <span style={{
      display: 'inline-block', padding: '1px 6px', borderRadius: 3,
      fontSize: 9, fontWeight: 700, background: styles.bg, color: styles.fg,
      whiteSpace: 'nowrap',
    }}>
      {styles.label}
    </span>
  );
};

// ── Timing bar ──────────────────────────────────────────────────────────────
const TimingBar: FC<{ label: string; ms: number; total: number }> = ({ label, ms, total }) => {
  const pct = total > 0 ? Math.min(100, (ms / total) * 100) : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 10 }}>
      <span style={{ width: 96, color: NEUTRAL_FG, flexShrink: 0 }}>{label}</span>
      <div style={{
        flex: 1, height: 8, background: '#F1F5F9', borderRadius: 99, overflow: 'hidden',
      }}>
        <div style={{
          height: '100%', width: `${pct}%`,
          background: `linear-gradient(90deg, ${ACCENT}, #A855F7)`,
          borderRadius: 99, transition: 'width 0.3s',
        }} />
      </div>
      <span style={{ width: 56, textAlign: 'right', color: NEUTRAL_FG, fontFamily: 'monospace', fontSize: 10 }}>
        {ms.toLocaleString()} ms
      </span>
    </div>
  );
};

// ── Main panel ──────────────────────────────────────────────────────────────
const ZiveXSearchStatsPanel: FC<Props> = ({ stats }) => {
  const [open,        setOpen]        = useState(false);
  const [termsOpen,   setTermsOpen]   = useState(false);
  const [rawOpen,     setRawOpen]     = useState(false);

  if (!stats) return null;

  const {
    total_in_org, structural_pool_size, mandatory_pool_size, nice_pool_size,
    excluded_count, final_match_count, shown_count,
    field_match_breakdown, query_terms_sent, timing_ms, summary,
  } = stats;

  // Sort breakdown: must first, then nice, then exclude
  const sortedBreakdown = [...field_match_breakdown].sort((a, b) => {
    const order = { must: 0, nice: 1, exclude: 2 };
    return (order[a.mode] - order[b.mode]) || (b.hits - a.hits);
  });

  return (
    <div style={{
      flexShrink: 0,
      background: 'white',
      borderBottom: '1px solid #E2E8F0',
      fontSize: 11,
    }}>
      {/* ── Header ── */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%', padding: '6px 14px',
          border: 'none', background: open ? ACCENT_BG : 'white',
          borderBottom: open ? `1px solid ${ACCENT_BD}` : 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 10, cursor: 'pointer', transition: 'background 0.1s',
        }}
        onMouseEnter={e => { if (!open) (e.currentTarget as HTMLElement).style.background = '#FAFAFE'; }}
        onMouseLeave={e => { if (!open) (e.currentTarget as HTMLElement).style.background = 'white'; }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <Activity size={11} style={{ color: ACCENT, flexShrink: 0 }} />
          <span style={{
            fontSize: 10, fontWeight: 700, color: ACCENT,
            textTransform: 'uppercase', letterSpacing: '0.5px', flexShrink: 0,
          }}>
            Search Stats
          </span>
          <span style={{
            fontSize: 11, color: NEUTRAL_FG,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {summary}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <span style={{ fontSize: 10, color: NEUTRAL_MUT, fontFamily: 'monospace' }}>
            {timing_ms.total} ms
          </span>
          {open
            ? <ChevronUp size={12} style={{ color: ACCENT }} />
            : <ChevronDown size={12} style={{ color: NEUTRAL_MUT }} />
          }
        </div>
      </button>

      {/* ── Expanded content ── */}
      {open && (
        <div style={{ padding: '10px 14px 12px', background: ACCENT_BG }}>

          {/* ── Pool counts ── */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
            gap: 8, marginBottom: 12,
          }}>
            {[
              { label: 'Total in org',  value: total_in_org,         hint: 'All candidates indexed for your org' },
              { label: 'After filters', value: structural_pool_size, hint: 'Pool after structural filters (exp, location, notice, CTC)' },
              { label: 'Must matches',  value: mandatory_pool_size,  hint: 'Candidates matching ALL must terms (∩)' },
              { label: 'Nice matches',  value: nice_pool_size,       hint: 'Candidates matching ANY nice term (∪)' },
              { label: 'Excluded',      value: excluded_count,       hint: 'Candidates removed by exclude terms' },
              { label: 'Final result',  value: final_match_count,    hint: 'After all combinations', accent: true },
            ].map(c => (
              <div key={c.label}
                title={c.hint}
                style={{
                  padding: 8, borderRadius: 6, background: 'white',
                  border: `1px solid ${c.accent ? ACCENT : '#E2E8F0'}`,
                  cursor: 'help',
                }}>
                <div style={{
                  fontSize: 8, fontWeight: 700, color: NEUTRAL_MUT,
                  textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 2,
                }}>
                  {c.label}
                </div>
                <div style={{
                  fontSize: 14, fontWeight: 700,
                  color: c.accent ? ACCENT : '#0F172A',
                  fontFamily: 'monospace',
                }}>
                  {c.value.toLocaleString()}
                </div>
              </div>
            ))}
          </div>

          {/* ── Showing N of M ── */}
          {shown_count < final_match_count && (
            <div style={{
              padding: '5px 8px', marginBottom: 10, borderRadius: 5,
              background: '#FEF3C7', color: '#92400E', fontSize: 10, fontWeight: 500,
              display: 'flex', alignItems: 'center', gap: 5,
            }}>
              <Filter size={10} />
              Showing top <strong>{shown_count.toLocaleString()}</strong> of <strong>{final_match_count.toLocaleString()}</strong> matches
              (perf cap — refine filters to narrow).
            </div>
          )}

          {/* ── Field match breakdown ── */}
          {sortedBreakdown.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{
                fontSize: 9, fontWeight: 700, color: NEUTRAL_MUT,
                textTransform: 'uppercase', letterSpacing: '0.5px',
                marginBottom: 5, display: 'flex', alignItems: 'center', gap: 5,
              }}>
                <Search size={9} /> Per-term hit counts
              </div>
              <div style={{
                background: 'white', borderRadius: 6, border: '1px solid #E2E8F0',
                overflow: 'hidden',
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
                  <thead>
                    <tr style={{ background: '#FAFAFA', borderBottom: '1px solid #E2E8F0' }}>
                      <th style={th}>Field</th>
                      <th style={th}>Term</th>
                      <th style={th}>Mode</th>
                      <th style={{ ...th, textAlign: 'right' }}>Hits</th>
                      <th style={th}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedBreakdown.map((row, i) => (
                      <tr key={i} style={{
                        borderBottom: i < sortedBreakdown.length - 1 ? '1px solid #F1F5F9' : 'none',
                      }}>
                        <td style={td}>{row.field}</td>
                        <td style={{ ...td, fontFamily: 'monospace', color: '#0F172A', fontWeight: 600 }}>
                          {row.term}
                        </td>
                        <td style={td}><ModeBadge mode={row.mode} /></td>
                        <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace', color: row.hits === 0 ? '#DC2626' : NEUTRAL_FG }}>
                          {row.hits.toLocaleString()}
                        </td>
                        <td style={td}>
                          {row.hits === 0 ? (
                            <span style={{ fontSize: 9, color: '#DC2626', fontWeight: 600 }}>0 matches</span>
                          ) : row.capped ? (
                            <span style={{ fontSize: 9, color: '#D97706', fontWeight: 600 }}>capped</span>
                          ) : (
                            <span style={{ fontSize: 9, color: '#10B981' }}>OK</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Timing ── */}
          <div style={{ marginBottom: 10 }}>
            <div style={{
              fontSize: 9, fontWeight: 700, color: NEUTRAL_MUT,
              textTransform: 'uppercase', letterSpacing: '0.5px',
              marginBottom: 5, display: 'flex', alignItems: 'center', gap: 5,
            }}>
              <Clock size={9} /> Timing
            </div>
            <div style={{
              padding: 10, background: 'white', borderRadius: 6,
              border: '1px solid #E2E8F0',
              display: 'flex', flexDirection: 'column', gap: 5,
            }}>
              <TimingBar label="Term searches" ms={timing_ms.term_searches} total={timing_ms.total} />
              <TimingBar label="Structural"    ms={timing_ms.structural}    total={timing_ms.total} />
              <TimingBar label="Hydration"     ms={timing_ms.hydration}     total={timing_ms.total} />
              <TimingBar label="Scoring"       ms={timing_ms.scoring}       total={timing_ms.total} />
              <div style={{ height: 1, background: '#E2E8F0', margin: '3px 0' }} />
              <TimingBar label="Total"         ms={timing_ms.total}         total={timing_ms.total} />
            </div>
          </div>

          {/* ── Raw query terms (advanced) ── */}
          {query_terms_sent.length > 0 && (
            <div>
              <button type="button"
                onClick={() => setTermsOpen(v => !v)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                  display: 'flex', alignItems: 'center', gap: 4, fontSize: 9,
                  fontWeight: 700, color: NEUTRAL_MUT,
                  textTransform: 'uppercase', letterSpacing: '0.5px',
                }}>
                {termsOpen ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                Raw Typesense queries ({query_terms_sent.length})
              </button>
              {termsOpen && (
                <div style={{
                  marginTop: 5, padding: 8, borderRadius: 6,
                  background: '#1E293B', color: '#E2E8F0',
                  fontSize: 9, fontFamily: 'monospace',
                  maxHeight: 280, overflowY: 'auto',
                  border: '1px solid #334155',
                }}>
                  {query_terms_sent.map((qt, i) => (
                    <div key={i} style={{
                      marginBottom: 7, paddingBottom: 7,
                      borderBottom: i < query_terms_sent.length - 1 ? '1px solid #334155' : 'none',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                        <span style={{ color: '#A78BFA', fontWeight: 700 }}>{qt.field}</span>
                        <span style={{ color: '#64748B' }}>·</span>
                        <ModeBadge mode={qt.mode} />
                        <span style={{ color: '#94A3B8' }}>"{qt.term}"</span>
                      </div>
                      <div style={{ paddingLeft: 8, color: '#94A3B8', lineHeight: 1.5, wordBreak: 'break-all' }}>
                        {Object.entries(qt.params).map(([k, v]) => (
                          <div key={k}>
                            <span style={{ color: '#7C3AED' }}>{k}</span>
                            <span style={{ color: '#64748B' }}>=</span>
                            <span style={{ color: '#E2E8F0' }}>{v}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Full raw stats JSON (deepest debug) ── */}
          <div style={{ marginTop: 10 }}>
            <button type="button"
              onClick={() => setRawOpen(v => !v)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                display: 'flex', alignItems: 'center', gap: 4, fontSize: 9,
                fontWeight: 700, color: NEUTRAL_MUT,
                textTransform: 'uppercase', letterSpacing: '0.5px',
              }}>
              {rawOpen ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
              Raw stats JSON
            </button>
            {rawOpen && (
              <pre style={{
                marginTop: 5, padding: 8, borderRadius: 6,
                background: '#1E293B', color: '#E2E8F0',
                fontSize: 9, fontFamily: 'monospace',
                maxHeight: 200, overflow: 'auto',
                border: '1px solid #334155',
                whiteSpace: 'pre-wrap', wordBreak: 'break-all',
              }}>
                {JSON.stringify(stats, null, 2)}
              </pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const th: React.CSSProperties = {
  padding: '5px 8px', textAlign: 'left', fontSize: 9, fontWeight: 700,
  color: NEUTRAL_MUT, textTransform: 'uppercase', letterSpacing: '0.4px',
};
const td: React.CSSProperties = {
  padding: '5px 8px', fontSize: 10, color: NEUTRAL_FG, verticalAlign: 'middle',
};

export default ZiveXSearchStatsPanel;
// new index resume text