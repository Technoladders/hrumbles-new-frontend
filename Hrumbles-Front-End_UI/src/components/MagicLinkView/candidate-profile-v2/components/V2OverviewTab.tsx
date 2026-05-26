import React, { useMemo } from "react";
import { V2SkillsPanel } from "./V2SkillsPanel";

interface V2OverviewTabProps {
  employee: any;
  resumeAnalysis: any;
  parsedMatchedSkills: any[];
  parsedSectionScoring: any[];
  parsedMatchQuality: any;
  parsedResumeQuality: any;
  parsedRawAnalysis: any;
  workHistory: any[];
  sortedGroupedSkills: Record<string, { name: string; description: string; relatedSkills?: string[] }[]>;
  isLoadingEnriched: boolean;
  shareMode: boolean;
  currentDataOptions?: any;
  formatINR: (v: any) => string;
}

const safeParseArr = (v: any): any[] => {
  if (Array.isArray(v)) return v;
  if (typeof v === "string") { try { const p = JSON.parse(v); return Array.isArray(p) ? p : []; } catch { return []; } }
  return [];
};

const scoreColor = (s: number) => (s >= 80 ? "#059669" : s >= 60 ? "#D97706" : "#DC2626");
const barColor = (s: number) => {
  if (s >= 9) return "#10B981";
  if (s >= 7) return "#06B6D4";
  if (s >= 5) return "#F59E0B";
  if (s >= 3) return "#F97316";
  return "#EF4444";
};
const barLabel = (s: number): { text: string; color: string; bg: string } => {
  if (s >= 9) return { text: "Strong",  color: "#059669", bg: "rgba(16,185,129,0.1)" };
  if (s >= 8) return { text: "Good",    color: "#0E7490", bg: "rgba(6,182,212,0.1)"  };
  if (s >= 7) return { text: "Decent",  color: "#0E7490", bg: "rgba(6,182,212,0.1)"  };
  if (s >= 5) return { text: "Partial", color: "#D97706", bg: "rgba(245,158,11,0.1)" };
  if (s >= 3) return { text: "Gap",     color: "#DC2626", bg: "rgba(239,68,68,0.1)"  };
  return        { text: "Missing", color: "#DC2626", bg: "rgba(239,68,68,0.1)"  };
};
const initials = (n: string) => {
  const p = (n || "?").split(" ").filter(Boolean);
  return p.length >= 2 ? (p[0][0] + p[p.length - 1][0]).toUpperCase() : p[0]?.[0]?.toUpperCase() || "?";
};
const recStyle = (r: string) => {
  const l = (r || "").toLowerCase();
  if (l.includes("strong_yes") || l.includes("yes") || l.includes("hire") || l.includes("recommend"))
    return { color: "#059669", bg: "rgba(16,185,129,0.06)", border: "rgba(16,185,129,0.2)", label: l.includes("strong") ? "STRONG YES" : "YES" };
  if (l.includes("no") || l.includes("reject"))
    return { color: "#DC2626", bg: "rgba(239,68,68,0.06)", border: "rgba(239,68,38,0.2)", label: "NO" };
  return { color: "#D97706", bg: "rgba(245,158,11,0.06)", border: "rgba(245,158,11,0.2)", label: r?.toUpperCase() || "MAYBE" };
};
const confDots = (c: string) => {
  const l = (c || "").toLowerCase();
  if (l.includes("high")) return 3;
  if (l.includes("medium") || l.includes("moderate")) return 2;
  return 1;
};

export const V2OverviewTab: React.FC<V2OverviewTabProps> = ({
  employee,
  resumeAnalysis,
  parsedMatchedSkills,
  parsedSectionScoring,
  parsedMatchQuality,
  parsedResumeQuality,
  parsedRawAnalysis,
  workHistory,
  sortedGroupedSkills,
  isLoadingEnriched,
  shareMode,
  currentDataOptions,
  formatINR,
}) => {
  const score              = resumeAnalysis?.overall_score ?? null;
  const recommendation     = parsedMatchQuality?.hiring_recommendation || null;
  const confidence         = parsedMatchQuality?.confidence_level || null;
  const keyDifferentiators: string[] = parsedMatchQuality?.key_differentiators || [];
  const mqSummary          = parsedMatchQuality?.summary || "";

  const experienceAnalysis = parsedRawAnalysis?.experience_analysis || null;
  const reqCoverage        = parsedRawAnalysis?.requirements_coverage || null;
  const rawCompanies: any[]= experienceAnalysis?.companies || [];
  const roleProgression    = experienceAnalysis?.role_progression || "";

  const parseFraction = (s: string | undefined) => {
    if (!s) return null;
    const m = String(s).match(/(\d+)\s*\/\s*(\d+)/);
    return m ? { met: parseInt(m[1]), total: parseInt(m[2]) } : null;
  };
  const mustHave    = parseFraction(reqCoverage?.must_have_skills_met);
  const niceToHave  = parseFraction(reqCoverage?.nice_to_have_skills_met);
  const totalYears  = experienceAnalysis?.total_years ?? null;
  const relevantYears = experienceAnalysis?.relevant_years ?? null;

  const topSkills      = safeParseArr(resumeAnalysis?.top_skills);
  const devGaps        = safeParseArr(resumeAnalysis?.development_gaps);
  const missingAreas   = safeParseArr(resumeAnalysis?.missing_or_weak_areas);
  const certs          = safeParseArr(resumeAnalysis?.additional_certifications);

  const overallAssessment  = parsedMatchQuality?.overall_assessment || null;
  const primaryRisk        = parsedMatchQuality?.primary_risk || parsedMatchQuality?.primary_risk_factor || null;
  const primaryStrength    = parsedMatchQuality?.primary_strength || null;
  const validatedStrengths = safeParseArr(parsedMatchQuality?.validated_strengths);
  const validatedGaps      = safeParseArr(parsedMatchQuality?.validated_gaps);

  const competencyDims = useMemo(() =>
    [...parsedMatchedSkills]
      .map((s) => ({ name: s.requirement || s.skill || "Unknown", score: typeof s.score === "number" ? s.score : parseFloat(s.score) || 0, matched: s.matched }))
      .sort((a, b) => b.score - a.score),
    [parsedMatchedSkills],
  );

  const careerEntries = useMemo(() => {
    if (rawCompanies.length > 0) return rawCompanies;
    return workHistory.slice(0, 5).map((w) => ({ name: w.company_name || w.company || "Unknown", designation: w.designation || w.role || "", duration: w.years || "", relevance_score: w.relevance_score || null }));
  }, [rawCompanies, workHistory]);

  const coveragePct   = mustHave ? Math.round((mustHave.met / mustHave.total) * 100) : parsedMatchedSkills.length > 0 ? Math.round((parsedMatchedSkills.filter((s: any) => s.matched === "yes").length / parsedMatchedSkills.length) * 100) : 0;
  const mustHaveUnmet = mustHave ? mustHave.total - mustHave.met : 0;
  const nicePct       = niceToHave && niceToHave.total > 0 ? Math.round((niceToHave.met / niceToHave.total) * 100) : null;

  const effectiveStrengths = useMemo(() => {
    if (validatedStrengths.length > 0) return validatedStrengths;
    const fromMatched = parsedMatchedSkills.filter((s: any) => s.matched === "yes" && s.score >= 8).map((s: any) => ({ title: s.requirement, description: s.details || s.evidence || "" }));
    return fromMatched.length > 0 ? fromMatched : topSkills.slice(0, 5).map((s: any) => ({ title: typeof s === "string" ? s : s?.name || "Skill", description: "" }));
  }, [validatedStrengths, parsedMatchedSkills, topSkills]);

  const severityOrder = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
  const effectiveGaps = useMemo(() => {
    if (validatedGaps.length > 0) return validatedGaps;
    const combinedGaps: Record<string, { title: string; description: string; severity: string }> = {};
    const addGap = (title: string, description: string, severity: string) => {
      const key = title.trim().toLowerCase();
      if (!key) return;
      const existing = combinedGaps[key];
      if (!existing || severityOrder.indexOf(severity.split("·")[0].trim()) > severityOrder.indexOf(existing.severity.split("·")[0].trim())) {
        combinedGaps[key] = { title: title.trim(), description, severity };
      }
    };
    devGaps.forEach((g: any) => addGap(typeof g === "string" ? g : g?.name || g?.skill || "Gap", typeof g === "object" ? (g?.description || "") : "", "HIGH · Development gap"));
    missingAreas.forEach((a: any) => addGap(typeof a === "string" ? a : a?.name || a?.area || "Missing", typeof a === "object" ? (a?.description || "") : "", "CRITICAL · Missing requirement"));
    parsedMatchedSkills.filter((s: any) => s.matched === "no").forEach((s: any) => addGap(s.requirement, s.details || "", "HIGH · Not found in resume"));
    return Object.values(combinedGaps);
  }, [validatedGaps, devGaps, missingAreas, parsedMatchedSkills]);

  const R = 34, C = 2 * Math.PI * R;
  const gaugeOffset = score ? C - (score / 100) * C : C;

  const progressionChain = useMemo(() => {
    if (rawCompanies.length > 0) return [...rawCompanies].reverse().map((c: any) => c.name);
    return [...workHistory].reverse().map((w) => w.company_name || w.company || "").filter(Boolean);
  }, [rawCompanies, workHistory]);

  const assessmentTitle = overallAssessment || (score !== null && score >= 80 ? "Strong Candidate" : score !== null && score >= 60 ? "Technically Qualified" : "Needs Review");
  const assessmentDesc  = typeof overallAssessment === "string" ? overallAssessment : mqSummary.length > 100 ? mqSummary.slice(0, 100) + "…" : mqSummary;
  const riskTitle       = primaryRisk || (devGaps.length > 0 ? (typeof devGaps[0] === "string" ? devGaps[0] : devGaps[0]?.name || "Development Gap") : missingAreas.length > 0 ? "Missing Skill" : null);
  const riskDesc        = typeof primaryRisk === "string" ? primaryRisk : `${devGaps.length} gap${devGaps.length !== 1 ? "s" : ""} + ${missingAreas.length} missing area${missingAreas.length !== 1 ? "s" : ""} identified`;
  const strengthTitle   = primaryStrength || (topSkills.length > 0 ? (typeof topSkills[0] === "string" ? topSkills[0] : topSkills[0]?.name || "Key Strength") : null);
  const strengthDesc    = typeof primaryStrength === "string" ? primaryStrength : keyDifferentiators.length > 0 ? keyDifferentiators.join(", ") : "Key skills aligned with requirements";

  const sevStyle = (s: string) => {
    const l = (s || "").toLowerCase();
    if (l.includes("critical")) return { bg: "rgba(239,68,68,0.08)", color: "#DC2626", border: "rgba(239,68,68,0.2)" };
    if (l.includes("high"))     return { bg: "rgba(245,158,11,0.08)", color: "#D97706", border: "rgba(245,158,11,0.2)" };
    if (l.includes("medium"))   return { bg: "rgba(6,182,212,0.08)",  color: "#0E7490", border: "rgba(6,182,212,0.2)"  };
    return { bg: "rgba(100,116,139,0.08)", color: "#64748B", border: "rgba(100,116,139,0.2)" };
  };

  /* ─── CARD / ROW shared styles ─── */
  const card: React.CSSProperties = {
    background: "#fff", borderRadius: 10, border: "1px solid #EDE9FE",
    boxShadow: "0 1px 4px rgba(109,40,217,0.06)", overflow: "hidden",
  };

  return (
    <div style={{ fontFamily: "system-ui,-apple-system,sans-serif" }}>
      <style>{`
        .ov-row4{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:10px}
        .ov-row2{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px}
        .ov-dim-row{display:grid;grid-template-columns:150px 1fr 28px 52px;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid #F5F3FF}
        .ov-dim-row:last-child{border-bottom:none}
        .ov-career-item{position:relative;padding-left:26px;padding-bottom:14px}
        .ov-career-item:last-child{padding-bottom:0}
        .ov-career-item::before{content:'';position:absolute;left:7px;top:8px;bottom:-4px;width:2px;background:linear-gradient(180deg,rgba(109,40,217,0.3),rgba(109,40,217,0.05))}
        .ov-career-item:last-child::before{display:none}
        .ov-dot{position:absolute;left:0;top:3px;width:16px;height:16px;border-radius:50%;border:2px solid #6D28D9;background:#fff;z-index:1}
        .ov-dot.active{background:#6D28D9;box-shadow:0 0 0 3px rgba(109,40,217,0.12)}
        .ov-sg-item{padding:8px 0;border-bottom:1px solid #F5F3FF}
        .ov-sg-item:last-child{border-bottom:none}
        .ov-cert{display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border-radius:6px;border:1px solid #EDE9FE;background:#fff;font-size:10px;font-weight:500;color:#374151}
        .ov-sev{display:inline-flex;padding:1px 6px;border-radius:4px;font-size:8px;font-weight:700;letter-spacing:0.3px;margin-top:4px}
        .ov-lbl{font-size:8px;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;color:#9CA3AF}
        @media(max-width:900px){.ov-row4{grid-template-columns:repeat(2,1fr)}.ov-row2{grid-template-columns:1fr}.ov-dim-row{grid-template-columns:110px 1fr 24px 44px}}
      `}</style>



      {/* ── 1. PROFILE HEADER ── */}
      <div style={{ ...card, marginBottom: 10, position: "relative" }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg,#6D28D9,#0891B2)" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", flexWrap: "wrap" }}>
          {/* Avatar */}
          <div style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0, background: "linear-gradient(135deg,#6D28D9,#0891B2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: "#fff", boxShadow: "0 3px 10px rgba(109,40,217,0.2)" }}>
            {initials(employee.name)}
          </div>
          {/* Name + contact */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#1a1722" }}>{employee.name}</div>
            {employee.role !== "N/A" && <div style={{ fontSize: 10, color: "#6D28D9", fontWeight: 500, marginTop: 1 }}>{employee.role}</div>}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "2px 12px", marginTop: 5 }}>
              {employee.email !== "N/A" && <span style={{ fontSize: 10, color: "#6B7280", cursor: "pointer", display: "flex", alignItems: "center", gap: 3 }} onClick={() => navigator.clipboard.writeText(employee.email)}>✉ {employee.email}</span>}
              {employee.phone !== "N/A" && <span style={{ fontSize: 10, color: "#6B7280", cursor: "pointer", display: "flex", alignItems: "center", gap: 3 }} onClick={() => navigator.clipboard.writeText(employee.phone)}>📞 {employee.phone}</span>}
              {employee.department !== "N/A" && <span style={{ fontSize: 10, color: "#6B7280", display: "flex", alignItems: "center", gap: 3 }}>🏢 {employee.department}</span>}
              {employee.location !== "N/A" && <span style={{ fontSize: 10, color: "#6B7280", display: "flex", alignItems: "center", gap: 3 }}>📍 {employee.location}</span>}
            </div>
          </div>
          {/* Hiring Decision */}
          {recommendation && (() => {
            const rs = recStyle(recommendation);
            return (
              <div style={{ background: rs.bg, border: `1.5px solid ${rs.border}`, borderRadius: 8, padding: "8px 14px", textAlign: "center", minWidth: 110 }}>
                <div style={{ fontSize: 7, fontWeight: 800, textTransform: "uppercase" as const, letterSpacing: "1.8px", color: rs.color, marginBottom: 2 }}>Hiring Decision</div>
                <div style={{ fontSize: 13, fontWeight: 800, color: rs.color }}>⚖ {rs.label}</div>
                {confidence && <div style={{ fontSize: 8, color: rs.color, marginTop: 1, opacity: 0.8 }}>{confidence} Confidence</div>}
              </div>
            );
          })()}
          {/* Gauge */}
          {score !== null && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, flexShrink: 0 }}>
              <div style={{ position: "relative", width: 76, height: 76 }}>
                <svg width="76" height="76" viewBox="0 0 76 76" style={{ transform: "rotate(-90deg)" }}>
                  <circle cx="38" cy="38" r={R} fill="none" stroke="rgba(0,0,0,0.05)" strokeWidth="6" />
                  <circle cx="38" cy="38" r={R} fill="none" stroke="url(#ovGG)" strokeWidth="6"
                    strokeDasharray={C} strokeDashoffset={gaugeOffset} strokeLinecap="round"
                    style={{ transition: "stroke-dashoffset 1.2s ease" }} />
                  <defs><linearGradient id="ovGG" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#6D28D9" /><stop offset="100%" stopColor="#0891B2" /></linearGradient></defs>
                </svg>
                <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontFamily: "monospace", fontSize: 20, fontWeight: 800, color: scoreColor(score), lineHeight: 1 }}>{score}</span>
                  <span style={{ fontSize: 8, color: "#9CA3AF" }}>/100</span>
                </div>
              </div>
              <span style={{ fontSize: 7, fontWeight: 800, textTransform: "uppercase" as const, letterSpacing: "1.2px", color: "#9CA3AF" }}>Match Score</span>
            </div>
          )}
        </div>
        {/* Info strip */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", borderTop: "1px solid #F5F3FF" }}>
          {[
            { label: "Total Exp.",        value: employee.experience || (totalYears ? `${totalYears} yrs` : null), icon: "💼" },
            employee.location !== "N/A" ? { label: "Location",           value: employee.location,            icon: "📍" } : null,
            employee.preferredLocation !== "N/A" ? { label: "Preferred Loc.",    value: employee.preferredLocation,   icon: "🏢" } : null,
            employee.currentSalary  !== "N/A" ? { label: "Current Salary",    value: `${formatINR(employee.currentSalary)} LPA`,  icon: "💰" } : null,
            employee.expectedSalary !== "N/A" ? { label: "Expected Salary",   value: `${formatINR(employee.expectedSalary)} LPA`, icon: "💰" } : null,
          ].filter(Boolean).map((item: any, i) => (
            <div key={i} style={{ padding: "7px 12px", borderRight: "1px solid #F5F3FF", borderBottom: "1px solid #F5F3FF" }}>
              <div style={{ fontSize: 7, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "1px", color: "#9CA3AF", marginBottom: 2 }}>{item.icon} {item.label}</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#1a1722" }}>{item.value || "—"}</div>
            </div>
          ))}
        </div>
      </div>

            {/* ── 2. AI SUMMARY ── */}
      {resumeAnalysis?.summary && (
        <div style={{ ...card, padding: "10px 14px", marginBottom: 10, background: "#fff", border: "1px solid rgba(109,40,217,0.1)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#6D28D9" }} />
            <span className="ov-lbl" style={{ color: "#6D28D9" }}>AI Validation Summary</span>
          </div>
          <p style={{ fontSize: 11, color: "#374151", lineHeight: 1.65, margin: 0 }}
            dangerouslySetInnerHTML={{ __html: resumeAnalysis.summary.replace(/\*\*(.*?)\*\*/g, '<strong style="color:#1E1B4B;font-weight:700">$1</strong>') }}
          />
        </div>
      )}

      {/* ── 3. FOUR INSIGHT STAT CARDS ── */}
      {resumeAnalysis && (
        <div className="ov-row4">
          <InsightCard accent="#10B981" label="Must-Have Skills"
            valueMain={mustHave ? String(mustHave.met) : String(parsedMatchedSkills.filter((s: any) => s.matched === "yes").length)}
            valueSub={mustHave ? `/${mustHave.total}` : `/${parsedMatchedSkills.length}`}
            desc={mustHaveUnmet > 0 ? `${mustHaveUnmet} critical unmet` : "All requirements met"}
            badge={`${coveragePct}% coverage`}
            badgeColor={coveragePct >= 70 ? "#059669" : "#D97706"}
            badgeBg={coveragePct >= 70 ? "rgba(16,185,129,0.08)" : "rgba(245,158,11,0.08)"}
          />
          <InsightCard accent="#06B6D4" label="Nice-to-Have Skills"
            valueMain={niceToHave ? String(niceToHave.met) : "—"}
            valueSub={niceToHave ? `/${niceToHave.total}` : ""}
            desc={nicePct !== null ? `${nicePct}% secondary coverage` : "Not specified"}
            badge={nicePct !== null ? (nicePct >= 50 ? "Acceptable" : "Below avg") : "N/A"}
            badgeColor="#0E7490" badgeBg="rgba(6,182,212,0.08)"
          />
          <InsightCard accent={totalYears !== null && totalYears < 5 ? "#EF4444" : "#F59E0B"} label="Experience"
            valueMain={totalYears !== null ? String(totalYears) : "—"}
            valueSub={totalYears !== null ? " yrs" : ""}
            desc={relevantYears !== null ? `${relevantYears} yrs relevant` : "No data"}
            badge={totalYears !== null ? (totalYears >= 5 ? "Meets Req." : "Below Threshold") : "N/A"}
            badgeColor={totalYears !== null && totalYears >= 5 ? "#059669" : "#D97706"}
            badgeBg={totalYears !== null && totalYears >= 5 ? "rgba(16,185,129,0.08)" : "rgba(245,158,11,0.08)"}
          />
          {/* Role Progression */}
          <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #EDE9FE", padding: "10px 14px", position: "relative", overflow: "hidden", boxShadow: "0 1px 4px rgba(109,40,217,0.06)" }}>
            <div style={{ position: "absolute", top: 0, left: 0, width: 3, height: "100%", background: "#6D28D9", borderRadius: "10px 0 0 10px" }} />
            <div className="ov-lbl" style={{ marginBottom: 6 }}>Role Progression</div>
            {progressionChain.length > 0 ? (
              <>
                <div style={{ fontSize: 14, color: "#6D28D9", fontWeight: 700, marginBottom: 3 }}>↑</div>
                <div style={{ fontSize: 9, color: "#6B7280", lineHeight: 1.5 }}>{progressionChain.join(" → ")}</div>
                <div style={{ display: "inline-flex", marginTop: 6, fontSize: 8, fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: "rgba(109,40,217,0.07)", color: "#6D28D9" }}>
                  {roleProgression ? roleProgression.charAt(0).toUpperCase() + roleProgression.slice(1) : "Progressing"}
                </div>
              </>
            ) : <div style={{ fontSize: 10, color: "#9CA3AF" }}>No work history</div>}
          </div>
        </div>
      )}

      {/* ── 4. FOUR ASSESSMENT CARDS ── */}
      {resumeAnalysis && (
        <div className="ov-row4">
          {/* Overall Assessment */}
          <div style={{ ...card, padding: "10px 14px" }}>
            <div className="ov-lbl" style={{ marginBottom: 6 }}>Overall Assessment</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#1a1722", marginBottom: 3 }}>
              {typeof assessmentTitle === "string" ? assessmentTitle.split(/[.—]/)[0].slice(0, 40) : "Assessment"}
            </div>
            <div style={{ fontSize: 9, color: "#6B7280", lineHeight: 1.5 }}>{typeof assessmentDesc === "string" ? assessmentDesc.slice(0, 110) : ""}</div>
          </div>
          {/* Risk */}
          <div style={{ ...card, padding: "10px 14px" }}>
            <div className="ov-lbl" style={{ marginBottom: 6 }}>Primary Risk Factor</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#DC2626", marginBottom: 3 }}>
              {riskTitle ? (typeof riskTitle === "string" ? riskTitle.slice(0, 40) : "Risk Identified") : "None Identified"}
            </div>
            <div style={{ fontSize: 9, color: "#6B7280", lineHeight: 1.5 }}>{typeof riskDesc === "string" ? riskDesc.slice(0, 110) : ""}</div>
          </div>
          {/* Strength */}
          <div style={{ ...card, padding: "10px 14px" }}>
            <div className="ov-lbl" style={{ marginBottom: 6 }}>Primary Strength</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#059669", marginBottom: 3 }}>
              {strengthTitle ? (typeof strengthTitle === "string" ? strengthTitle.slice(0, 40) : "Strength Identified") : "Skills Aligned"}
            </div>
            <div style={{ fontSize: 9, color: "#6B7280", lineHeight: 1.5 }}>{typeof strengthDesc === "string" ? strengthDesc.slice(0, 110) : ""}</div>
          </div>
          {/* Recommendation */}
          {recommendation ? (() => {
            const rs = recStyle(recommendation);
            return (
              <div style={{ background: rs.bg, border: `1.5px solid ${rs.border}`, borderRadius: 10, padding: "10px 14px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
                <div className="ov-lbl" style={{ marginBottom: 6, color: rs.color }}>Recommendation</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: rs.color, letterSpacing: "0.5px" }}>{rs.label}</div>
                {confidence && (
                  <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 5, fontSize: 8, color: "#6B7280" }}>
                    {confidence}
                    <span style={{ display: "flex", gap: 2 }}>
                      {[1, 2, 3].map((d) => <span key={d} style={{ width: 5, height: 5, borderRadius: "50%", background: d <= confDots(confidence) ? rs.color : "rgba(0,0,0,0.1)" }} />)}
                    </span>
                  </div>
                )}
              </div>
            );
          })() : (
            <div style={{ ...card, padding: 10, display: "flex", alignItems: "center", justifyContent: "center", color: "#9CA3AF", fontSize: 10 }}>No recommendation</div>
          )}
        </div>
      )}

      {/* ── 5. COMPETENCY SCORES + CAREER ── */}
      {(competencyDims.length > 0 || careerEntries.length > 0) && (
        <div className="ov-row2">
          {competencyDims.length > 0 && (
            <div style={{ ...card, padding: "12px 16px" }}>
              <div className="ov-lbl" style={{ marginBottom: 10 }}>Competency Dimension Scores</div>
              {competencyDims.map((dim, i) => {
                const pct = (dim.score / 10) * 100;
                const lb  = barLabel(dim.score);
                return (
                  <div className="ov-dim-row" key={i}>
                    <div style={{ fontSize: 10, fontWeight: 500, color: "#374151", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={dim.name}>{dim.name}</div>
                    <div style={{ height: 5, background: "#F5F3FF", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: `linear-gradient(90deg,${barColor(dim.score)},${barColor(dim.score)}bb)`, borderRadius: 3, transition: "width 0.7s ease" }} />
                    </div>
                    <div style={{ fontFamily: "monospace", fontSize: 10, fontWeight: 800, color: barColor(dim.score), textAlign: "right" }}>{Math.round(dim.score)}</div>
                    <div style={{ fontSize: 8, fontWeight: 700, padding: "1px 6px", borderRadius: 4, textAlign: "center", background: lb.bg, color: lb.color }}>{lb.text}</div>
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {careerEntries.length > 0 && (
              <div style={{ ...card, padding: "12px 16px" }}>
                <div className="ov-lbl" style={{ marginBottom: 10 }}>Career Progression</div>
                {careerEntries.map((entry: any, i: number) => {
                  const name = entry.name || entry.company_name || "Unknown";
                  const desg = entry.designation || "";
                  const dur  = entry.duration || entry.years || "";
                  const rel  = entry.relevance_score ?? null;
                  return (
                    <div className="ov-career-item" key={i}>
                      <div className={`ov-dot ${i === 0 ? "active" : ""}`} />
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#1a1722" }}>{name}</div>
                      {desg && <div style={{ fontSize: 9, color: "#6D28D9", fontWeight: 500, marginTop: 1 }}>{desg}</div>}
                      {dur  && <div style={{ fontSize: 8, color: "#9CA3AF", marginTop: 2 }}>{dur}</div>}
                      {rel !== null && (
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
                          <div style={{ height: 3, width: 56, background: "#F5F3FF", borderRadius: 2, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${(rel / 10) * 100}%`, background: barColor(rel), borderRadius: 2 }} />
                          </div>
                          <span style={{ fontSize: 8, color: "#9CA3AF", fontWeight: 500 }}>{rel}/10</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            {certs.length > 0 && (
              <div style={{ ...card, padding: "12px 16px" }}>
                <div className="ov-lbl" style={{ marginBottom: 8 }}>Certifications</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {certs.map((c: any, i: number) => {
                    const name = typeof c === "string" ? c : c?.name || c?.title || "Cert";
                    const icons = ["🏆", "📜", "🎓", "⭐", "🔰", "💎"];
                    return <span className="ov-cert" key={i}>{icons[i % icons.length]} {name}</span>;
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 6. KEY DIFFERENTIATORS ── */}
      {keyDifferentiators.length > 0 && (
        <div style={{ ...card, padding: "8px 14px", marginBottom: 10, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 8, fontWeight: 800, textTransform: "uppercase" as const, letterSpacing: "1.2px", color: "#6D28D9", whiteSpace: "nowrap" }}>✦ Key Differentiators</span>
          {keyDifferentiators.map((d: string, i: number) => (
            <span key={i} style={{ fontSize: 9, color: "#4B5563", padding: "2px 10px", borderRadius: 20, background: "rgba(109,40,217,0.05)", border: "1px solid rgba(109,40,217,0.12)" }}>{d}</span>
          ))}
        </div>
      )}

      {/* ── 7. TOP SKILLS ── */}
      {topSkills.length > 0 && (
        <div style={{ ...card, padding: "8px 14px", marginBottom: 10, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 8, fontWeight: 800, textTransform: "uppercase" as const, letterSpacing: "1.2px", color: "#0E7490", whiteSpace: "nowrap" }}>Top Skills</span>
          {topSkills.map((s: any, i: number) => {
            const name = typeof s === "string" ? s : s?.name || "Skill";
            return <span key={i} style={{ fontSize: 9, fontWeight: 500, padding: "2px 10px", borderRadius: 20, background: "rgba(6,182,212,0.06)", border: "1px solid rgba(6,182,212,0.15)", color: "#0E7490" }}>{name}</span>;
          })}
        </div>
      )}

      {/* ── 8. STRENGTHS & GAPS ── */}
      {(effectiveStrengths.length > 0 || effectiveGaps.length > 0) && (
        <div className="ov-row2">
          <div style={{ ...card, padding: "12px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
              <span style={{ width: 6, height: 6, borderRadius: 2, background: "#10B981" }} />
              <span className="ov-lbl" style={{ color: "#059669" }}>Validated Strengths</span>
            </div>
            {effectiveStrengths.map((item: any, i: number) => {
              const title = typeof item === "string" ? item : item?.title || item?.name || item?.strength || item?.requirement || "Strength";
              const desc  = typeof item === "object" ? (item?.description || item?.details || item?.evidence || "") : "";
              return (
                <div className="ov-sg-item" key={i}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
                    <span style={{ color: "#10B981", fontSize: 10, marginTop: 1, flexShrink: 0 }}>◆</span>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "#059669" }}>{title}</div>
                      {desc && <div style={{ fontSize: 9, color: "#6B7280", lineHeight: 1.5, marginTop: 1 }}>{desc}</div>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ ...card, padding: "12px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#EF4444" }} />
              <span className="ov-lbl" style={{ color: "#DC2626" }}>Validated Gaps</span>
            </div>
            {effectiveGaps.length > 0 ? effectiveGaps.map((item: any, i: number) => {
              const title    = typeof item === "string" ? item : item?.title || item?.name || item?.gap || "Gap";
              const desc     = typeof item === "object" ? (item?.description || item?.details || "") : "";
              const severity = typeof item === "object" ? (item?.severity || item?.priority || "") : "";
              const ss       = sevStyle(severity);
              return (
                <div className="ov-sg-item" key={i}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
                    <span style={{ color: "#EF4444", fontSize: 9, marginTop: 1, flexShrink: 0 }}>⚠</span>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "#DC2626" }}>{title}</div>
                      {desc && <div style={{ fontSize: 9, color: "#6B7280", lineHeight: 1.5, marginTop: 1 }}>{desc}</div>}
                      {severity && <span className="ov-sev" style={{ background: ss.bg, color: ss.color, border: `1px solid ${ss.border}` }}>{severity}</span>}
                    </div>
                  </div>
                </div>
              );
            }) : (
              <div style={{ fontSize: 10, color: "#9CA3AF", textAlign: "center", padding: 16 }}>No significant gaps identified</div>
            )}
          </div>
        </div>
      )}

      {/* ── 9. SKILLS PANEL ── */}
      {Object.keys(sortedGroupedSkills).length > 0 && !isLoadingEnriched && (
        <V2SkillsPanel
          sortedGroupedSkills={sortedGroupedSkills}
          isLoading={isLoadingEnriched}
          skillRatings={employee.skillRatings || []}
          shareMode={shareMode}
          sharedDataOptions={currentDataOptions}
          expanded={true}
        />
      )}
    </div>
  );
};

/* ─── InsightCard ─── */
const InsightCard: React.FC<{
  accent: string; label: string; valueMain: string; valueSub: string;
  desc: string; badge: string; badgeColor: string; badgeBg: string;
}> = ({ accent, label, valueMain, valueSub, desc, badge, badgeColor, badgeBg }) => (
  <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #EDE9FE", padding: "10px 14px", position: "relative", overflow: "hidden", boxShadow: "0 1px 4px rgba(109,40,217,0.06)" }}>
    <div style={{ position: "absolute", top: 0, left: 0, width: 3, height: "100%", background: accent, borderRadius: "10px 0 0 10px" }} />
    <div style={{ fontSize: 8, fontWeight: 800, textTransform: "uppercase" as const, letterSpacing: "1.5px", color: "#9CA3AF", marginBottom: 6 }}>{label}</div>
    <div style={{ display: "flex", alignItems: "baseline", gap: 2 }}>
      <span style={{ fontFamily: "monospace", fontSize: 22, fontWeight: 800, color: accent, lineHeight: 1 }}>{valueMain}</span>
      <span style={{ fontFamily: "monospace", fontSize: 11, fontWeight: 500, color: "#9CA3AF" }}>{valueSub}</span>
    </div>
    <div style={{ fontSize: 9, color: "#6B7280", marginTop: 4 }}>{desc}</div>
    <div style={{ display: "inline-flex", marginTop: 6, fontSize: 8, fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: badgeBg, color: badgeColor }}>{badge}</div>
  </div>
);