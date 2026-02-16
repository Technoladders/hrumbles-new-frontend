import React, { useMemo } from "react";
import { V2SkillsPanel } from "./V2SkillsPanel";

/**
 * V2OverviewTab — Matches the TalentScope ATS template layout (light theme).
 *
 * Data sources (from candidate_resume_analysis table):
 *   resumeAnalysis.matched_skills       → Competency Dimension Scores
 *   resumeAnalysis.match_quality        → Hiring Decision, Recommendation, Assessment cards
 *   resumeAnalysis.raw_ai_analysis      → experience_analysis (career + role progression), requirements_coverage (must-have / nice-to-have)
 *   resumeAnalysis.section_wise_scoring → Section-level breakdown
 *   resumeAnalysis.top_skills           → Top Skills chips
 *   resumeAnalysis.development_gaps     → Validated Gaps
 *   resumeAnalysis.missing_or_weak_areas→ Validated Gaps
 *   resumeAnalysis.additional_certifications → Certifications
 *   resumeAnalysis.resume_quality       → Resume Quality
 */

/* ─── Props ─── */
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

/* ─── Safe JSON parser ─── */
const safeParseArr = (v: any): any[] => {
  if (Array.isArray(v)) return v;
  if (typeof v === "string") { try { const p = JSON.parse(v); return Array.isArray(p) ? p : []; } catch { return []; } }
  return [];
};

/* ─── Color helpers ─── */
const scoreColor = (s: number) => (s >= 80 ? "#059669" : s >= 60 ? "#D97706" : "#DC2626");
const barColor = (s: number) => {
  if (s >= 9) return "#10B981";
  if (s >= 7) return "#06B6D4";
  if (s >= 5) return "#F59E0B";
  if (s >= 3) return "#F97316";
  return "#EF4444";
};
const barLabel = (s: number): { text: string; color: string; bg: string } => {
  if (s >= 9) return { text: "Strong", color: "#059669", bg: "rgba(16,185,129,0.1)" };
  if (s >= 8) return { text: "Good", color: "#0E7490", bg: "rgba(6,182,212,0.1)" };
  if (s >= 7) return { text: "Decent", color: "#0E7490", bg: "rgba(6,182,212,0.1)" };
  if (s >= 5) return { text: "Partial", color: "#D97706", bg: "rgba(245,158,11,0.1)" };
  if (s >= 3) return { text: "Gap", color: "#DC2626", bg: "rgba(239,68,68,0.1)" };
  if (s >= 2) return { text: "Weak", color: "#DC2626", bg: "rgba(239,68,68,0.1)" };
  return { text: "Missing", color: "#DC2626", bg: "rgba(239,68,68,0.1)" };
};
const initials = (n: string) => {
  const p = n.split(" ").filter(Boolean);
  return p.length >= 2 ? (p[0][0] + p[p.length - 1][0]).toUpperCase() : p[0]?.[0]?.toUpperCase() || "?";
};

/* ─── Recommendation helpers ─── */
const recStyle = (r: string) => {
  const l = (r || "").toLowerCase();
  if (l.includes("strong_yes") || l.includes("yes") || l.includes("hire") || l.includes("recommend"))
    return { color: "#059669", bg: "rgba(16,185,129,0.06)", border: "rgba(16,185,129,0.2)", label: l.includes("strong") ? "STRONG YES" : "YES" };
  if (l.includes("no") || l.includes("reject"))
    return { color: "#DC2626", bg: "rgba(239,68,68,0.06)", border: "rgba(239,68,68,0.2)", label: "NO" };
  if (l.includes("maybe") || l.includes("conditional"))
    return { color: "#D97706", bg: "rgba(245,158,11,0.06)", border: "rgba(245,158,11,0.2)", label: "MAYBE" };
  return { color: "#D97706", bg: "rgba(245,158,11,0.06)", border: "rgba(245,158,11,0.2)", label: r?.toUpperCase() || "—" };
};
const confDots = (c: string) => {
  const l = (c || "").toLowerCase();
  if (l.includes("high")) return 3;
  if (l.includes("medium") || l.includes("moderate")) return 2;
  return 1;
};

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
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
  /* ────────────────────────────── Derived data ────────────────────────────── */
  const score = resumeAnalysis?.overall_score ?? null;

  // From match_quality
  const recommendation = parsedMatchQuality?.hiring_recommendation || null;
  const confidence = parsedMatchQuality?.confidence_level || null;
  const keyDifferentiators: string[] = parsedMatchQuality?.key_differentiators || [];
  const mqSummary = parsedMatchQuality?.summary || "";

  // From raw_ai_analysis
  const experienceAnalysis = parsedRawAnalysis?.experience_analysis || null;
  const reqCoverage = parsedRawAnalysis?.requirements_coverage || null;
  const rawCompanies: any[] = experienceAnalysis?.companies || [];
  const roleProgression: string = experienceAnalysis?.role_progression || "";

  // Parse requirements_coverage fractions  e.g. "6/6" → {met:6, total:6}
  const parseFraction = (s: string | undefined) => {
    if (!s) return null;
    const m = String(s).match(/(\d+)\s*\/\s*(\d+)/);
    return m ? { met: parseInt(m[1]), total: parseInt(m[2]) } : null;
  };
  const mustHave = parseFraction(reqCoverage?.must_have_skills_met);
  const niceToHave = parseFraction(reqCoverage?.nice_to_have_skills_met);

  // Experience
  const totalYears = experienceAnalysis?.total_years ?? null;
  const relevantYears = experienceAnalysis?.relevant_years ?? null;

  // Parsed arrays
  const topSkills = safeParseArr(resumeAnalysis?.top_skills);
  const devGaps = safeParseArr(resumeAnalysis?.development_gaps);
  const missingAreas = safeParseArr(resumeAnalysis?.missing_or_weak_areas);
  const certs = safeParseArr(resumeAnalysis?.additional_certifications);

  // Assessment pieces from match_quality
  const overallAssessment = parsedMatchQuality?.overall_assessment || null;
  const primaryRisk = parsedMatchQuality?.primary_risk || parsedMatchQuality?.primary_risk_factor || null;
  const primaryStrength = parsedMatchQuality?.primary_strength || null;
  const validatedStrengths = safeParseArr(parsedMatchQuality?.validated_strengths);
  const validatedGaps = safeParseArr(parsedMatchQuality?.validated_gaps);

  // Competency dimensions = matched_skills with scores
  const competencyDims = useMemo(() => {
    return [...parsedMatchedSkills]
      .map((s) => ({
        name: s.requirement || s.skill || "Unknown",
        score: typeof s.score === "number" ? s.score : parseFloat(s.score) || 0,
        matched: s.matched,
      }))
      .sort((a, b) => b.score - a.score);
  }, [parsedMatchedSkills]);

  // Career entries from raw_ai_analysis
  const careerEntries = useMemo(() => {
    if (rawCompanies.length > 0) return rawCompanies;
    return workHistory.slice(0, 5).map((w) => ({
      name: w.company_name || w.company || "Unknown",
      designation: w.designation || w.role || "",
      duration: w.years || "",
      relevance_score: w.relevance_score || null,
    }));
  }, [rawCompanies, workHistory]);

  // Coverage
  const coveragePct = mustHave
    ? Math.round((mustHave.met / mustHave.total) * 100)
    : parsedMatchedSkills.length > 0
      ? Math.round((parsedMatchedSkills.filter((s: any) => s.matched === "yes").length / parsedMatchedSkills.length) * 100)
      : 0;
  const mustHaveUnmet = mustHave ? mustHave.total - mustHave.met : 0;
  const nicePct = niceToHave && niceToHave.total > 0 ? Math.round((niceToHave.met / niceToHave.total) * 100) : null;

  // Build effective strengths
  const effectiveStrengths = useMemo(() => {
    if (validatedStrengths.length > 0) return validatedStrengths;
    const fromMatched = parsedMatchedSkills
      .filter((s: any) => s.matched === "yes" && s.score >= 8)
      .map((s: any) => ({ title: s.requirement, description: s.details || s.evidence || "" }));
    return fromMatched.length > 0 ? fromMatched : topSkills.slice(0, 5).map((s: any) => ({
      title: typeof s === "string" ? s : s?.name || "Skill", description: "",
    }));
  }, [validatedStrengths, parsedMatchedSkills, topSkills]);

  // Build effective gaps
  const effectiveGaps = useMemo(() => {
    if (validatedGaps.length > 0) return validatedGaps;
    const gaps: { title: string; description: string; severity: string }[] = [];
    devGaps.forEach((g: any) => {
      const t = typeof g === "string" ? g : g?.name || g?.skill || "Gap";
      const d = typeof g === "object" ? (g?.description || "") : "";
      gaps.push({ title: t, description: d, severity: "HIGH · Development gap" });
    });
    missingAreas.forEach((a: any) => {
      const t = typeof a === "string" ? a : a?.name || a?.area || "Missing";
      const d = typeof a === "object" ? (a?.description || "") : "";
      gaps.push({ title: t, description: d, severity: "CRITICAL · Missing requirement" });
    });
    parsedMatchedSkills.filter((s: any) => s.matched === "no").forEach((s: any) => {
      if (!gaps.some((g) => g.title === s.requirement)) {
        gaps.push({ title: s.requirement, description: s.details || "", severity: "HIGH · Not found in resume" });
      }
    });
    return gaps;
  }, [validatedGaps, devGaps, missingAreas, parsedMatchedSkills]);

  // Gauge
  const R = 38, C = 2 * Math.PI * R;
  const gaugeOffset = score ? C - (score / 100) * C : C;

  // Role progression chain
  const progressionChain = useMemo(() => {
    if (rawCompanies.length > 0) return [...rawCompanies].reverse().map((c: any) => c.name);
    return [...workHistory].reverse().map((w) => w.company_name || w.company || "").filter(Boolean);
  }, [rawCompanies, workHistory]);

  // Auto-generate assessment card content
  const assessmentTitle = overallAssessment
    || (score !== null && score >= 80 ? "Strong Candidate" : score !== null && score >= 60 ? "Technically Qualified" : "Needs Review");
  const assessmentDesc = typeof overallAssessment === "string"
    ? overallAssessment : mqSummary.length > 120 ? mqSummary.slice(0, 120) + "…" : mqSummary;

  const riskTitle = primaryRisk
    || (devGaps.length > 0 ? (typeof devGaps[0] === "string" ? devGaps[0] : devGaps[0]?.name || "Development Gap")
      : missingAreas.length > 0 ? (typeof missingAreas[0] === "string" ? missingAreas[0] : "Missing Skill") : null);
  const riskDesc = typeof primaryRisk === "string" ? primaryRisk :
    `${devGaps.length} development gap${devGaps.length !== 1 ? "s" : ""} + ${missingAreas.length} missing area${missingAreas.length !== 1 ? "s" : ""} identified`;

  const strengthTitle = primaryStrength
    || (topSkills.length > 0 ? (typeof topSkills[0] === "string" ? topSkills[0] : topSkills[0]?.name || "Key Strength") : null);
  const strengthDesc = typeof primaryStrength === "string" ? primaryStrength :
    keyDifferentiators.length > 0 ? keyDifferentiators.join(", ") : "Key skills aligned with requirements";

  const sevStyle = (s: string) => {
    const l = (s || "").toLowerCase();
    if (l.includes("critical")) return { bg: "rgba(239,68,68,0.08)", color: "#DC2626", border: "rgba(239,68,68,0.2)" };
    if (l.includes("high")) return { bg: "rgba(245,158,11,0.08)", color: "#D97706", border: "rgba(245,158,11,0.2)" };
    if (l.includes("medium")) return { bg: "rgba(6,182,212,0.08)", color: "#0E7490", border: "rgba(6,182,212,0.2)" };
    return { bg: "rgba(100,116,139,0.08)", color: "#64748B", border: "rgba(100,116,139,0.2)" };
  };

  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ RENDER ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
  return (
    <div className="v2-animate-in">
      <style>{`
        .ov-row4{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:16px}
        .ov-row2{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px}
        .ov-dim-row{display:grid;grid-template-columns:170px 1fr 30px 64px;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid rgba(0,0,0,0.04)}
        .ov-dim-row:last-child{border-bottom:none}
        .ov-career-item{position:relative;padding-left:34px;padding-bottom:20px}
        .ov-career-item:last-child{padding-bottom:0}
        .ov-career-item::before{content:'';position:absolute;left:9px;top:10px;bottom:-6px;width:2px;background:linear-gradient(180deg,rgba(124,58,237,0.3),rgba(124,58,237,0.05))}
        .ov-career-item:last-child::before{display:none}
        .ov-dot{position:absolute;left:0;top:5px;width:20px;height:20px;border-radius:50%;border:2.5px solid var(--v2-primary);background:#fff;z-index:1}
        .ov-dot.active{background:var(--v2-primary);box-shadow:0 0 0 4px rgba(124,58,237,0.12)}
        .ov-sg-item{padding:14px 0;border-bottom:1px solid rgba(0,0,0,0.04)}
        .ov-sg-item:last-child{border-bottom:none}
        .ov-rel-bar{height:4px;border-radius:2px;background:rgba(0,0,0,0.06);overflow:hidden;width:100px}
        .ov-rel-fill{height:100%;border-radius:2px;transition:width 0.6s ease}
        .ov-cert{display:inline-flex;align-items:center;gap:6px;padding:7px 14px;border-radius:8px;border:1px solid rgba(0,0,0,0.06);background:#fff;font-size:0.76rem;font-weight:500;color:var(--v2-text);transition:all 0.2s}
        .ov-cert:hover{border-color:rgba(124,58,237,0.2);background:var(--v2-primary-50)}
        .ov-sev{display:inline-flex;padding:2px 8px;border-radius:4px;font-size:0.6rem;font-weight:700;letter-spacing:0.3px;margin-top:6px}
        .ov-lbl{font-size:0.6rem;font-weight:800;text-transform:uppercase;letter-spacing:1.8px;color:var(--v2-text-muted)}
        @media(max-width:900px){.ov-row4{grid-template-columns:repeat(2,1fr)}.ov-row2{grid-template-columns:1fr}.ov-dim-row{grid-template-columns:130px 1fr 26px 54px}}
      `}</style>

      {/* ━━━ 1. AI VALIDATION SUMMARY ━━━ */}
      {resumeAnalysis?.summary && (
        <div className="v2-card v2-animate-in" style={{
          padding: "20px 26px", marginBottom: 16,
          background: "linear-gradient(135deg, rgba(124,58,237,0.03), rgba(6,182,212,0.02))",
          border: "1px solid rgba(124,58,237,0.1)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--v2-primary)", animation: "v2Pulse 2s infinite" }} />
            <span className="ov-lbl" style={{ color: "var(--v2-primary)" }}>AI Validation Summary</span>
          </div>
          <p style={{ fontSize: "0.85rem", color: "var(--v2-text-secondary)", lineHeight: 1.75, margin: 0 }}
            dangerouslySetInnerHTML={{
              __html: resumeAnalysis.summary.replace(/\*\*(.*?)\*\*/g, '<strong style="color:#1E1B4B;font-weight:700">$1</strong>')
            }}
          />
        </div>
      )}

      {/* ━━━ 2. PROFILE HEADER CARD ━━━ */}
      <div className="v2-card v2-animate-in v2-stagger-1" style={{ padding: 0, marginBottom: 16, overflow: "hidden", position: "relative" }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "linear-gradient(90deg, var(--v2-primary), var(--v2-cyan))" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 24, padding: "26px 28px" }}>
          {/* Avatar */}
          <div style={{
            width: 54, height: 54, borderRadius: 14, flexShrink: 0,
            background: "linear-gradient(135deg, var(--v2-primary), var(--v2-cyan))",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "1.15rem", fontWeight: 800, color: "#fff",
            boxShadow: "0 4px 14px rgba(124,58,237,0.2)",
          }}>
            {initials(employee.name)}
          </div>

          {/* Name + contact */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--v2-text)" }}>{employee.name}</div>
            {employee.role !== "N/A" && (
              <div style={{ fontSize: "0.8rem", color: "var(--v2-primary)", fontWeight: 500, marginTop: 2 }}>{employee.role}</div>
            )}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "3px 16px", marginTop: 8 }}>
              {employee.email !== "N/A" && <CopyField icon="✉" text={employee.email} />}
              {employee.phone !== "N/A" && <CopyField icon="📞" text={employee.phone} />}
              {employee.department !== "N/A" && <InfoField icon="🏢" text={employee.department} />}
              {employee.location !== "N/A" && <InfoField icon="📍" text={employee.location} />}
            </div>
          </div>

          {/* Hiring Decision Badge */}
          {recommendation && (() => {
            const rs = recStyle(recommendation);
            return (
              <div style={{
                background: rs.bg, border: `1.5px solid ${rs.border}`,
                borderRadius: 12, padding: "12px 20px", textAlign: "center", minWidth: 140,
              }}>
                <div style={{ fontSize: "0.56rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "2px", color: rs.color, marginBottom: 2 }}>
                  Hiring Decision
                </div>
                <div style={{ fontSize: "1.2rem", fontWeight: 800, color: rs.color }}>⚖ {rs.label}</div>
                {confidence && <div style={{ fontSize: "0.64rem", color: rs.color, marginTop: 2 }}>{confidence} Confidence</div>}
              </div>
            );
          })()}

          {/* Score Gauge */}
          {score !== null && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, flexShrink: 0 }}>
              <div className="v2-gauge-ring" style={{ width: 86, height: 86 }}>
                <svg width="86" height="86" viewBox="0 0 86 86">
                  <circle cx="43" cy="43" r={R} fill="none" stroke="rgba(0,0,0,0.05)" strokeWidth="7" />
                  <circle cx="43" cy="43" r={R} fill="none" stroke="url(#ovGG)" strokeWidth="7"
                    strokeDasharray={C} strokeDashoffset={gaugeOffset} strokeLinecap="round"
                    style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)" }} />
                  <defs><linearGradient id="ovGG" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="var(--v2-primary)" /><stop offset="100%" stopColor="var(--v2-cyan)" />
                  </linearGradient></defs>
                </svg>
                <div className="v2-gauge-inner">
                  <div style={{ fontFamily: "var(--v2-mono)", fontSize: "1.5rem", fontWeight: 700, color: scoreColor(score), lineHeight: 1 }}>{score}</div>
                  <div style={{ fontSize: "0.52rem", color: "var(--v2-text-muted)" }}>/ 100</div>
                </div>
              </div>
              <div style={{ fontSize: "0.58rem", fontWeight: 800, color: "var(--v2-text-muted)", textTransform: "uppercase", letterSpacing: "1.5px" }}>Match Score</div>
            </div>
          )}
        </div>

        {/* Info Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", borderTop: "1px solid rgba(0,0,0,0.05)" }}>
          {[
            { label: "Total Exp.", value: employee.experience || (totalYears ? `${totalYears} years` : null), icon: "💼" },
            employee.location !== "N/A" ? { label: "Current Location", value: employee.location, icon: "📍" } : null,
            employee.preferredLocation !== "N/A" ? { label: "Preferred Location", value: employee.preferredLocation, icon: "🏢" } : null,
            employee.currentSalary !== "N/A" ? { label: "Current Salary", value: `${formatINR(employee.currentSalary)} LPA`, icon: "💰" } : null,
            employee.expectedSalary !== "N/A" ? { label: "Expected Salary", value: `${formatINR(employee.expectedSalary)} LPA`, icon: "💰" } : null,
          ].filter(Boolean).map((item: any, i) => (
            <div key={i} style={{ padding: "12px 18px", borderRight: "1px solid rgba(0,0,0,0.04)", borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
              <div style={{ fontSize: "0.58rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1.2px", color: "var(--v2-text-muted)", marginBottom: 3 }}>
                {item.icon} {item.label}
              </div>
              <div style={{ fontSize: "0.84rem", fontWeight: 600, color: "var(--v2-text)" }}>{item.value || "—"}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ━━━ 3. FOUR INSIGHT STAT CARDS ━━━ */}
      {resumeAnalysis && (
        <div className="ov-row4 v2-animate-in v2-stagger-2">
          {/* Must-Have Skills */}
          <InsightCard accent="#10B981"
            label="Must-Have Skills"
            valueMain={mustHave ? String(mustHave.met) : String(parsedMatchedSkills.filter((s: any) => s.matched === "yes").length)}
            valueSub={mustHave ? `/${mustHave.total}` : `/${parsedMatchedSkills.length}`}
            desc={mustHaveUnmet > 0 ? `${mustHaveUnmet} critical requirement${mustHaveUnmet > 1 ? "s" : ""} unmet` : "All requirements met"}
            badge={`${coveragePct}% coverage`}
            badgeColor={coveragePct >= 70 ? "#059669" : "#D97706"}
            badgeBg={coveragePct >= 70 ? "rgba(16,185,129,0.08)" : "rgba(245,158,11,0.08)"}
          />

          {/* Nice-to-Have */}
          <InsightCard accent="#06B6D4"
            label="Nice-to-Have Skills"
            valueMain={niceToHave ? String(niceToHave.met) : "—"}
            valueSub={niceToHave ? `/${niceToHave.total}` : ""}
            desc={nicePct !== null ? `${nicePct}% secondary coverage` : "Not specified separately"}
            badge={nicePct !== null ? (nicePct >= 50 ? "Acceptable" : "Below average") : "N/A"}
            badgeColor="#0E7490" badgeBg="rgba(6,182,212,0.08)"
          />

          {/* Experience Gap */}
          <InsightCard accent={totalYears !== null && totalYears < 5 ? "#EF4444" : "#F59E0B"}
            label="Experience Gap"
            valueMain={totalYears !== null ? String(totalYears) : "—"}
            valueSub={totalYears !== null ? " yrs" : ""}
            desc={relevantYears !== null ? `${relevantYears} yrs relevant experience` : "No experience data"}
            badge={totalYears !== null ? (totalYears >= 5 ? "Meets Requirement" : "Below Threshold") : "N/A"}
            badgeColor={totalYears !== null && totalYears >= 5 ? "#059669" : "#D97706"}
            badgeBg={totalYears !== null && totalYears >= 5 ? "rgba(16,185,129,0.08)" : "rgba(245,158,11,0.08)"}
          />

          {/* Role Progression */}
          <div className="v2-card" style={{ padding: "18px 20px", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, left: 0, width: 3, height: "100%", background: "var(--v2-primary)", borderRadius: "16px 0 0 16px" }} />
            <div className="ov-lbl" style={{ marginBottom: 8 }}>Role Progression</div>
            {progressionChain.length > 0 ? (
              <>
                <div style={{ fontSize: "1.1rem", color: "var(--v2-primary)", fontWeight: 700, marginBottom: 4 }}>↑</div>
                <div style={{ fontSize: "0.72rem", color: "var(--v2-text-secondary)", lineHeight: 1.5 }}>
                  {progressionChain.join(" → ")}
                </div>
                <div style={{
                  display: "inline-flex", marginTop: 8, fontSize: "0.64rem", fontWeight: 600,
                  padding: "3px 10px", borderRadius: 20, background: "rgba(124,58,237,0.06)", color: "var(--v2-primary)",
                }}>
                  {roleProgression ? roleProgression.charAt(0).toUpperCase() + roleProgression.slice(1) : (progressionChain.length >= 3 ? "Ascending" : "Progressing")}
                </div>
              </>
            ) : (
              <div style={{ fontSize: "0.82rem", color: "var(--v2-text-muted)" }}>No work history</div>
            )}
          </div>
        </div>
      )}

      {/* ━━━ 4. FOUR ASSESSMENT CARDS ━━━ */}
      {resumeAnalysis && (
        <div className="ov-row4 v2-animate-in v2-stagger-3">
          <div className="v2-card" style={{ padding: "18px 20px" }}>
            <div className="ov-lbl" style={{ marginBottom: 8 }}>Overall Assessment</div>
            <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--v2-text)", marginBottom: 4 }}>
              {typeof assessmentTitle === "string" ? assessmentTitle.split(/[.—]/)[0].slice(0, 40) : "Assessment"}
            </div>
            <div style={{ fontSize: "0.7rem", color: "var(--v2-text-muted)", lineHeight: 1.5 }}>
              {typeof assessmentDesc === "string" ? assessmentDesc.slice(0, 120) : ""}
            </div>
          </div>

          <div className="v2-card" style={{ padding: "18px 20px" }}>
            <div className="ov-lbl" style={{ marginBottom: 8 }}>Primary Risk Factor</div>
            <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "#DC2626", marginBottom: 4 }}>
              {riskTitle ? (typeof riskTitle === "string" ? riskTitle.slice(0, 40) : "Risk Identified") : "None Identified"}
            </div>
            <div style={{ fontSize: "0.7rem", color: "var(--v2-text-muted)", lineHeight: 1.5 }}>
              {typeof riskDesc === "string" ? riskDesc.slice(0, 120) : ""}
            </div>
          </div>

          <div className="v2-card" style={{ padding: "18px 20px" }}>
            <div className="ov-lbl" style={{ marginBottom: 8 }}>Primary Strength</div>
            <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "#059669", marginBottom: 4 }}>
              {strengthTitle ? (typeof strengthTitle === "string" ? strengthTitle.slice(0, 40) : "Strength Identified") : "Skills Aligned"}
            </div>
            <div style={{ fontSize: "0.7rem", color: "var(--v2-text-muted)", lineHeight: 1.5 }}>
              {typeof strengthDesc === "string" ? strengthDesc.slice(0, 120) : ""}
            </div>
          </div>

          {recommendation ? (() => {
            const rs = recStyle(recommendation);
            return (
              <div style={{
                background: rs.bg, border: `1.5px solid ${rs.border}`, borderRadius: "var(--v2-radius)",
                padding: "18px 20px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center",
              }}>
                <div className="ov-lbl" style={{ marginBottom: 8, color: rs.color }}>Recommendation</div>
                <div style={{ fontSize: "1.6rem", fontWeight: 800, color: rs.color, letterSpacing: "1px" }}>{rs.label}</div>
                {confidence && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6, fontSize: "0.64rem", color: "var(--v2-text-muted)" }}>
                    Confidence: {confidence}
                    <span style={{ display: "flex", gap: 3 }}>
                      {[1, 2, 3].map((d) => (
                        <span key={d} style={{ width: 6, height: 6, borderRadius: "50%", background: d <= confDots(confidence) ? rs.color : "rgba(0,0,0,0.1)" }} />
                      ))}
                    </span>
                  </div>
                )}
              </div>
            );
          })() : (
            <div className="v2-card" style={{ padding: 18, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--v2-text-muted)", fontSize: "0.82rem" }}>No recommendation</div>
          )}
        </div>
      )}

      {/* ━━━ 5. COMPETENCY DIMENSION SCORES + CAREER PROGRESSION ━━━ */}
      {(competencyDims.length > 0 || careerEntries.length > 0) && (
        <div className="ov-row2 v2-animate-in v2-stagger-4">
          {competencyDims.length > 0 && (
            <div className="v2-card" style={{ padding: "20px 22px" }}>
              <div className="ov-lbl" style={{ marginBottom: 14 }}>Competency Dimension Scores</div>
              {competencyDims.map((dim, i) => {
                const pct = (dim.score / 10) * 100;
                const lb = barLabel(dim.score);
                return (
                  <div className="ov-dim-row" key={i}>
                    <div style={{ fontSize: "0.76rem", fontWeight: 500, color: "var(--v2-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={dim.name}>
                      {dim.name}
                    </div>
                    <div className="v2-dim-track">
                      <div className="v2-dim-fill" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${barColor(dim.score)}, ${barColor(dim.score)}bb)` }} />
                    </div>
                    <div style={{ fontFamily: "var(--v2-mono)", fontSize: "0.8rem", fontWeight: 700, color: barColor(dim.score), textAlign: "right" }}>
                      {Math.round(dim.score)}
                    </div>
                    <div style={{ fontSize: "0.62rem", fontWeight: 700, padding: "2px 8px", borderRadius: 4, textAlign: "center", background: lb.bg, color: lb.color }}>
                      {lb.text}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {careerEntries.length > 0 && (
              <div className="v2-card" style={{ padding: "20px 22px" }}>
                <div className="ov-lbl" style={{ marginBottom: 14 }}>Career Progression</div>
                {careerEntries.map((entry: any, i: number) => {
                  const name = entry.name || entry.company_name || "Unknown";
                  const desg = entry.designation || "";
                  const dur = entry.duration || entry.years || "";
                  const rel = entry.relevance_score ?? null;
                  return (
                    <div className="ov-career-item" key={i}>
                      <div className={`ov-dot ${i === 0 ? "active" : ""}`} />
                      <div>
                        <div style={{ fontSize: "0.86rem", fontWeight: 700, color: "var(--v2-text)" }}>{name}</div>
                        {desg && <div style={{ fontSize: "0.74rem", color: "var(--v2-primary)", fontWeight: 500, marginTop: 1 }}>{desg}</div>}
                        <div style={{ fontSize: "0.68rem", color: "var(--v2-text-muted)", marginTop: 2 }}>{dur}</div>
                        {rel !== null && (
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 5 }}>
                            <div className="ov-rel-bar">
                              <div className="ov-rel-fill" style={{ width: `${(rel / 10) * 100}%`, background: barColor(rel) }} />
                            </div>
                            <span style={{ fontSize: "0.64rem", fontWeight: 600, color: "var(--v2-text-muted)" }}>{rel}/10 Relevance</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {certs.length > 0 && (
              <div className="v2-card" style={{ padding: "20px 22px" }}>
                <div className="ov-lbl" style={{ marginBottom: 12 }}>Certifications</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
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

      {/* ━━━ 6. KEY DIFFERENTIATORS ━━━ */}
      {keyDifferentiators.length > 0 && (
        <div className="v2-card v2-animate-in v2-stagger-5" style={{ padding: "14px 22px", marginBottom: 16, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span style={{ fontSize: "0.6rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "1.5px", color: "var(--v2-primary)", whiteSpace: "nowrap" }}>✦ Key Differentiators</span>
          {keyDifferentiators.map((d: string, i: number) => (
            <span key={i} style={{ fontSize: "0.74rem", color: "var(--v2-text-secondary)", padding: "4px 12px", borderRadius: 8, background: "var(--v2-primary-50)", border: "1px solid var(--v2-primary-100)" }}>{d}</span>
          ))}
        </div>
      )}

      {/* ━━━ 7. TOP SKILLS ━━━ */}
      {topSkills.length > 0 && (
        <div className="v2-card v2-animate-in v2-stagger-5" style={{ padding: "14px 22px", marginBottom: 16, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontSize: "0.6rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "1.5px", color: "#0E7490", whiteSpace: "nowrap" }}>Top Skills</span>
          {topSkills.map((s: any, i: number) => {
            const name = typeof s === "string" ? s : s?.name || "Skill";
            return <span key={i} style={{ fontSize: "0.76rem", fontWeight: 500, padding: "5px 14px", borderRadius: 8, background: "rgba(6,182,212,0.06)", border: "1px solid rgba(6,182,212,0.15)", color: "#0E7490" }}>{name}</span>;
          })}
        </div>
      )}

      {/* ━━━ 8. VALIDATED STRENGTHS & GAPS ━━━ */}
      {(effectiveStrengths.length > 0 || effectiveGaps.length > 0) && (
        <div className="ov-row2 v2-animate-in v2-stagger-5">
          <div className="v2-card" style={{ padding: "20px 22px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: "#10B981" }} />
              <span className="ov-lbl" style={{ color: "#059669" }}>Validated Strengths</span>
            </div>
            {effectiveStrengths.map((item: any, i: number) => {
              const title = typeof item === "string" ? item : item?.title || item?.name || item?.strength || item?.requirement || "Strength";
              const desc = typeof item === "object" ? (item?.description || item?.details || item?.evidence || "") : "";
              return (
                <div className="ov-sg-item" key={i}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                    <span style={{ color: "#10B981", fontSize: "0.85rem", marginTop: 1, flexShrink: 0 }}>◆</span>
                    <div>
                      <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#059669" }}>{title}</div>
                      {desc && <div style={{ fontSize: "0.72rem", color: "var(--v2-text-muted)", lineHeight: 1.5, marginTop: 2 }}>{desc}</div>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="v2-card" style={{ padding: "20px 22px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#EF4444" }} />
              <span className="ov-lbl" style={{ color: "#DC2626" }}>Validated Gaps</span>
            </div>
            {effectiveGaps.length > 0 ? effectiveGaps.map((item: any, i: number) => {
              const title = typeof item === "string" ? item : item?.title || item?.name || item?.gap || "Gap";
              const desc = typeof item === "object" ? (item?.description || item?.details || "") : "";
              const severity = typeof item === "object" ? (item?.severity || item?.priority || "") : "";
              const ss = sevStyle(severity);
              return (
                <div className="ov-sg-item" key={i}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                    <span style={{ color: "#EF4444", fontSize: "0.78rem", marginTop: 2, flexShrink: 0 }}>⚠</span>
                    <div>
                      <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#DC2626" }}>{title}</div>
                      {desc && <div style={{ fontSize: "0.72rem", color: "var(--v2-text-muted)", lineHeight: 1.5, marginTop: 2 }}>{desc}</div>}
                      {severity && <span className="ov-sev" style={{ background: ss.bg, color: ss.color, border: `1px solid ${ss.border}` }}>{severity}</span>}
                    </div>
                  </div>
                </div>
              );
            }) : (
              <div style={{ fontSize: "0.82rem", color: "var(--v2-text-muted)", textAlign: "center", padding: 20 }}>No significant gaps identified</div>
            )}
          </div>
        </div>
      )}

      {/* ━━━ 9. CANDIDATE SKILLS (compact) ━━━ */}
      {/* ━━━ 9. CANDIDATE SKILLS (full rich version) ━━━ */}
{Object.keys(sortedGroupedSkills).length > 0 && !isLoadingEnriched && (
  <V2SkillsPanel
    sortedGroupedSkills={sortedGroupedSkills}
    isLoading={isLoadingEnriched}
    skillRatings={employee.skillRatings || []}
    shareMode={shareMode}
    sharedDataOptions={currentDataOptions}
    // We want the full/expanded look in Overview tab
    expanded={true}
  />
)}
    </div>
  );
};

/* ─── Sub-components ─── */
const CopyField: React.FC<{ icon: string; text: string }> = ({ icon, text }) => (
  <span style={{ fontSize: "0.73rem", color: "var(--v2-text-secondary)", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
    onClick={() => navigator.clipboard.writeText(text)} title="Click to copy">{icon} {text}</span>
);
const InfoField: React.FC<{ icon: string; text: string }> = ({ icon, text }) => (
  <span style={{ fontSize: "0.73rem", color: "var(--v2-text-secondary)", display: "flex", alignItems: "center", gap: 4 }}>{icon} {text}</span>
);
const InsightCard: React.FC<{
  accent: string; label: string; valueMain: string; valueSub: string;
  desc: string; badge: string; badgeColor: string; badgeBg: string;
}> = ({ accent, label, valueMain, valueSub, desc, badge, badgeColor, badgeBg }) => (
  <div className="v2-card" style={{ padding: "18px 20px", position: "relative", overflow: "hidden" }}>
    <div style={{ position: "absolute", top: 0, left: 0, width: 3, height: "100%", background: accent, borderRadius: "16px 0 0 16px" }} />
    <div className="ov-lbl" style={{ marginBottom: 8 }}>{label}</div>
    <div style={{ display: "flex", alignItems: "baseline", gap: 2 }}>
      <span style={{ fontFamily: "var(--v2-mono)", fontSize: "2rem", fontWeight: 800, color: accent, lineHeight: 1 }}>{valueMain}</span>
      <span style={{ fontFamily: "var(--v2-mono)", fontSize: "1rem", fontWeight: 500, color: "var(--v2-text-muted)" }}>{valueSub}</span>
    </div>
    <div style={{ fontSize: "0.7rem", color: "var(--v2-text-muted)", marginTop: 5 }}>{desc}</div>
    <div style={{ display: "inline-flex", marginTop: 7, fontSize: "0.62rem", fontWeight: 600, padding: "3px 10px", borderRadius: 20, background: badgeBg, color: badgeColor }}>{badge}</div>
  </div>
);