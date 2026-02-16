import React from "react";

interface V2QuickStatsProps {
  resumeAnalysis: any;
  parsedMatchedSkills: any[];
  parsedMatchQuality: any;
}

export const V2QuickStats: React.FC<V2QuickStatsProps> = ({
  resumeAnalysis,
  parsedMatchedSkills,
  parsedMatchQuality,
}) => {
  const matched = parsedMatchedSkills.filter((s: any) => s.matched === "yes").length;
  const partial = parsedMatchedSkills.filter((s: any) => s.matched === "partial").length;
  const missing = parsedMatchedSkills.filter((s: any) => s.matched === "no").length;
  const total = parsedMatchedSkills.length;

  const topSkills = resumeAnalysis.top_skills
    ? (Array.isArray(resumeAnalysis.top_skills) ? resumeAnalysis.top_skills : (() => { try { return JSON.parse(resumeAnalysis.top_skills); } catch { return []; } })())
    : [];

  const devGaps = resumeAnalysis.development_gaps
    ? (Array.isArray(resumeAnalysis.development_gaps) ? resumeAnalysis.development_gaps : (() => { try { return JSON.parse(resumeAnalysis.development_gaps); } catch { return []; } })())
    : [];

  const certs = resumeAnalysis.additional_certifications
    ? (Array.isArray(resumeAnalysis.additional_certifications) ? resumeAnalysis.additional_certifications : (() => { try { return JSON.parse(resumeAnalysis.additional_certifications); } catch { return []; } })())
    : [];

  const differentiators = parsedMatchQuality?.key_differentiators || [];

  const stats = [
    {
      label: "Skills Matched",
      value: `${matched}`,
      sub: `of ${total} requirements`,
      accent: "var(--v2-green)",
      trend: `${total > 0 ? Math.round((matched / total) * 100) : 0}% coverage`,
      trendType: matched / total >= 0.7 ? "up" : matched / total >= 0.5 ? "neutral" : "down",
    },
    {
      label: "Partial Matches",
      value: `${partial}`,
      sub: "need verification",
      accent: "var(--v2-amber)",
      trend: partial > 0 ? "Interview probing suggested" : "None found",
      trendType: "neutral",
    },
    {
      label: "Gaps Identified",
      value: `${missing + devGaps.length}`,
      sub: `${missing} missing + ${devGaps.length} development`,
      accent: "var(--v2-red)",
      trend: missing > 2 ? "Significant gaps" : "Manageable",
      trendType: missing > 2 ? "down" : "neutral",
    },
    {
      label: "Certifications",
      value: `${certs.length}`,
      sub: certs.length > 0 ? certs.slice(0, 2).join(", ") : "None listed",
      accent: "var(--v2-primary)",
      trend: certs.length >= 2 ? "Strong credentials" : certs.length === 1 ? "Single cert" : "No certs",
      trendType: certs.length >= 2 ? "up" : "neutral",
    },
  ];

  const getTrendStyle = (type: string) => {
    switch (type) {
      case "up": return { background: "rgba(16,185,129,0.08)", color: "#059669" };
      case "down": return { background: "rgba(239,68,68,0.08)", color: "#DC2626" };
      default: return { background: "rgba(245,158,11,0.08)", color: "#D97706" };
    }
  };

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(4, 1fr)",
      gap: 16,
      marginBottom: 20,
    }}>
      {stats.map((stat, i) => (
        <div
          key={i}
          className={`v2-card v2-animate-in v2-stagger-${i + 1}`}
          style={{ padding: "20px 22px", position: "relative", overflow: "hidden" }}
        >
          {/* Accent bar */}
          <div style={{
            position: "absolute", top: 0, left: 0, width: 3, height: "100%",
            borderRadius: "16px 0 0 16px", background: stat.accent,
          }} />

          <div style={{
            fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase",
            letterSpacing: "1.5px", color: "var(--v2-text-muted)", marginBottom: 8,
          }}>
            {stat.label}
          </div>
          <div style={{
            fontFamily: "'DM Sans', sans-serif", fontSize: "2rem", fontWeight: 800,
            color: stat.accent, lineHeight: 1,
          }}>
            {stat.value}
          </div>
          <div style={{ fontSize: "0.72rem", color: "var(--v2-text-muted)", marginTop: 5 }}>
            {stat.sub}
          </div>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            marginTop: 8, fontSize: "0.7rem", padding: "3px 10px",
            borderRadius: 20, ...getTrendStyle(stat.trendType),
          }}>
            {stat.trend}
          </div>
        </div>
      ))}

      {/* ─── Key Differentiators Row ─── */}
      {differentiators.length > 0 && (
        <div
          className="v2-card v2-animate-in v2-stagger-5"
          style={{
            gridColumn: "1 / -1", padding: "16px 22px",
            display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
          }}
        >
          <span style={{
            fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase",
            letterSpacing: "1.2px", color: "var(--v2-primary)", whiteSpace: "nowrap",
          }}>
            ✦ Key Differentiators
          </span>
          {differentiators.map((d: string, i: number) => (
            <span
              key={i}
              style={{
                fontSize: "0.74rem", color: "var(--v2-text-secondary)",
                padding: "4px 12px", borderRadius: 8,
                background: "var(--v2-primary-50)",
                border: "1px solid var(--v2-primary-100)",
              }}
            >
              {d}
            </span>
          ))}
        </div>
      )}

      {/* ─── Top Skills Chips ─── */}
      {topSkills.length > 0 && (
        <div
          className="v2-card v2-animate-in v2-stagger-5"
          style={{
            gridColumn: "1 / -1", padding: "16px 22px",
            display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
          }}
        >
          <span style={{
            fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase",
            letterSpacing: "1.2px", color: "var(--v2-cyan)", whiteSpace: "nowrap",
          }}>
            Top Skills
          </span>
          {topSkills.map((skill: string, i: number) => (
            <span
              key={i}
              style={{
                fontSize: "0.76rem", fontWeight: 500,
                padding: "5px 14px", borderRadius: 8,
                background: "rgba(6,182,212,0.06)",
                border: "1px solid rgba(6,182,212,0.15)",
                color: "#0E7490",
              }}
            >
              {skill}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};