import React from "react";

interface V2ActionBarProps {
  shareMode: boolean;
  employee: any;
  onShareClick: () => void;
  onBgvClick: () => void;
  resumeUrl: string;
  toast: any;
  showResume?: boolean;
}

export const V2ActionBar: React.FC<V2ActionBarProps> = ({
  shareMode,
  employee,
  onShareClick,
  onBgvClick,
  resumeUrl,
  toast,
  showResume = true,
}) => {
  const btnBase: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: 6,
    padding: "6px 14px", borderRadius: 8, cursor: "pointer",
    fontSize: "0.76rem", fontWeight: 600, border: "none",
    fontFamily: "var(--v2-font)", transition: "all 0.2s",
    whiteSpace: "nowrap",
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      {!shareMode && (
        <>
          {/* BGV Button */}
          <button
            onClick={onBgvClick}
            style={{
              ...btnBase,
              background: "transparent",
              color: "var(--v2-text-secondary)",
              border: "1px solid var(--v2-border2)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--v2-primary-200)";
              e.currentTarget.style.color = "var(--v2-primary)";
              e.currentTarget.style.background = "var(--v2-primary-50)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--v2-border2)";
              e.currentTarget.style.color = "var(--v2-text-secondary)";
              e.currentTarget.style.background = "transparent";
            }}
          >
            🔍 Background Verification
          </button>

          {/* Share Button */}
          <button
            onClick={onShareClick}
            style={{
              ...btnBase,
              background: "transparent",
              color: "var(--v2-text-secondary)",
              border: "1px solid var(--v2-border2)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "rgba(6,182,212,0.3)";
              e.currentTarget.style.color = "#0E7490";
              e.currentTarget.style.background = "rgba(6,182,212,0.05)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--v2-border2)";
              e.currentTarget.style.color = "var(--v2-text-secondary)";
              e.currentTarget.style.background = "transparent";
            }}
          >
            🔗 Share Profile
          </button>
        </>
      )}

      {/* Resume Button Group — hidden when resume is not shared */}
      {showResume && resumeUrl && resumeUrl !== "#" && (
        <div style={{
        display: "flex", alignItems: "center",
        background: "var(--v2-primary)", borderRadius: 8,
        overflow: "hidden",
      }}>
        <button
          onClick={() => window.open(resumeUrl, "_blank")}
          style={{
            ...btnBase,
            background: "transparent",
            color: "#fff",
            border: "none",
            borderRight: "1px solid rgba(255,255,255,0.2)",
          }}
        >
          📄 Resume
        </button>
        <button
          onClick={() => {
            const link = document.createElement("a");
            link.href = resumeUrl;
            link.download = `${employee.name}_Resume.pdf`;
            link.click();
            toast({ title: "Resume Download Started" });
          }}
          style={{
            ...btnBase,
            background: "transparent",
            color: "#fff",
            border: "none",
            padding: "6px 10px",
          }}
          title="Download"
        >
          ↓
        </button>
      </div>
      )}
    </div>
  );
};