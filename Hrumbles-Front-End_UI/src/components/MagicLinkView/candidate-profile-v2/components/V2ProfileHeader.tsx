import React from "react";

interface V2ProfileHeaderProps {
  employee: any;
  resumeAnalysis: any;
  parsedMatchQuality: any;
  shareMode: boolean;
  formatINR: (v: any) => string;
}

export const V2ProfileHeader: React.FC<V2ProfileHeaderProps> = ({
  employee,
  resumeAnalysis,
  parsedMatchQuality,
  shareMode,
  formatINR,
}) => {
  const score = resumeAnalysis?.overall_score || null;
  const recommendation = parsedMatchQuality?.hiring_recommendation || null;
  const confidence = parsedMatchQuality?.confidence_level || null;

  const getScoreColor = (s: number) => {
    if (s >= 80) return "var(--v2-green)";
    if (s >= 60) return "var(--v2-amber)";
    return "var(--v2-red)";
  };

  const getInitials = (name: string) => {
    const parts = name.split(" ").filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return parts[0]?.[0]?.toUpperCase() || "?";
  };

  const getRecommendationLabel = (rec: string) => {
    const r = rec?.toLowerCase();
    if (r === "yes" || r === "hire") return "Recommended";
    if (r === "no" || r === "reject") return "Not Recommended";
    return "Under Review";
  };

  const getRecommendationColor = (rec: string) => {
    const r = rec?.toLowerCase();
    if (r === "yes" || r === "hire") return "var(--v2-green)";
    if (r === "no" || r === "reject") return "var(--v2-red)";
    return "var(--v2-amber)";
  };

  // Circle gauge calculation
  const gaugeRadius = 36;
  const gaugeCircumference = 2 * Math.PI * gaugeRadius;
  const gaugeOffset = score ? gaugeCircumference - (score / 100) * gaugeCircumference : gaugeCircumference;

  const expText = (() => {
    const parts: string[] = [];
    if (employee.relevantExpYears && employee.relevantExpYears !== "N/A") parts.push(`${employee.relevantExpYears}Y`);
    if (employee.relevantExpMonths && employee.relevantExpMonths !== "N/A") parts.push(`${employee.relevantExpMonths}M`);
    return parts.length > 0 ? parts.join(" ") : null;
  })();

  return (
    <div
      className="v2-card v2-animate-in"
      style={{ padding: 0, marginBottom: 20, overflow: "hidden", position: "relative" }}
    >
      {/* Accent bar */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 3,
        background: "linear-gradient(90deg, var(--v2-primary), var(--v2-cyan))",
      }} />

      <div style={{
        display: "grid",
        gridTemplateColumns: score ? "auto 1fr auto auto" : "auto 1fr auto",
        gap: 28, alignItems: "center",
        padding: "28px 32px",
      }}>
        {/* Avatar */}
        <div style={{
          width: 60, height: 60, borderRadius: 14,
          background: "linear-gradient(135deg, var(--v2-primary), var(--v2-cyan))",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "var(--v2-font)", fontSize: "1.3rem", fontWeight: 800,
          color: "#fff", flexShrink: 0,
          boxShadow: "0 4px 16px rgba(124,58,237,0.2)",
        }}>
          {getInitials(employee.name)}
        </div>

        {/* Info */}
        <div>
          <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--v2-text)" }}>
            {employee.name}
          </div>
          {employee.role !== "N/A" && (
            <div style={{ fontSize: "0.82rem", color: "var(--v2-primary)", marginTop: 3, fontWeight: 500 }}>
              {employee.role}
            </div>
          )}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 20px", marginTop: 10 }}>
            {employee.email !== "N/A" && (
              <span
                style={{ fontSize: "0.77rem", color: "var(--v2-text-secondary)", cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}
                onClick={() => { navigator.clipboard.writeText(employee.email); }}
                title="Click to copy"
              >
                ✉ {employee.email}
              </span>
            )}
            {employee.phone !== "N/A" && (
              <span
                style={{ fontSize: "0.77rem", color: "var(--v2-text-secondary)", cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}
                onClick={() => { navigator.clipboard.writeText(employee.phone); }}
                title="Click to copy"
              >
                📞 {employee.phone}
              </span>
            )}
            {employee.linkedInId !== "N/A" && (
              <a
                href={employee.linkedInId}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: "0.77rem", color: "var(--v2-primary)", textDecoration: "none", display: "flex", alignItems: "center", gap: 5 }}
              >
                🔗 LinkedIn
              </a>
            )}
            {employee.location !== "N/A" && (
              <span style={{ fontSize: "0.77rem", color: "var(--v2-text-secondary)", display: "flex", alignItems: "center", gap: 5 }}>
                📍 {employee.location}
              </span>
            )}
          </div>
        </div>

        {/* Recommendation block */}
        {recommendation && (
          <div style={{
            background: `${getRecommendationColor(recommendation)}10`,
            border: `1px solid ${getRecommendationColor(recommendation)}30`,
            borderRadius: 12, padding: "14px 20px",
            textAlign: "center", minWidth: 130,
          }}>
            <div style={{
              fontSize: "0.62rem", fontWeight: 700, textTransform: "uppercase",
              letterSpacing: "1.5px", color: getRecommendationColor(recommendation),
              marginBottom: 4,
            }}>
              Recommendation
            </div>
            <div style={{ fontSize: "1rem", fontWeight: 700, color: getRecommendationColor(recommendation) }}>
              {getRecommendationLabel(recommendation)}
            </div>
            {confidence && (
              <div style={{ fontSize: "0.68rem", color: "var(--v2-text-muted)", marginTop: 3 }}>
                {confidence} confidence
              </div>
            )}
          </div>
        )}

        {/* Score gauge */}
        {score && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, minWidth: 100 }}>
            <div className="v2-gauge-ring" style={{ width: 84, height: 84 }}>
              <svg width="84" height="84" viewBox="0 0 84 84">
                <circle cx="42" cy="42" r={gaugeRadius} fill="none" stroke="rgba(124,58,237,0.08)" strokeWidth="7" />
                <circle
                  cx="42" cy="42" r={gaugeRadius} fill="none"
                  stroke={`url(#v2GaugeGrad)`}
                  strokeWidth="7"
                  strokeDasharray={gaugeCircumference}
                  strokeDashoffset={gaugeOffset}
                  strokeLinecap="round"
                  style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)" }}
                />
                <defs>
                  <linearGradient id="v2GaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="var(--v2-primary)" />
                    <stop offset="100%" stopColor="var(--v2-cyan)" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="v2-gauge-inner">
                <div style={{ fontFamily: "var(--v2-mono)", fontSize: "1.4rem", fontWeight: 700, color: getScoreColor(score), lineHeight: 1 }}>
                  {score}
                </div>
                <div style={{ fontSize: "0.58rem", color: "var(--v2-text-muted)" }}>/ 100</div>
              </div>
            </div>
            <div style={{
              fontSize: "0.65rem", fontWeight: 700, color: "var(--v2-text-muted)",
              textTransform: "uppercase", letterSpacing: "1px",
            }}>
              Match Score
            </div>
          </div>
        )}
      </div>

      {/* ─── Info Grid ─── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
        gap: 0,
        borderTop: "1px solid var(--v2-border2)",
      }}>
        {[
          { label: "Total Exp.", value: employee.experience, icon: "💼" },
          expText ? { label: "Relevant Exp.", value: expText, icon: "⭐" } : null,
          { label: "Current Location", value: employee.location, icon: "📍" },
          employee.preferredLocation !== "N/A" ? { label: "Preferred Location", value: employee.preferredLocation, icon: "🏢" } : null,
          employee.currentSalary !== "N/A" ? { label: "Current Salary", value: `${formatINR(employee.currentSalary)} LPA`, icon: "💰" } : null,
          employee.expectedSalary !== "N/A" ? { label: "Expected Salary", value: `${formatINR(employee.expectedSalary)} LPA`, icon: "💰" } : null,
          employee.noticePeriod !== "N/A" ? { label: "Notice Period", value: employee.noticePeriod, icon: "📅", tooltip: employee.lastWorkingDay ? `LWD: ${employee.lastWorkingDay}` : null } : null,
          employee.hasOffers !== "N/A" ? { label: "Has Offers", value: employee.hasOffers, icon: "🤝" } : null,
        ]
          .filter(Boolean)
          .map((item: any, i) => (
            <div
              key={i}
              style={{
                padding: "14px 20px",
                borderRight: "1px solid var(--v2-border2)",
                borderBottom: "1px solid var(--v2-border2)",
                position: "relative",
              }}
              title={item.tooltip || ""}
            >
              <div style={{
                fontSize: "0.62rem", fontWeight: 700, textTransform: "uppercase",
                letterSpacing: "1.2px", color: "var(--v2-text-muted)", marginBottom: 4,
              }}>
                {item.icon} {item.label}
              </div>
              <div style={{
                fontSize: "0.84rem", fontWeight: 600, color: "var(--v2-text)",
                borderBottom: item.tooltip ? "1px dotted var(--v2-text-muted)" : "none",
                width: "fit-content",
              }}>
                {item.value === "N/A" ? "—" : item.value}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
};