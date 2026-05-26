import React from "react";

interface V2ResumeAnalysisProps {
  view: "validation" | "scoring";
  resumeAnalysis: any;
  parsedMatchedSkills: any[];
  parsedSectionScoring: any[];
  parsedMatchQuality: any;
  parsedResumeQuality: any;
  shareMode?: boolean;
  currentDataOptions?: any;
}

export const V2ResumeAnalysis: React.FC<V2ResumeAnalysisProps> = ({
  view,
  resumeAnalysis,
  parsedMatchedSkills,
  parsedSectionScoring,
  parsedMatchQuality,
  parsedResumeQuality,
}) => {
  const parseArr = (v: any) => {
    if (Array.isArray(v)) return v;
    if (typeof v === "string") { try { return JSON.parse(v); } catch { return []; } }
    return [];
  };

  const topSkills    = parseArr(resumeAnalysis?.top_skills);
  const devGaps      = parseArr(resumeAnalysis?.development_gaps);
  const certs        = parseArr(resumeAnalysis?.additional_certifications);
  const missingAreas = parseArr(resumeAnalysis?.missing_or_weak_areas);

  const ACCENT  = "#6D28D9";
  const ACCENT2 = "#7C3AED";
  const CYAN    = "#0891B2";
  const SUCCESS = "#059669";
  const WARN    = "#D97706";
  const DANGER  = "#DC2626";

  const barColor = (s: number) => {
    if (s >= 8) return "#10B981";
    if (s >= 6) return "#06B6D4";
    if (s >= 4) return "#F59E0B";
    return "#EF4444";
  };

  const getStatusTag = (matched: string) => {
    const base: React.CSSProperties = { display: "inline-flex", alignItems: "center", fontSize: 9, fontWeight: 600, padding: "2px 7px", borderRadius: 6 };
    if (matched === "yes")     return <span style={{ ...base, background: "rgba(5,150,105,0.08)",  color: SUCCESS, border: "1px solid rgba(5,150,105,0.2)"  }}>✓ Matched</span>;
    if (matched === "partial") return <span style={{ ...base, background: "rgba(217,119,6,0.08)", color: WARN,    border: "1px solid rgba(217,119,6,0.2)"   }}>~ Partial</span>;
    return                            <span style={{ ...base, background: "rgba(220,38,38,0.08)", color: DANGER,  border: "1px solid rgba(220,38,38,0.2)"   }}>✗ Missing</span>;
  };

  const getScorePill = (score: number) => {
    const col = score >= 8 ? SUCCESS : score >= 5 ? WARN : DANGER;
    const bg  = score >= 8 ? "rgba(5,150,105,0.1)" : score >= 5 ? "rgba(217,119,6,0.1)" : "rgba(220,38,38,0.1)";
    return <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, borderRadius: "50%", fontFamily: "monospace", fontSize: 10, fontWeight: 700, background: bg, color: col }}>{score}</span>;
  };

    const getBarColor = (score: number) => {
    if (score >= 8) return "linear-gradient(90deg, #10B981, #06B6D4)";
    if (score >= 6) return "linear-gradient(90deg, #7C3AED, #06B6D4)";
    if (score >= 4) return "linear-gradient(90deg, #F59E0B, #f97316)";
    return "#EF4444";
  };

  const sectionCard: React.CSSProperties = {
    background: "#fff", borderRadius: 10, border: "1px solid #EDE9FE",
    boxShadow: "0 1px 4px rgba(109,40,217,0.06)", overflow: "hidden",
  };
  const sectionHeader: React.CSSProperties = {
    padding: "8px 14px", borderBottom: "1px solid #F5F3FF",
    display: "flex", alignItems: "center", gap: 6,
  };
  const sectionHeaderLabel: React.CSSProperties = {
    fontSize: 8, fontWeight: 800, textTransform: "uppercase",
    letterSpacing: "1.2px", color: "#9CA3AF",
  };

  /* ─── VALIDATION VIEW ─── */
  if (view === "validation") {
    return (
      <div>
        <style>{`
          .ra-val-table { width:100%; border-collapse:collapse; min-width:520px; }
          .ra-val-table thead tr { background: linear-gradient(135deg,#6D28D9,#7C3AED); }
          .ra-val-table th { padding:6px 10px; text-align:left; font-size:8px; font-weight:700; color:rgba(255,255,255,0.85); text-transform:uppercase; letter-spacing:0.5px; white-space:nowrap; }
          .ra-val-table td { padding:6px 10px; font-size:10px; border-bottom:1px solid #F5F3FF; vertical-align:middle; }
          .ra-val-table tr:last-child td { border-bottom:none; }
          .ra-val-table tbody tr:nth-child(even) td { background:#FAFAF9; }
          .ra-val-table tbody tr:hover td { background:#F5F3FF; }
        `}</style>

        {/* Methodology */}
        <div style={{ ...sectionCard, padding: "10px 14px", marginBottom: 10, background: "linear-gradient(135deg,rgba(6,182,212,0.04),rgba(109,40,217,0.03))", border: "1px solid rgba(6,182,212,0.12)" }}>
          <div style={{ fontSize: 8, fontWeight: 800, textTransform: "uppercase" as const, letterSpacing: "1.2px", color: CYAN, marginBottom: 4 }}>💡 Validation Methodology</div>
          <p style={{ fontSize: 10, color: "#374151", lineHeight: 1.6, margin: 0 }}>
            Each requirement scored 1–10 from resume evidence. "Matched" = explicit verifiable evidence. "Partial" = indirect/implied. "Missing" = no evidence found.
          </p>
        </div>

        {/* Requirements Table */}
        <div style={{ ...sectionCard, marginBottom: 10 }}>
          <div style={{ ...sectionHeader, justifyContent: "space-between" }}>
            <span style={sectionHeaderLabel}>Skill & Requirement Validation</span>
            <span style={{ fontSize: 9, padding: "2px 8px", borderRadius: 20, background: "#F5F3FF", color: "#9CA3AF" }}>{parsedMatchedSkills.length} requirements</span>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table className="ra-val-table">
              <thead>
                <tr>
                  <th style={{ width: "28%" }}>Requirement</th>
                  <th style={{ width: "11%" }}>Status</th>
                  <th style={{ width: "40%" }}>Evidence / Details</th>
                  <th style={{ width: "10%" }}>Recency</th>
                  <th style={{ width: "11%", textAlign: "center" }}>Score</th>
                </tr>
              </thead>
              <tbody>
                {parsedMatchedSkills.map((skill: any, i: number) => (
                  <tr key={i}>
                    <td><div style={{ fontWeight: 600, color: "#374151" }}>{skill.requirement}</div></td>
                    <td>{getStatusTag(skill.matched)}</td>
                    <td><div style={{ color: "#6B7280", lineHeight: 1.5 }}>{skill.details || skill.evidence || "—"}</div></td>
                    <td><span style={{ fontSize: 9, color: skill.recency === "current" ? SUCCESS : "#9CA3AF" }}>{skill.recency || "—"}</span></td>
                    <td style={{ textAlign: "center" }}>{getScorePill(skill.score || 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Gaps & Right column */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
          {/* Gaps */}
          <div style={{ ...sectionCard }}>
            <div style={{ ...sectionHeader }}>
              <div style={{ width: 3, height: 12, borderRadius: 2, background: DANGER }} />
              <span style={{ ...sectionHeaderLabel, color: DANGER }}>🔴 Gaps & Weak Areas</span>
            </div>
            <div style={{ padding: "10px 14px" }}>
              {(() => {
                const allGaps = [...devGaps, ...missingAreas].filter((item, idx, arr) => {
                  const key = (typeof item === "string" ? item : item?.name || "").toLowerCase();
                  return key && arr.findIndex((x) => (typeof x === "string" ? x : x?.name || "").toLowerCase() === key) === idx;
                });
                if (allGaps.length === 0) return <p style={{ fontSize: 10, color: "#9CA3AF", textAlign: "center", padding: 12 }}>No gaps identified</p>;
                return allGaps.map((gap: any, i: number) => {
                  const text = typeof gap === "string" ? gap : gap?.name || gap;
                  const isFromMissing = missingAreas.some((m: any) => (typeof m === "string" ? m : m?.name || "").toLowerCase() === text.toLowerCase());
                  const isFromDev     = devGaps.some((d: any) => (typeof d === "string" ? d : d?.name || "").toLowerCase() === text.toLowerCase());
                  let severity = "HIGH · Development gap";
                  let bgColor = "rgba(239,68,68,0.04)"; let borderColor = "rgba(239,68,68,0.1)"; let textColor = DANGER; let icon = "⚠";
                  if (isFromMissing && isFromDev) { severity = "CRITICAL · Missing & Dev Gap"; bgColor = "rgba(239,68,68,0.06)"; borderColor = "rgba(239,68,68,0.2)"; }
                  else if (isFromMissing) { severity = "CRITICAL · Missing Req."; bgColor = "rgba(245,158,11,0.04)"; borderColor = "rgba(245,158,11,0.1)"; textColor = WARN; icon = "△"; }
                  return (
                    <div key={i} style={{ display: "flex", gap: 8, padding: "8px 10px", borderRadius: 8, background: bgColor, border: `1px solid ${borderColor}`, marginBottom: 6 }}>
                      <span style={{ fontSize: 10, flexShrink: 0 }}>{icon}</span>
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 600, color: textColor }}>{text}</div>
                        <div style={{ fontSize: 8, color: textColor, opacity: 0.8, marginTop: 1 }}>{severity}</div>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>

          {/* Certs + Top Skills */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ ...sectionCard }}>
              <div style={{ ...sectionHeader }}>
                <div style={{ width: 3, height: 12, borderRadius: 2, background: SUCCESS }} />
                <span style={{ ...sectionHeaderLabel, color: SUCCESS }}>🏅 Certifications</span>
              </div>
              <div style={{ padding: "10px 14px" }}>
                {certs.length > 0 ? (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {certs.map((cert: string, i: number) => (
                      <span key={i} style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 6, background: "#F5F3FF", border: "1px solid #EDE9FE", fontSize: 10, color: ACCENT, fontWeight: 500 }}>
                        🏅 {cert}
                      </span>
                    ))}
                  </div>
                ) : <p style={{ fontSize: 10, color: "#9CA3AF" }}>No certifications listed</p>}
              </div>
            </div>
            <div style={{ ...sectionCard }}>
              <div style={{ ...sectionHeader }}>
                <div style={{ width: 3, height: 12, borderRadius: 2, background: CYAN }} />
                <span style={{ ...sectionHeaderLabel, color: CYAN }}>✦ Top Skills</span>
              </div>
              <div style={{ padding: "10px 14px", display: "flex", flexWrap: "wrap", gap: 6 }}>
                {topSkills.map((skill: string, i: number) => (
                  <span key={i} style={{ padding: "3px 10px", borderRadius: 20, background: "rgba(8,145,178,0.06)", border: "1px solid rgba(8,145,178,0.15)", fontSize: 10, color: "#0E7490", fontWeight: 500 }}>
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ─── SCORING VIEW ─── */
  const validSections = parsedSectionScoring.filter((s: any) => s.weightage > 0);

  return (
    <div>
      <style>{`
        .ra-score-table { width:100%; border-collapse:collapse; min-width:520px; }
        .ra-score-table thead tr { background: linear-gradient(135deg,#6D28D9,#7C3AED); }
        .ra-score-table th { padding:6px 10px; text-align:left; font-size:8px; font-weight:700; color:rgba(255,255,255,0.85); text-transform:uppercase; letter-spacing:0.5px; }
        .ra-score-table td { padding:6px 10px; font-size:10px; border-bottom:1px solid #F5F3FF; vertical-align:middle; }
        .ra-score-table tr:last-child td { border-bottom:none; }
        .ra-score-table tbody tr:nth-child(even) td { background:#FAFAF9; }
      `}</style>

      {/* Stat cards for sections */}
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(validSections.length, 4)}, 1fr)`, gap: 10, marginBottom: 10 }}>
        {validSections.map((section: any, i: number) => {
          const avgScore   = section.submenus?.length > 0 ? section.submenus.reduce((t: number, sm: any) => t + (sm.score || 0), 0) / section.submenus.length : 0;
          const contribution = (avgScore * section.weightage) / 100;
          const col = avgScore >= 8 ? SUCCESS : avgScore >= 5 ? WARN : DANGER;
          return (
            <div key={i} style={{ background: "#fff", borderRadius: 10, border: "1px solid #EDE9FE", padding: "10px 14px", position: "relative", overflow: "hidden", boxShadow: "0 1px 4px rgba(109,40,217,0.06)" }}>
              <div style={{ position: "absolute", top: 0, left: 0, width: 3, height: "100%", background: barColor(avgScore), borderRadius: "10px 0 0 10px" }} />
              <div style={{ fontSize: 8, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "1px", color: "#9CA3AF", marginBottom: 5 }}>{section.section}</div>
              <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1, color: col }}>{contribution.toFixed(1)}</div>
              <div style={{ fontSize: 9, color: "#6B7280", marginTop: 4 }}>Weighted from {section.weightage}% section</div>
              <div style={{ display: "inline-flex", padding: "2px 8px", borderRadius: 20, marginTop: 6, fontSize: 8, background: "rgba(109,40,217,0.06)", color: ACCENT }}>
                Avg: {avgScore.toFixed(1)}/10
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
        {/* Section breakdown table */}
      <div className="v2-card" style={{ padding: 24 }}>
          <div style={{
            fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase",
            letterSpacing: "1.5px", color: "var(--v2-text-muted)", marginBottom: 18,
          }}>
            Section-Wise Breakdown
          </div>

          {parsedSectionScoring.map((section: any, i: number) => {
            const avgScore = section.submenus?.length > 0
              ? section.submenus.reduce((t: number, sm: any) => t + (sm.score || 0), 0) / section.submenus.length
              : 0;

            return (
              <div key={i} style={{ marginBottom: 18 }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 12, marginBottom: 6,
                }}>
                  <span style={{ fontSize: "0.84rem", fontWeight: 600, color: "var(--v2-text)", flex: 1 }}>
                    {section.section}
                  </span>
                  <span style={{ fontFamily: "var(--v2-mono)", fontSize: "0.72rem", color: "var(--v2-text-muted)" }}>
                    {section.weightage}%
                  </span>
                  <div className="v2-dim-track" style={{ maxWidth: 120 }}>
                    <div className="v2-dim-fill" style={{
                      width: `${avgScore * 10}%`,
                      background: getBarColor(avgScore),
                    }} />
                  </div>
                  <span style={{
                    fontFamily: "var(--v2-mono)", fontSize: "0.78rem", fontWeight: 700,
                    color: avgScore >= 8 ? "var(--v2-green)" : avgScore >= 5 ? "var(--v2-amber)" : "var(--v2-red)",
                    width: 36, textAlign: "right",
                  }}>
                    {avgScore > 0 ? avgScore.toFixed(1) : "—"}
                  </span>
                </div>

                {/* Sub-menus */}
                {section.submenus?.map((sm: any, si: number) => (
                  <div key={si} style={{
                    paddingLeft: 20, marginTop: 4,
                    fontSize: "0.74rem", color: "var(--v2-text-secondary)",
                    display: "flex", gap: 8, alignItems: "baseline",
                  }}>
                    <span style={{ width: 140, flexShrink: 0 }}>{sm.submenu}</span>
                    <span style={{ fontFamily: "var(--v2-mono)", fontSize: "0.72rem", color: "var(--v2-text-muted)" }}>
                      {sm.score}/10
                    </span>
                    <span style={{ fontSize: "0.68rem", color: "var(--v2-text-muted)", fontStyle: "italic" }}>
                      {sm.remarks}
                    </span>
                  </div>
                ))}

                {section.remarks && !section.submenus?.length && (
                  <div style={{ paddingLeft: 20, fontSize: "0.72rem", color: "var(--v2-text-muted)", fontStyle: "italic" }}>
                    {section.remarks}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Score Summary */}
        <div style={{ ...sectionCard, padding: "12px 16px" }}>
          <div className="ov-lbl" style={{ marginBottom: 10, fontSize: 8, fontWeight: 800, textTransform: "uppercase" as const, letterSpacing: "1.2px", color: "#9CA3AF" }}>Score Summary</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", borderRadius: 8, background: "rgba(109,40,217,0.03)", border: "1px solid #EDE9FE" }}>
              <span style={{ fontSize: 11, color: "#374151" }}>Overall Match Score</span>
              <span style={{ fontFamily: "monospace", fontSize: 14, fontWeight: 700, color: resumeAnalysis.overall_score >= 80 ? SUCCESS : resumeAnalysis.overall_score >= 60 ? WARN : DANGER }}>
                {resumeAnalysis.overall_score} / 100
              </span>
            </div>
            {parsedMatchQuality?.hiring_recommendation && (
              <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "10px 12px", borderRadius: 8,
                background: parsedMatchQuality.hiring_recommendation === "yes" ? "rgba(5,150,105,0.04)" : "rgba(245,158,11,0.04)",
                border: `1px solid ${parsedMatchQuality.hiring_recommendation === "yes" ? "rgba(5,150,105,0.15)" : "rgba(245,158,11,0.15)"}`,
              }}>
                <span style={{ fontSize: 11, color: "#374151" }}>Recommendation</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: parsedMatchQuality.hiring_recommendation === "yes" ? SUCCESS : WARN }}>
                  {parsedMatchQuality.hiring_recommendation === "yes" ? "✓ Hire" : "⚖ Review"} · {parsedMatchQuality.confidence_level || "—"}
                </span>
              </div>
            )}

            {/* Per-section contribution bars */}
            {validSections.length > 0 && (
              <div style={{ marginTop: 4 }}>
                <div style={{ fontSize: 8, fontWeight: 800, textTransform: "uppercase" as const, letterSpacing: "1.2px", color: "#9CA3AF", marginBottom: 8 }}>Section Contributions</div>
                {validSections.map((section: any, i: number) => {
                  const avgScore = section.submenus?.length > 0 ? section.submenus.reduce((t: number, sm: any) => t + (sm.score || 0), 0) / section.submenus.length : 0;
                  return (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <div style={{ fontSize: 9, color: "#374151", width: 120, flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{section.section}</div>
                      <div style={{ flex: 1, height: 5, background: "#F5F3FF", borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${avgScore * 10}%`, background: `linear-gradient(90deg,${barColor(avgScore)},${barColor(avgScore)}bb)`, borderRadius: 3, transition: "width 0.7s ease" }} />
                      </div>
                      <div style={{ fontFamily: "monospace", fontSize: 9, fontWeight: 700, color: barColor(avgScore), width: 32, textAlign: "right", flexShrink: 0 }}>{avgScore > 0 ? avgScore.toFixed(1) : "—"}</div>
                      <div style={{ fontSize: 8, color: "#9CA3AF", width: 28, flexShrink: 0 }}>{section.weightage}%</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};