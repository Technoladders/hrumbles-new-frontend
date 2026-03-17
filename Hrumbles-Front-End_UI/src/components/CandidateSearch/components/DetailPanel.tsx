import React from "react";
import { ApolloCandidate } from "../types";
import { SkillTag } from "./SkillTag";
import { TECHS_BY_CAT } from "../constants/technologies";

const AVATAR_PALETTE = [
  "#2563EB","#7C3AED","#0891B2","#059669",
  "#DC2626","#D97706","#DB2777","#EA580C",
];
const avatarColor = (id: string) =>
  AVATAR_PALETTE[parseInt(id.replace(/\D/g, "").slice(-2) || "0") % AVATAR_PALETTE.length];
const initials = (fn: string, ln: string) => ((fn?.[0] || "") + (ln?.[0] || "")).toUpperCase();

const formatDate = (iso: string) => {
  try { return new Date(iso).toLocaleDateString("en-IN", { month: "long", day: "numeric", year: "numeric" }); }
  catch { return "—"; }
};

interface DetailPanelProps {
  candidate: ApolloCandidate;
  matchedSkills: string[];
  onClose: () => void;
}

const InfoRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderTop: "1px solid rgba(0,0,0,0.05)" }}>
    <span style={{ fontSize: "0.72rem", color: "var(--text-3)", fontWeight: 500 }}>{label}</span>
    <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text)", textAlign: "right", maxWidth: "60%" }}>{value}</span>
  </div>
);

const DataBadge: React.FC<{ available: boolean; label: string }> = ({ available, label }) => (
  <div style={{
    display: "flex", alignItems: "center", gap: 7, padding: "7px 12px",
    borderRadius: 8,
    background: available ? "rgba(16,185,129,0.05)" : "rgba(0,0,0,0.03)",
    border: available ? "1px solid rgba(16,185,129,0.2)" : "1px solid rgba(0,0,0,0.07)",
  }}>
    <span style={{ width: 7, height: 7, borderRadius: "50%", background: available ? "#10B981" : "#CBD5E1", display: "block", flexShrink: 0 }} />
    <span style={{ fontSize: "0.7rem", color: available ? "#059669" : "var(--text-3)", fontWeight: 500 }}>{label}</span>
  </div>
);

export const DetailPanel: React.FC<DetailPanelProps> = ({ candidate: c, matchedSkills, onClose }) => {
  const color = avatarColor(c.id);
  const init  = initials(c.first_name, c.last_name_obfuscated);

  const locationParts: string[] = [];
  if (c.has_city)    locationParts.push("City");
  if (c.has_state)   locationParts.push("State/Province");
  if (c.has_country) locationParts.push("Country");

  return (
    <div
      className="cs-panel-in"
      style={{
        position: "fixed", top: 0, right: 0, bottom: 0, width: 420,
        background: "#fff",
        borderLeft: "1px solid var(--border)",
        boxShadow: "-12px 0 48px rgba(0,0,0,0.08)",
        zIndex: 500,
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Top bar */}
      <div style={{
        position: "sticky", top: 0, background: "#fff",
        borderBottom: "1px solid var(--border)",
        padding: "13px 20px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        zIndex: 1,
      }}>
        <span style={{ fontFamily: "var(--font-m)", fontSize: "0.56rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "1.8px", color: "var(--text-3)" }}>
          Candidate Preview
        </span>
        <button
          onClick={onClose}
          style={{
            width: 30, height: 30, borderRadius: 7,
            background: "rgba(0,0,0,0.04)", border: "none", cursor: "pointer",
            fontSize: "1.1rem", color: "var(--text-2)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          ×
        </button>
      </div>

      {/* Hero */}
      <div style={{ padding: "24px 22px 0", background: "linear-gradient(135deg,#F8FAFF 0%,#fff 100%)" }}>
        <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 20 }}>
          <div style={{
            width: 60, height: 60, borderRadius: 16, flexShrink: 0,
            background: color,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "1.2rem", fontWeight: 800, color: "#fff", fontFamily: "var(--font-d)",
            boxShadow: `0 6px 18px ${color}44`,
          }}>
            {init}
          </div>
          <div>
            <div style={{ fontFamily: "var(--font-d)", fontSize: "1.1rem", fontWeight: 800, color: "var(--text)" }}>
              {c.first_name} {c.last_name_obfuscated}
            </div>
            <div style={{ fontSize: "0.78rem", color: "#2563EB", fontWeight: 500, marginTop: 3 }}>
              {c.title || "Title not listed"}
            </div>
          </div>
        </div>

        <InfoRow label="🏢 Company"      value={c.organization?.name || "—"} />
        <InfoRow label="📅 Data updated" value={formatDate(c.last_refreshed_at)} />
        {locationParts.length > 0 && (
          <InfoRow label="📍 Location"    value={locationParts.join(", ") + " on file"} />
        )}
      </div>

      {/* Contact & availability */}
      <div style={{ padding: "20px 22px", borderBottom: "1px solid var(--border)" }}>
        <div style={{ fontFamily: "var(--font-m)", fontSize: "0.56rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "2px", color: "var(--text-3)", marginBottom: 12 }}>
          Data Availability
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <DataBadge available={c.has_email}                      label="Email address" />
          <DataBadge available={c.has_direct_phone === "Yes"}     label="Direct phone" />
          <DataBadge available={c.has_city || c.has_state}        label="Location details" />
          <DataBadge available={c.organization?.has_industry}     label="Industry data" />
          <DataBadge available={c.organization?.has_revenue}      label="Company revenue" />
          <DataBadge available={c.organization?.has_employee_count} label="Team size" />
        </div>
      </div>

      {/* Matched skills */}
      {matchedSkills.length > 0 && (
        <div style={{ padding: "20px 22px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ fontFamily: "var(--font-m)", fontSize: "0.56rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "2px", color: "var(--text-3)", marginBottom: 10 }}>
            Matched via your filters
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {matchedSkills.map(s => <SkillTag key={s} skill={s} size="lg" />)}
          </div>
        </div>
      )}

      {/* Organisation detail */}
      {c.organization && (
        <div style={{ padding: "20px 22px", flex: 1 }}>
          <div style={{ fontFamily: "var(--font-m)", fontSize: "0.56rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "2px", color: "var(--text-3)", marginBottom: 12 }}>
            Organisation
          </div>
          <div style={{ padding: "14px 16px", borderRadius: 10, background: "rgba(37,99,235,0.03)", border: "1px solid rgba(37,99,235,0.1)" }}>
            <div style={{ fontWeight: 700, fontSize: "0.92rem", color: "var(--text)", marginBottom: 10 }}>
              {c.organization.name}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {c.organization.has_industry     && <span style={badge}>Industry classified</span>}
              {c.organization.has_phone        && <span style={badge}>Company phone</span>}
              {c.organization.has_employee_count && <span style={badge}>Headcount data</span>}
              {c.organization.has_revenue      && <span style={badge}>Revenue data</span>}
              {(c.organization.has_city || c.organization.has_state) && <span style={badge}>HQ location</span>}
            </div>
          </div>
        </div>
      )}

      {/* Enrich CTA */}
      <div style={{ padding: "0 22px 24px" }}>
        <div style={{
          padding: "16px", borderRadius: 12,
          background: "linear-gradient(135deg,rgba(37,99,235,0.04),rgba(124,58,237,0.03))",
          border: "1px solid rgba(37,99,235,0.12)",
        }}>
          <div style={{ fontFamily: "var(--font-m)", fontSize: "0.58rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "1px", color: "#2563EB", marginBottom: 6 }}>
            ⚡ Full Profile Enrichment
          </div>
          <div style={{ fontSize: "0.72rem", color: "var(--text-2)", lineHeight: 1.65, marginBottom: 12 }}>
            Verified contact info, complete work history, and skill depth scoring are available through enrichment.
          </div>
          <button style={{
            padding: "8px 16px", borderRadius: 8, background: "#2563EB", border: "none",
            color: "#fff", fontFamily: "var(--font-b)", fontSize: "0.76rem", fontWeight: 600, cursor: "pointer",
          }}>
            Request Enrichment →
          </button>
        </div>
      </div>
    </div>
  );
};

const badge: React.CSSProperties = {
  fontSize: "0.62rem",
  fontWeight: 500,
  padding: "3px 9px",
  borderRadius: 5,
  background: "rgba(37,99,235,0.07)",
  color: "#1D4ED8",
  border: "1px solid rgba(37,99,235,0.15)",
  fontFamily: "var(--font-m)",
};