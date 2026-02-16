/**
 * V2BgvResults — Read-only BGV verification results for shared profiles.
 *
 * Renders verified data from uanlookups table in the V2 theme.
 * No verify buttons, no interactions — purely view-only.
 *
 * Supports result types:
 *   - mobile_to_uan / pan_to_uan → UAN lookup results
 *   - latest_employment_uan / latest_employment_mobile → Latest employment
 *   - uan_full_history / uan_full_history_gl → Full employment history
 *   - latest_passbook_mobile → EPFO Passbook
 */

import React from "react";

interface BgvResultItem {
  status: string;
  data: any;
  meta: {
    timestamp: string;
    inputValue: string;
  };
}

interface BgvResults {
  [lookupType: string]: BgvResultItem[];
}

interface V2BgvResultsProps {
  bgvResults: BgvResults;
}

/* ─── Helpers ─── */
const isSuccess = (data: any, type: string): boolean => {
  if (!data) return false;
  // TruthScreen success
  if (data.status === 1) return true;
  // Gridlines success codes
  const code = data?.data?.code;
  if (code === "1014" || code === "1022" || code === "1013") return true;
  // Array-based results (history)
  if (Array.isArray(data?.msg) && data.msg.length > 0) return true;
  if (Array.isArray(data?.data?.employment_data) && data.data.employment_data.length > 0) return true;
  if (Array.isArray(data?.data?.uan_list) && data.data.uan_list.length > 0) return true;
  if (data?.data?.employment_data && !Array.isArray(data.data.employment_data)) return true;
  return false;
};

const formatDate = (d: string): string => {
  if (!d || d === "NA") return "Present";
  try {
    return new Date(d).toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return d;
  }
};

const formatTimestamp = (ts: string): string => {
  try {
    return new Date(ts).toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return ts;
  }
};

const RESULT_ORDER = [
  "mobile_to_uan",
  "pan_to_uan",
  "latest_employment_uan",
  "latest_employment_mobile",
  "uan_full_history",
  "uan_full_history_gl",
  "latest_passbook_mobile",
];

const RESULT_TITLES: Record<string, string> = {
  mobile_to_uan: "UAN Lookup (Mobile)",
  pan_to_uan: "UAN Lookup (PAN)",
  latest_employment_uan: "Latest Employment (UAN)",
  latest_employment_mobile: "Latest Employment (Mobile)",
  uan_full_history: "Full Employment History",
  uan_full_history_gl: "Full Employment History",
  latest_passbook_mobile: "EPFO Passbook",
};

const RESULT_ICONS: Record<string, string> = {
  mobile_to_uan: "🔍",
  pan_to_uan: "🔍",
  latest_employment_uan: "🏢",
  latest_employment_mobile: "🏢",
  uan_full_history: "📋",
  uan_full_history_gl: "📋",
  latest_passbook_mobile: "📒",
};

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Main Component
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export const V2BgvResults: React.FC<V2BgvResultsProps> = ({ bgvResults }) => {
  // Filter to only show successful results
  const successfulKeys = RESULT_ORDER.filter((key) => {
    const items = bgvResults[key];
    if (!Array.isArray(items) || items.length === 0) return false;
    return items.some((item) => isSuccess(item.data, key));
  });

  if (successfulKeys.length === 0) {
    return (
      <div className="v2-card v2-animate-in" style={{ padding: "40px 24px", textAlign: "center" }}>
        <div style={{ fontSize: "2rem", marginBottom: 12 }}>🔍</div>
        <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--v2-text)", marginBottom: 4 }}>
          No Verification Results
        </div>
        <div style={{ fontSize: "0.78rem", color: "var(--v2-text-muted)" }}>
          No background verification data is available for this candidate.
        </div>
      </div>
    );
  }

  return (
    <div className="v2-animate-in" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Summary Card */}
      <div
        className="v2-card"
        style={{
          padding: "16px 22px",
          background: "linear-gradient(135deg, rgba(16,185,129,0.04), rgba(6,182,212,0.03))",
          border: "1px solid rgba(16,185,129,0.12)",
          display: "flex", alignItems: "center", gap: 12,
        }}
      >
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: "linear-gradient(135deg, #10B981, #06B6D4)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "1rem", color: "#fff", flexShrink: 0,
        }}>
          ✓
        </div>
        <div>
          <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#059669" }}>
            Background Verification Complete
          </div>
          <div style={{ fontSize: "0.72rem", color: "var(--v2-text-muted)", marginTop: 2 }}>
            {successfulKeys.length} verification{successfulKeys.length > 1 ? "s" : ""} available
          </div>
        </div>
      </div>

      {/* Render each result type */}
      {successfulKeys.map((key) => {
        const items = bgvResults[key].filter((item) => isSuccess(item.data, key));
        return (
          <div key={key} className="v2-card v2-animate-in" style={{ padding: 0, overflow: "hidden" }}>
            {/* Section Header */}
            <div style={{
              padding: "14px 20px",
              borderBottom: "1px solid var(--v2-border2)",
              display: "flex", alignItems: "center", gap: 10,
              background: "rgba(124,58,237,0.02)",
            }}>
              <span style={{ fontSize: "1rem" }}>{RESULT_ICONS[key] || "📄"}</span>
              <span style={{
                fontSize: "0.78rem", fontWeight: 700, color: "var(--v2-text)",
                textTransform: "uppercase", letterSpacing: "0.5px",
              }}>
                {RESULT_TITLES[key] || key}
              </span>
              <span style={{
                marginLeft: "auto", fontSize: "0.64rem", padding: "2px 8px",
                borderRadius: 12, background: "rgba(16,185,129,0.08)", color: "#059669",
                fontWeight: 600,
              }}>
                ✓ Verified
              </span>
            </div>

            {/* Render items */}
            <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
              {items.map((item, idx) => (
                <ResultRenderer key={idx} type={key} item={item} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Result Renderer — dispatches to type-specific renderers
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
const ResultRenderer: React.FC<{ type: string; item: BgvResultItem }> = ({ type, item }) => {
  switch (type) {
    case "mobile_to_uan":
    case "pan_to_uan":
      return <UanLookupResult item={item} type={type} />;
    case "latest_employment_uan":
    case "latest_employment_mobile":
      return <LatestEmploymentResultView item={item} />;
    case "uan_full_history":
      return <HistoryResultView item={item} variant="truthscreen" />;
    case "uan_full_history_gl":
      return <HistoryResultView item={item} variant="gridlines" />;
    default:
      return <GenericResultView item={item} />;
  }
};

/* ─── Shared field renderer ─── */
const Field: React.FC<{ label: string; value: string; mono?: boolean; accent?: string }> = ({
  label, value, mono, accent,
}) => (
  <div style={{
    padding: "10px 14px", borderRadius: 8,
    background: accent ? `${accent}08` : "rgba(0,0,0,0.02)",
    border: `1px solid ${accent ? `${accent}18` : "rgba(0,0,0,0.05)"}`,
  }}>
    <div style={{ fontSize: "0.56rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "1.5px", color: "var(--v2-text-muted)", marginBottom: 3 }}>
      {label}
    </div>
    <div style={{
      fontSize: "0.84rem", fontWeight: 700, color: accent || "var(--v2-text)",
      fontFamily: mono ? "var(--v2-mono)" : "inherit", letterSpacing: mono ? "0.5px" : "normal",
    }}>
      {value || "—"}
    </div>
  </div>
);

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Type-specific result views
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

/** UAN Lookup (mobile_to_uan / pan_to_uan) */
const UanLookupResult: React.FC<{ item: BgvResultItem; type: string }> = ({ item, type }) => {
  const data = item.data;
  const isPan = type === "pan_to_uan";

  // TruthScreen format
  const tsRecords = data?.msg?.uan_details || [];
  // Gridlines format
  const glUanList = data?.data?.uan_list || [];

  const records: { uan: string; name?: string; dob?: string }[] = [];

  if (tsRecords.length > 0) {
    tsRecords.forEach((r: any) => {
      records.push({ uan: r.uan, name: r.name, dob: r.date_of_birth });
    });
  } else if (glUanList.length > 0) {
    glUanList.forEach((uan: string) => {
      records.push({ uan });
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* Verified via badge */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <span style={{ fontSize: "0.64rem", fontWeight: 600, color: "var(--v2-text-muted)" }}>
          Verified via {isPan ? "PAN" : "Mobile"}: <span style={{ fontFamily: "var(--v2-mono)", color: "var(--v2-text)" }}>{item.meta?.inputValue || "—"}</span>
        </span>
        <span style={{ fontSize: "0.6rem", color: "var(--v2-text-muted)" }}>•</span>
        <span style={{ fontSize: "0.6rem", color: "var(--v2-text-muted)" }}>{formatTimestamp(item.meta?.timestamp)}</span>
      </div>

      {records.map((rec, i) => (
        <div key={i} style={{ display: "grid", gridTemplateColumns: rec.name ? "1fr 1fr 1fr" : "1fr", gap: 10 }}>
          <Field label="UAN Number" value={rec.uan} mono accent="#7C3AED" />
          {rec.name && <Field label="Name" value={rec.name} />}
          {rec.dob && <Field label="Date of Birth" value={rec.dob} />}
        </div>
      ))}
    </div>
  );
};

/** Latest Employment */
const LatestEmploymentResultView: React.FC<{ item: BgvResultItem }> = ({ item }) => {
  const data = item.data;
  const responseData = data?.data;

  // Mobile-based has uan_data array
  const isMobileType = !!responseData?.uan_data;
  let emp: any = null;
  let uan = item.meta?.inputValue || "—";

  if (isMobileType) {
    const arr = responseData.uan_data;
    if (arr && arr.length > 0) {
      emp = arr[0]?.latest_employment_data;
      uan = arr[0]?.uan || uan;
    }
  } else {
    emp = responseData?.employment_data;
  }

  if (!emp) {
    return <div style={{ fontSize: "0.8rem", color: "var(--v2-text-muted)" }}>No employment data available.</div>;
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: "0.64rem", fontWeight: 600, color: "var(--v2-text-muted)" }}>
          UAN: <span style={{ fontFamily: "var(--v2-mono)", color: "var(--v2-text)" }}>{uan}</span>
        </span>
        <span style={{ fontSize: "0.6rem", color: "var(--v2-text-muted)" }}>•</span>
        <span style={{ fontSize: "0.6rem", color: "var(--v2-text-muted)" }}>{formatTimestamp(item.meta?.timestamp)}</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Field label="Employee Name" value={emp.name || "—"} />
        <Field label="Current Company" value={emp.establishment_name || "—"} accent="#059669" />
        <Field label="Date of Joining" value={formatDate(emp.date_of_joining)} accent="#0E7490" />
        <Field label="Member ID" value={emp.member_id || "—"} mono />
      </div>
    </div>
  );
};

/** Employment History (TruthScreen or Gridlines) */
const HistoryResultView: React.FC<{ item: BgvResultItem; variant: "truthscreen" | "gridlines" }> = ({ item, variant }) => {
  const data = item.data;
  let jobs: any[] = [];
  let candidateName = "";
  let guardianName = "";

  if (variant === "truthscreen") {
    jobs = Array.isArray(data?.msg) ? data.msg : [];
    candidateName = jobs[0]?.name || "";
    guardianName = jobs[0]?.["father or Husband Name"] || "";
  } else {
    jobs = Array.isArray(data?.data?.employment_data) ? data.data.employment_data : [];
    candidateName = jobs[0]?.name || "";
    guardianName = jobs[0]?.guardian_name || "";
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: "0.64rem", fontWeight: 600, color: "var(--v2-text-muted)" }}>
          UAN: <span style={{ fontFamily: "var(--v2-mono)", color: "var(--v2-text)" }}>{item.meta?.inputValue || "—"}</span>
        </span>
        <span style={{ fontSize: "0.6rem", color: "var(--v2-text-muted)" }}>•</span>
        <span style={{ fontSize: "0.6rem", color: "var(--v2-text-muted)" }}>{formatTimestamp(item.meta?.timestamp)}</span>
      </div>

      {/* Identity */}
      {(candidateName || guardianName) && (
        <div style={{ display: "grid", gridTemplateColumns: guardianName ? "1fr 1fr" : "1fr", gap: 10, marginBottom: 14 }}>
          {candidateName && <Field label="Candidate Name" value={candidateName} />}
          {guardianName && <Field label={variant === "gridlines" ? "Guardian Name" : "Father / Husband"} value={guardianName} />}
        </div>
      )}

      {/* Job Timeline */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {jobs.map((job: any, i: number) => {
          const company = variant === "truthscreen" ? job["Establishment Name"] : job.establishment_name;
          const doj = variant === "truthscreen" ? job.Doj : job.date_of_joining;
          const doe = variant === "truthscreen" ? job.DateOfExitEpf : job.date_of_exit;
          const memberId = variant === "truthscreen" ? job.MemberId : job.member_id;

          return (
            <div key={i} style={{
              display: "grid", gridTemplateColumns: "1fr auto auto",
              gap: 12, alignItems: "center",
              padding: "10px 14px", borderRadius: 8,
              background: i === 0 ? "rgba(16,185,129,0.04)" : "rgba(0,0,0,0.015)",
              border: `1px solid ${i === 0 ? "rgba(16,185,129,0.1)" : "rgba(0,0,0,0.04)"}`,
            }}>
              <div>
                <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--v2-text)" }}>
                  {company || "—"}
                </div>
                {memberId && (
                  <div style={{ fontSize: "0.64rem", color: "var(--v2-text-muted)", fontFamily: "var(--v2-mono)", marginTop: 2 }}>
                    ID: {memberId}
                  </div>
                )}
              </div>
              <div style={{ fontSize: "0.72rem", color: "#059669", fontWeight: 600 }}>
                {formatDate(doj)}
              </div>
              <div style={{ fontSize: "0.72rem", color: doe ? "var(--v2-text-secondary)" : "#059669", fontWeight: 500 }}>
                → {formatDate(doe)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/** Generic fallback */
const GenericResultView: React.FC<{ item: BgvResultItem }> = ({ item }) => (
  <div style={{
    padding: 14, borderRadius: 8, background: "rgba(0,0,0,0.02)",
    border: "1px solid rgba(0,0,0,0.04)",
  }}>
    <div style={{ fontSize: "0.64rem", color: "var(--v2-text-muted)", marginBottom: 6 }}>
      Verified: {formatTimestamp(item.meta?.timestamp)}
    </div>
    <pre style={{
      fontSize: "0.7rem", color: "var(--v2-text-secondary)",
      fontFamily: "var(--v2-mono)", whiteSpace: "pre-wrap", wordBreak: "break-all",
      maxHeight: 200, overflow: "auto",
    }}>
      {JSON.stringify(item.data, null, 2)}
    </pre>
  </div>
);