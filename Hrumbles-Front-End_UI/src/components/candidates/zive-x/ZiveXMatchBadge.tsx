// src/components/candidates/zive-x/ZiveXMatchBadge.tsx  v2
// 
// Score colour ramp uses _relevance_score (0–100, hook-normalised):
//   ≥ 75 → green    (strong match)
//   ≥ 50 → amber    (good match)
//   ≥ 40 → orange   (moderate, still a "matched" profile)
//    < 40 → grey/slate (suggested)
//
// compact=true  → single pill only (for table rows)
// compact=false → pill + filter-hit labels (for card view)

import { FC } from 'react';
import type { MatchDetail } from '@/utils/ziveXMatchScore';

interface ZiveXMatchBadgeProps {
  detail:   MatchDetail;
  compact?: boolean;
}

function scoreColors(score: number): { bg: string; fg: string; border: string } {
  if (score >= 75) return { bg: '#DCFCE7', fg: '#15803D', border: '#86EFAC' };
  if (score >= 50) return { bg: '#FEF3C7', fg: '#B45309', border: '#FCD34D' };
  if (score >= 40) return { bg: '#FFEDD5', fg: '#C2410C', border: '#FDBA74' };
  return           { bg: '#F1F5F9', fg: '#64748B', border: '#CBD5E1' };
}

const ZiveXMatchBadge: FC<ZiveXMatchBadgeProps> = ({ detail, compact = false }) => {
  const { bg, fg, border } = scoreColors(detail.score);

  if (compact) {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 3,
        padding: '1px 7px', borderRadius: 99, fontSize: 9, fontWeight: 700,
        background: bg, color: fg, border: `1px solid ${border}`,
        whiteSpace: 'nowrap', letterSpacing: '0.2px',
      }}>
        {detail.score}%
      </span>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {/* Score pill */}
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '2px 9px', borderRadius: 99, fontSize: 11, fontWeight: 700,
        background: bg, color: fg, border: `1px solid ${border}`,
        alignSelf: 'flex-start', letterSpacing: '0.3px',
      }}>
        {detail.score}% match
      </span>

      {/* Hit-label chips */}
      {detail.matched.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
          {detail.matched.map(b => (
            <span key={b.label} style={{
              display: 'inline-flex', alignItems: 'center', gap: 3,
              padding: '1px 6px', borderRadius: 4, fontSize: 8, fontWeight: 600,
              background: '#F5F3FF', color: '#5B21B6', border: '1px solid #C4B5FD',
              whiteSpace: 'nowrap',
            }}>
              <span style={{ fontSize: 8 }}>{b.icon}</span>{b.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default ZiveXMatchBadge;