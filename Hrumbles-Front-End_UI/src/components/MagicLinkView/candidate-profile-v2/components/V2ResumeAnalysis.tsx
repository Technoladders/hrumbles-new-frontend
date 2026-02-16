import React from "react";

interface V2ResumeAnalysisProps {
  view: "validation" | "scoring";
  resumeAnalysis: any;
  parsedMatchedSkills: any[];
  parsedSectionScoring: any[];
  parsedMatchQuality: any;
  parsedResumeQuality: any;
}

export const V2ResumeAnalysis: React.FC<V2ResumeAnalysisProps> = ({
  view,
  resumeAnalysis,
  parsedMatchedSkills,
  parsedSectionScoring,
  parsedMatchQuality,
  parsedResumeQuality,
}) => {
  // Parse arrays safely
  const parseArr = (v: any) => {
    if (Array.isArray(v)) return v;
    if (typeof v === "string") { try { return JSON.parse(v); } catch { return []; } }
    return [];
  };

  const topSkills = parseArr(resumeAnalysis?.top_skills);
  const devGaps = parseArr(resumeAnalysis?.development_gaps);
  const certs = parseArr(resumeAnalysis?.additional_certifications);
  const missingAreas = parseArr(resumeAnalysis?.missing_or_weak_areas);

  const getStatusTag = (matched: string) => {
    switch (matched) {
      case "yes": return <span className="v2-tag v2-tag-green">✔ Matched</span>;
      case "partial": return <span className="v2-tag v2-tag-amber">~ Partial</span>;
      case "no": return <span className="v2-tag v2-tag-red">✗ Missing</span>;
      default: return <span className="v2-tag v2-tag-amber">—</span>;
    }
  };

  const getScorePill = (score: number) => {
    const cls = score >= 8 ? "v2-sp-high" : score >= 5 ? "v2-sp-mid" : "v2-sp-low";
    return <span className={`v2-score-pill ${cls}`}>{score}</span>;
  };

  const getBarColor = (score: number) => {
    if (score >= 8) return "linear-gradient(90deg, #10B981, #06B6D4)";
    if (score >= 6) return "linear-gradient(90deg, #7C3AED, #06B6D4)";
    if (score >= 4) return "linear-gradient(90deg, #F59E0B, #f97316)";
    return "#EF4444";
  };

  // ─── VALIDATION VIEW ───
  if (view === "validation") {
    return (
      <div className="v2-animate-in">
        {/* Methodology note */}
        <div
          className="v2-card"
          style={{
            padding: "16px 20px", marginBottom: 20,
            background: "linear-gradient(135deg, rgba(6,182,212,0.04), rgba(124,58,237,0.03))",
            border: "1px solid rgba(6,182,212,0.12)",
          }}
        >
          <div style={{
            fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase",
            letterSpacing: "1.5px", color: "var(--v2-cyan)", marginBottom: 6,
            display: "flex", alignItems: "center", gap: 6,
          }}>
            💡 Validation Methodology
          </div>
          <p style={{ fontSize: "0.82rem", color: "var(--v2-text-secondary)", lineHeight: 1.6 }}>
            Each requirement is scored 1–10 based on direct evidence from the resume.
            "Matched" = explicit verifiable evidence. "Partial" = indirect/implied.
            "Missing" = no evidence found.
          </p>
        </div>

        {/* Requirements Table */}
        <div className="v2-card" style={{ padding: 0, marginBottom: 20, overflow: "hidden" }}>
          <div style={{
            padding: "18px 24px", borderBottom: "1px solid var(--v2-border2)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <span style={{
              fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase",
              letterSpacing: "1.5px", color: "var(--v2-text-muted)",
            }}>
              Skill & Requirement Validation
            </span>
            <span style={{
              fontSize: "0.65rem", padding: "3px 10px", borderRadius: 12,
              background: "var(--v2-primary-50)", color: "var(--v2-text-muted)",
            }}>
              {parsedMatchedSkills.length} requirements
            </span>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table className="v2-req-table">
              <thead>
                <tr>
                  <th style={{ width: "30%", paddingLeft: 24 }}>Requirement</th>
                  <th style={{ width: "12%" }}>Status</th>
                  <th style={{ width: "38%" }}>Evidence / Details</th>
                  <th style={{ width: "10%" }}>Recency</th>
                  <th style={{ width: "10%", textAlign: "center" }}>Score</th>
                </tr>
              </thead>
              <tbody>
                {parsedMatchedSkills.map((skill: any, i: number) => (
                  <tr key={i}>
                    <td style={{ paddingLeft: 24 }}>
                      <div style={{ fontWeight: 600, color: "var(--v2-text)", fontSize: "0.82rem" }}>
                        {skill.requirement}
                      </div>
                    </td>
                    <td>{getStatusTag(skill.matched)}</td>
                    <td>
                      <div style={{ fontSize: "0.76rem", color: "var(--v2-text-secondary)", lineHeight: 1.5 }}>
                        {skill.details || skill.evidence || "—"}
                      </div>
                    </td>
                    <td>
                      <span style={{
                        fontSize: "0.72rem",
                        color: skill.recency === "current" ? "#059669" : "var(--v2-text-muted)",
                      }}>
                        {skill.recency || "—"}
                      </span>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      {getScorePill(skill.score || 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Gaps & Strengths side by side */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 20 }}>
          {/* Development Gaps */}
          <div className="v2-card" style={{ padding: 24 }}>
            <div style={{
              fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase",
              letterSpacing: "1.5px", color: "var(--v2-red)", marginBottom: 16,
            }}>
              🔴 Development Gaps
            </div>
            {devGaps.length > 0 ? devGaps.map((gap: string, i: number) => (
              <div
                key={i}
                style={{
                  display: "flex", gap: 12, padding: "12px 14px", borderRadius: 10,
                  background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.1)",
                  marginBottom: 8,
                }}
              >
                <span style={{ fontSize: "0.85rem", flexShrink: 0 }}>⚠</span>
                <div>
                  <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "#DC2626" }}>{gap}</div>
                </div>
              </div>
            )) : (
              <p style={{ fontSize: "0.82rem", color: "var(--v2-text-muted)", textAlign: "center", padding: 16 }}>
                No development gaps identified
              </p>
            )}

            {missingAreas.length > 0 && (
              <>
                <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "var(--v2-amber)", marginTop: 16, marginBottom: 8, textTransform: "uppercase", letterSpacing: "1px" }}>
                  Missing / Weak Areas
                </div>
                {missingAreas.map((area: string, i: number) => (
                  <div key={i} style={{
                    display: "flex", gap: 10, padding: "10px 12px", borderRadius: 8,
                    background: "rgba(245,158,11,0.04)", border: "1px solid rgba(245,158,11,0.1)",
                    marginBottom: 6, fontSize: "0.8rem", color: "#D97706",
                  }}>
                    <span>△</span> {area}
                  </div>
                ))}
              </>
            )}
          </div>

          {/* Certifications & Top Skills */}
          <div>
            <div className="v2-card" style={{ padding: 24, marginBottom: 18 }}>
              <div style={{
                fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase",
                letterSpacing: "1.5px", color: "var(--v2-primary)", marginBottom: 14,
              }}>
                🏅 Certifications
              </div>
              {certs.length > 0 ? (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {certs.map((cert: string, i: number) => (
                    <span
                      key={i}
                      style={{
                        display: "flex", alignItems: "center", gap: 6,
                        padding: "6px 14px", borderRadius: 8,
                        background: "var(--v2-primary-50)",
                        border: "1px solid var(--v2-primary-100)",
                        fontSize: "0.78rem", color: "var(--v2-primary-dark)",
                        fontWeight: 500,
                      }}
                    >
                      🏅 {cert}
                    </span>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: "0.82rem", color: "var(--v2-text-muted)" }}>No certifications listed</p>
              )}
            </div>

            <div className="v2-card" style={{ padding: 24 }}>
              <div style={{
                fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase",
                letterSpacing: "1.5px", color: "var(--v2-cyan)", marginBottom: 14,
              }}>
                ✦ Top Skills
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {topSkills.map((skill: string, i: number) => (
                  <span
                    key={i}
                    style={{
                      padding: "5px 14px", borderRadius: 8,
                      background: "rgba(6,182,212,0.06)", border: "1px solid rgba(6,182,212,0.15)",
                      fontSize: "0.78rem", color: "#0E7490", fontWeight: 500,
                    }}
                  >
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

  // ─── SCORING VIEW ───
  return (
    <div className="v2-animate-in">
      {/* Section score stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(parsedSectionScoring.filter(s => s.weightage > 0).length, 4)}, 1fr)`, gap: 16, marginBottom: 20 }}>
        {parsedSectionScoring
          .filter((s: any) => s.weightage > 0)
          .map((section: any, i: number) => {
            const avgScore = section.submenus?.length > 0
              ? section.submenus.reduce((t: number, sm: any) => t + (sm.score || 0), 0) / section.submenus.length
              : 0;
            const contribution = (avgScore * section.weightage) / 100;

            return (
              <div key={i} className={`v2-card v2-animate-in v2-stagger-${i + 1}`} style={{ padding: "20px 22px", position: "relative", overflow: "hidden" }}>
                <div style={{
                  position: "absolute", top: 0, left: 0, width: 3, height: "100%",
                  background: getBarColor(avgScore),
                }} />
                <div style={{
                  fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase",
                  letterSpacing: "1.5px", color: "var(--v2-text-muted)", marginBottom: 8,
                }}>
                  {section.section}
                </div>
                <div style={{
                  fontSize: "2rem", fontWeight: 800, lineHeight: 1,
                  color: avgScore >= 8 ? "var(--v2-green)" : avgScore >= 5 ? "var(--v2-amber)" : "var(--v2-red)",
                }}>
                  {contribution.toFixed(1)}
                </div>
                <div style={{ fontSize: "0.72rem", color: "var(--v2-text-muted)", marginTop: 5 }}>
                  Weighted from {section.weightage}% section
                </div>
                <div style={{
                  display: "inline-flex", padding: "3px 10px", borderRadius: 20, marginTop: 8,
                  fontSize: "0.7rem", background: "rgba(124,58,237,0.06)", color: "var(--v2-primary)",
                }}>
                  Avg: {avgScore.toFixed(1)} / 10
                </div>
              </div>
            );
          })}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 20 }}>
        {/* Section Breakdown */}
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

        {/* Right column */}
        <div>
          {/* Resume Quality */}
          {/* {parsedResumeQuality && (
            <div className="v2-card" style={{ padding: 24, marginBottom: 18 }}>
              <div style={{
                fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase",
                letterSpacing: "1.5px", color: "var(--v2-text-muted)", marginBottom: 18,
              }}>
                Resume Quality
              </div>

              {parsedResumeQuality.parsing_confidence != null && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: "0.8rem", color: "var(--v2-text)" }}>Parsing Confidence</span>
                    <span style={{ fontFamily: "var(--v2-mono)", fontSize: "0.78rem", color: "var(--v2-green)" }}>
                      {parsedResumeQuality.parsing_confidence}%
                    </span>
                  </div>
                  <div className="v2-dim-track">
                    <div className="v2-dim-fill" style={{
                      width: `${parsedResumeQuality.parsing_confidence}%`,
                      background: "linear-gradient(90deg, var(--v2-green), var(--v2-cyan))",
                    }} />
                  </div>
                </div>
              )}

              {parsedResumeQuality.completeness_score != null && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: "0.8rem", color: "var(--v2-text)" }}>Completeness</span>
                    <span style={{ fontFamily: "var(--v2-mono)", fontSize: "0.78rem", color: "var(--v2-primary)" }}>
                      {parsedResumeQuality.completeness_score}%
                    </span>
                  </div>
                  <div className="v2-dim-track">
                    <div className="v2-dim-fill" style={{
                      width: `${parsedResumeQuality.completeness_score}%`,
                      background: "linear-gradient(90deg, var(--v2-primary), var(--v2-cyan))",
                    }} />
                  </div>
                </div>
              )}

              {parsedResumeQuality.format_issues?.length > 0 && (
                <div style={{ marginTop: 14 }}>
                  {parsedResumeQuality.format_issues.map((issue: string, i: number) => (
                    <div key={i} style={{
                      display: "flex", alignItems: "center", gap: 8,
                      padding: "8px 12px", borderRadius: 8,
                      background: "rgba(245,158,11,0.04)",
                      borderLeft: "3px solid var(--v2-amber)",
                      marginBottom: 6, fontSize: "0.78rem", color: "var(--v2-text-secondary)",
                    }}>
                      <span style={{ color: "var(--v2-amber)" }}>⚠</span> {issue}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )} */}

          {/* Score Summary */}
          <div className="v2-card" style={{ padding: 24 }}>
            <div style={{
              fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase",
              letterSpacing: "1.5px", color: "var(--v2-text-muted)", marginBottom: 18,
            }}>
              Score Summary
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "12px 16px", borderRadius: 10,
                background: "rgba(124,58,237,0.03)", border: "1px solid var(--v2-border2)",
              }}>
                <span style={{ fontSize: "0.84rem", color: "var(--v2-text-secondary)" }}>Overall Match Score</span>
                <span style={{
                  fontFamily: "var(--v2-mono)", fontSize: "1.1rem", fontWeight: 700,
                  color: resumeAnalysis.overall_score >= 80 ? "var(--v2-green)" : resumeAnalysis.overall_score >= 60 ? "var(--v2-amber)" : "var(--v2-red)",
                }}>
                  {resumeAnalysis.overall_score} / 100
                </span>
              </div>

              {parsedMatchQuality?.hiring_recommendation && (
                <div style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "12px 16px", borderRadius: 10,
                  background: parsedMatchQuality.hiring_recommendation === "yes" ? "rgba(16,185,129,0.04)" : "rgba(245,158,11,0.04)",
                  border: `1px solid ${parsedMatchQuality.hiring_recommendation === "yes" ? "rgba(16,185,129,0.15)" : "rgba(245,158,11,0.15)"}`,
                }}>
                  <span style={{ fontSize: "0.84rem", color: "var(--v2-text-secondary)" }}>Recommendation</span>
                  <span style={{
                    fontSize: "0.88rem", fontWeight: 700,
                    color: parsedMatchQuality.hiring_recommendation === "yes" ? "var(--v2-green)" : "var(--v2-amber)",
                  }}>
                    {parsedMatchQuality.hiring_recommendation === "yes" ? "✓ Hire" : "⚖ Review"} · {parsedMatchQuality.confidence_level || "—"}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};