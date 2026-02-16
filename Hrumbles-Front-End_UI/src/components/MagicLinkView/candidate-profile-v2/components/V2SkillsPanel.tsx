import React, { useMemo, useState } from "react";

interface V2SkillsPanelProps {
  sortedGroupedSkills: Record<string, { name: string; description: string; relatedSkills?: string[] }[]>;
  isLoading: boolean;
  skillRatings: Array<{ name: string; rating: number; experienceYears?: number; experienceMonths?: number }>;
  shareMode: boolean;
  sharedDataOptions?: any;
  expanded?: boolean;
}

export const V2SkillsPanel: React.FC<V2SkillsPanelProps> = ({
  sortedGroupedSkills,
  isLoading,
  skillRatings,
  shareMode,
  sharedDataOptions,
  expanded = false,
}) => {
  const [hoveredSkill, setHoveredSkill] = useState<string | null>(null);

  const hasGroupedSkills = Object.keys(sortedGroupedSkills).length > 0;
  const hasRatings = skillRatings && skillRatings.length > 0;

  if (isLoading) {
    return (
      <div className="v2-card v2-animate-in" style={{ padding: 24, marginBottom: 20 }}>
        <div style={{ height: 120, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{
            width: 32, height: 32, border: "3px solid var(--v2-primary-200)",
            borderTopColor: "var(--v2-primary)", borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  if (!hasGroupedSkills && !hasRatings) return null;
  if (shareMode && !sharedDataOptions?.skillinfo && !sharedDataOptions?.personalInfo) return null;

  const groupedEntries = Object.entries(sortedGroupedSkills);

  // Split into two columns if many categories
  const shouldSplit = groupedEntries.length > 3;
  const mid = Math.ceil(groupedEntries.length / 2);
  const firstHalf = groupedEntries.slice(0, mid);
  const secondHalf = groupedEntries.slice(mid);

  const getExpText = (skill: any) => {
    const y = skill.experienceYears || 0;
    const m = skill.experienceMonths || 0;
    if (y > 0 && m > 0) return `${y}.${m} yrs`;
    if (y > 0) return `${y} yr${y > 1 ? "s" : ""}`;
    if (m > 0) return `${m} mo${m > 1 ? "s" : ""}`;
    return "0 yrs";
  };

  const renderStars = (rating: number) => (
    <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <svg key={s} width="14" height="14" viewBox="0 0 24 24" fill={s <= rating ? "#7C3AED" : "#E2E8F0"} stroke="none">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
      <span style={{ fontFamily: "var(--v2-mono)", fontSize: "0.72rem", fontWeight: 600, color: "var(--v2-text-secondary)", marginLeft: 4 }}>
        {rating}/5
      </span>
    </div>
  );

  const renderSkillsTable = (data: [string, any[]][]) => (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
      <thead>
        <tr style={{ borderBottom: "2px solid var(--v2-border2)" }}>
          <th style={{
            padding: "8px 12px", textAlign: "left", fontSize: "0.65rem",
            fontWeight: 700, textTransform: "uppercase", letterSpacing: "1.2px",
            color: "var(--v2-text-muted)", width: "30%",
          }}>
            Category
          </th>
          <th style={{
            padding: "8px 12px", textAlign: "left", fontSize: "0.65rem",
            fontWeight: 700, textTransform: "uppercase", letterSpacing: "1.2px",
            color: "var(--v2-text-muted)",
          }}>
            Skills
          </th>
        </tr>
      </thead>
      <tbody>
        {data.map(([category, items]) => (
          <React.Fragment key={category}>
            {items.map((item: any, idx: number) => (
              <tr
                key={`${category}-${idx}`}
                style={{ borderBottom: "1px solid var(--v2-border2)", transition: "background 0.2s" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--v2-primary-50)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                {idx === 0 && (
                  <td
                    rowSpan={items.length}
                    style={{
                      padding: "12px 14px", verticalAlign: "top",
                      borderRight: "1px solid var(--v2-border2)",
                      background: "rgba(124,58,237,0.02)",
                    }}
                  >
                    <span style={{ fontWeight: 700, fontSize: "0.78rem", color: "var(--v2-text)" }}>
                      {category}
                    </span>
                  </td>
                )}
                <td style={{ padding: "10px 14px" }}>
                  <div style={{ position: "relative", display: "inline-block" }}>
                    <span
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 6,
                        padding: "4px 12px", borderRadius: 8,
                        background: "linear-gradient(135deg, var(--v2-primary-50), rgba(6,182,212,0.04))",
                        border: "1px solid var(--v2-primary-100)",
                        fontSize: "0.78rem", fontWeight: 600, color: "var(--v2-primary-dark)",
                        cursor: "help", transition: "all 0.2s",
                      }}
                      onMouseEnter={() => setHoveredSkill(`${category}-${idx}`)}
                      onMouseLeave={() => setHoveredSkill(null)}
                    >
                      {item.name}
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.4">
                        <circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" />
                      </svg>
                    </span>

                    {/* Tooltip */}
                    {hoveredSkill === `${category}-${idx}` && (
                      <div style={{
                        position: "absolute", bottom: "calc(100% + 8px)",
                        left: "50%", transform: "translateX(-50%)",
                        width: 280, padding: 0, borderRadius: 12,
                        background: "#1E1B4B", color: "#fff",
                        boxShadow: "0 12px 40px rgba(0,0,0,0.25)",
                        zIndex: 100, pointerEvents: "none",
                        animation: "v2ScaleIn 0.15s ease",
                        overflow: "hidden",
                      }}>
                        <div style={{
                          padding: "10px 14px",
                          background: "rgba(255,255,255,0.08)",
                          borderBottom: "1px solid rgba(255,255,255,0.1)",
                          display: "flex", justifyContent: "space-between", alignItems: "center",
                        }}>
                          <span style={{ fontSize: "0.6rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1.5px", color: "#A78BFA" }}>
                            Skill Details
                          </span>
                        </div>
                        <div style={{ padding: "12px 14px" }}>
                          <p style={{ fontWeight: 700, fontSize: "0.82rem", marginBottom: 4 }}>{item.name}</p>
                          <p style={{ fontSize: "0.72rem", color: "#CBD5E1", lineHeight: 1.5, marginBottom: 8 }}>
                            {item.description || "Professional proficiency required."}
                          </p>
                          {item.relatedSkills && item.relatedSkills.length > 0 && (
                            <div style={{ paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.1)" }}>
                              <div style={{ fontSize: "0.58rem", fontWeight: 700, textTransform: "uppercase", color: "#64748B", marginBottom: 6 }}>
                                Related Skills
                              </div>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                                {item.relatedSkills.slice(0, 3).map((rs: string, ri: number) => (
                                  <span key={ri} style={{
                                    fontSize: "0.65rem", padding: "2px 8px", borderRadius: 4,
                                    background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)",
                                    color: "#CBD5E1",
                                  }}>
                                    {rs}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        {/* Arrow */}
                        <div style={{
                          position: "absolute", top: "100%", left: "50%",
                          transform: "translateX(-50%)", width: 0, height: 0,
                          borderLeft: "7px solid transparent", borderRight: "7px solid transparent",
                          borderTop: "7px solid #1E1B4B",
                        }} />
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </React.Fragment>
        ))}
      </tbody>
    </table>
  );

  return (
    <div style={{ marginBottom: 20 }}>
      {/* ─── Grouped Skills Table ─── */}
      {hasGroupedSkills && (
        <div className="v2-card v2-animate-in" style={{ padding: 0, marginBottom: 20, overflow: "visible" }}>
          <div style={{
            padding: "18px 24px", borderBottom: "1px solid var(--v2-border2)",
            display: "flex", alignItems: "center", gap: 10,
          }}>
            <div style={{
              padding: "6px 8px", borderRadius: 8,
              background: "linear-gradient(135deg, var(--v2-primary-100), rgba(6,182,212,0.1))",
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--v2-primary)" strokeWidth="2">
                <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
              </svg>
            </div>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1.2px", color: "var(--v2-primary)" }}>
              Candidate Skills
            </span>
            <span style={{
              marginLeft: "auto", fontSize: "0.68rem", padding: "2px 8px",
              borderRadius: 12, background: "var(--v2-primary-50)", color: "var(--v2-primary)",
            }}>
              {groupedEntries.reduce((t, [, items]) => t + items.length, 0)} skills
            </span>
          </div>

          <div style={{ padding: shouldSplit ? "16px" : "16px 20px", overflow: "visible" }}>
            {shouldSplit ? (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                <div style={{ borderRight: "1px solid var(--v2-border2)", paddingRight: 12 }}>
                  {renderSkillsTable(firstHalf)}
                </div>
                <div style={{ paddingLeft: 12 }}>
                  {renderSkillsTable(secondHalf)}
                </div>
              </div>
            ) : (
              renderSkillsTable(groupedEntries)
            )}
          </div>
        </div>
      )}

      {/* ─── Skill Ratings (expanded view only) ─── */}
      {expanded && hasRatings && (!shareMode || sharedDataOptions?.personalInfo) && (
        <div className="v2-card v2-animate-in" style={{ padding: 24 }}>
          <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--v2-text)", marginBottom: 16 }}>
            Skill Ratings
          </h3>
          <div style={{ maxHeight: 600, overflowY: "auto" }}>
            {[...skillRatings]
              .sort((a, b) => b.rating - a.rating)
              .map((skill, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "10px 14px", borderBottom: "1px solid var(--v2-border2)",
                    transition: "background 0.2s", borderRadius: 8,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--v2-primary-50)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <span style={{ fontSize: "0.84rem", fontWeight: 500, color: "var(--v2-text)" }}>
                    {skill.name}
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <span style={{
                      fontSize: "0.72rem", fontWeight: 600, padding: "3px 10px",
                      borderRadius: 6, background: "var(--v2-primary-50)",
                      color: "var(--v2-primary)", border: "1px solid var(--v2-primary-100)",
                    }}>
                      {getExpText(skill)}
                    </span>
                    {renderStars(skill.rating)}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};