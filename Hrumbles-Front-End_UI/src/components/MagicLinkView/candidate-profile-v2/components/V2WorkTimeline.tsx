import React, { useState } from "react";

interface V2WorkTimelineProps {
  workHistory: any[];
  shareMode: boolean;
  isVerifyingAll: boolean;
  onVerifyAllCompanies: () => void;
  onVerifySingleWorkHistory: (company: any) => void;
  updateWorkHistoryItem: (companyId: number, updates: any) => void;
  expanded?: boolean;
}

export const V2WorkTimeline: React.FC<V2WorkTimelineProps> = ({
  workHistory,
  shareMode,
  isVerifyingAll,
  onVerifyAllCompanies,
  onVerifySingleWorkHistory,
  updateWorkHistoryItem,
  expanded = false,
}) => {
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = expanded ? 8 : 4;

  if (!workHistory || workHistory.length === 0) return null;

  const totalPages = Math.ceil(workHistory.length / itemsPerPage);
  const currentItems = workHistory.slice(
    currentPage * itemsPerPage,
    (currentPage + 1) * itemsPerPage
  );

  return (
    <div className="v2-card v2-animate-in" style={{ padding: 0, marginBottom: 20, overflow: "hidden" }}>
      {/* Header */}
      <div style={{
        padding: "18px 24px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        borderBottom: "1px solid var(--v2-border2)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: "linear-gradient(135deg, var(--v2-primary), var(--v2-cyan))",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontSize: "0.82rem",
          }}>
            💼
          </div>
          <div>
            <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--v2-text)" }}>
              Career Timeline
            </span>
            <span style={{
              fontSize: "0.68rem", padding: "2px 8px", borderRadius: 12,
              background: "var(--v2-primary-50)", color: "var(--v2-primary)",
              marginLeft: 10,
            }}>
              {workHistory.length} {workHistory.length === 1 ? "role" : "roles"}
            </span>
          </div>
        </div>
        {!shareMode && (
          <button
            onClick={onVerifyAllCompanies}
            disabled={isVerifyingAll}
            style={{
              padding: "6px 14px", borderRadius: 8, cursor: isVerifyingAll ? "not-allowed" : "pointer",
              fontSize: "0.74rem", fontWeight: 600, border: "1px solid var(--v2-primary-200)",
              background: isVerifyingAll ? "var(--v2-primary-50)" : "transparent",
              color: "var(--v2-primary)", fontFamily: "var(--v2-font)", transition: "all 0.2s",
              opacity: isVerifyingAll ? 0.7 : 1,
            }}
          >
            {isVerifyingAll ? "⏳ Verifying…" : "⚡ Verify All"}
          </button>
        )}
      </div>

      {/* Timeline */}
      <div style={{ padding: "24px 32px", position: "relative" }}>
        {/* Horizontal line */}
        <div style={{
          position: "absolute", top: 38, left: 32, right: 32,
          height: 2, background: "linear-gradient(90deg, var(--v2-primary-200), var(--v2-primary-100), rgba(6,182,212,0.2))",
          borderRadius: 1,
        }} />

        <div style={{
          display: "grid",
          gridTemplateColumns: `repeat(${Math.min(currentItems.length, 4)}, 1fr)`,
          gap: 16,
          position: "relative",
        }}>
          {currentItems.map((h, i) => {
            const companyName = h.isVerified
              ? h.selectedCompanyOption?.verifiedCompanyName || h.company_name
              : h.company_name;

            return (
              <div
                key={h.company_id || i}
                className={`v2-animate-in v2-stagger-${i + 1}`}
                style={{
                  display: "flex", flexDirection: "column", alignItems: "center",
                  textAlign: "center", position: "relative",
                }}
              >
                {/* Timeline dot */}
                <div style={{
                  position: "relative", zIndex: 10,
                  width: 36, height: 36, borderRadius: "50%",
                  background: i === 0
                    ? "linear-gradient(135deg, var(--v2-primary), var(--v2-cyan))"
                    : "linear-gradient(135deg, var(--v2-primary-light), #A78BFA)",
                  border: "3px solid var(--v2-surface-solid)",
                  boxShadow: "0 2px 8px rgba(124,58,237,0.2)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  marginBottom: 12,
                  cursor: !shareMode ? "pointer" : "default",
                  transition: "transform 0.2s",
                }}
                onClick={() => !shareMode && !h.isVerifying && onVerifySingleWorkHistory(h)}
                onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.1)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
                title={!shareMode ? "Click to verify" : ""}
                >
                  {h.isVerifying ? (
                    <div style={{
                      width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)",
                      borderTopColor: "#fff", borderRadius: "50%",
                      animation: "spin 0.8s linear infinite",
                    }} />
                  ) : h.isEmployeeVerified ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#fff" }} />
                  )}
                </div>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

                {/* Company name */}
                <p style={{
                  fontSize: "0.78rem", fontWeight: 700, color: "var(--v2-text)",
                  lineHeight: 1.3, marginBottom: 2, maxWidth: 160,
                  overflow: "hidden", textOverflow: "ellipsis",
                  display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
                }}>
                  {companyName}
                </p>

                {/* Designation */}
                <p style={{
                  fontSize: "0.72rem", fontWeight: 600,
                  color: "var(--v2-primary)", marginBottom: 2,
                }}>
                  {h.designation || "—"}
                </p>

                {/* Duration */}
                <p style={{ fontSize: "0.7rem", color: "var(--v2-text-muted)" }}>
                  {h.years || "—"}
                </p>

                {/* Verification Status */}
                <div style={{ marginTop: 6, minHeight: 18 }}>
                  {h.isEmployeeVerified && (
                    <span style={{
                      fontSize: "0.62rem", fontWeight: 600, padding: "2px 8px",
                      borderRadius: 12, background: "rgba(16,185,129,0.1)",
                      color: "#059669", border: "1px solid rgba(16,185,129,0.2)",
                    }}>
                      ✓ Verified
                    </span>
                  )}
                  {h.verificationError && (
                    <p style={{ fontSize: "0.6rem", color: "var(--v2-red)", lineHeight: 1.3, maxWidth: 140 }}>
                      {h.verificationError}
                    </p>
                  )}
                  {h.employeeVerificationError && (
                    <p style={{ fontSize: "0.6rem", color: "var(--v2-red)", lineHeight: 1.3, maxWidth: 140 }}>
                      {h.employeeVerificationError}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          gap: 12, padding: "0 24px 16px",
        }}>
          <button
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 0))}
            disabled={currentPage === 0}
            style={{
              width: 30, height: 30, borderRadius: "50%", cursor: currentPage === 0 ? "not-allowed" : "pointer",
              border: "1px solid var(--v2-border2)", background: "transparent",
              display: "flex", alignItems: "center", justifyContent: "center",
              opacity: currentPage === 0 ? 0.3 : 1, transition: "all 0.2s",
              color: "var(--v2-text-secondary)", fontSize: "0.9rem",
            }}
          >
            ‹
          </button>
          <span style={{ fontSize: "0.72rem", color: "var(--v2-text-muted)" }}>
            {currentPage + 1} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages - 1))}
            disabled={currentPage === totalPages - 1}
            style={{
              width: 30, height: 30, borderRadius: "50%", cursor: currentPage === totalPages - 1 ? "not-allowed" : "pointer",
              border: "1px solid var(--v2-border2)", background: currentPage === totalPages - 1 ? "transparent" : "var(--v2-primary)",
              display: "flex", alignItems: "center", justifyContent: "center",
              opacity: currentPage === totalPages - 1 ? 0.3 : 1, transition: "all 0.2s",
              color: currentPage === totalPages - 1 ? "var(--v2-text-secondary)" : "#fff", fontSize: "0.9rem",
            }}
          >
            ›
          </button>
        </div>
      )}
    </div>
  );
};