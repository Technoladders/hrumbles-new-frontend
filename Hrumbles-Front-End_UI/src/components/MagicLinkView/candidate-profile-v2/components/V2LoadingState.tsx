import React from "react";

// ─── Loading State ───
export const V2LoadingState: React.FC = () => (
  <div style={{
    minHeight: "100vh",
    background: "#F8F9FC",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'DM Sans', sans-serif",
  }}>
    <style>{`
      @keyframes v2LoadPulse {
        0%, 100% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.1); opacity: 0.6; }
      }
      @keyframes v2LoadSpin {
        to { transform: rotate(360deg); }
      }
    `}</style>
    <div style={{
      background: "rgba(255,255,255,0.8)",
      backdropFilter: "blur(20px)",
      borderRadius: 20,
      padding: "48px 56px",
      textAlign: "center",
      border: "1px solid rgba(124,58,237,0.1)",
      boxShadow: "0 8px 40px rgba(124,58,237,0.06)",
    }}>
      <div style={{
        width: 48, height: 48, margin: "0 auto 20px",
        border: "3px solid rgba(124,58,237,0.15)",
        borderTopColor: "#7C3AED",
        borderRadius: "50%",
        animation: "v2LoadSpin 0.8s linear infinite",
      }} />
      <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#1E1B4B", marginBottom: 4 }}>
        Loading Profile
      </div>
      <div style={{ fontSize: "0.82rem", color: "#94A3B8" }}>
        Fetching candidate data…
      </div>
    </div>
  </div>
);

// ─── Error State ───
interface V2ErrorStateProps {
  error: string;
  onBack: () => void;
}

export const V2ErrorState: React.FC<V2ErrorStateProps> = ({ error, onBack }) => (
  <div style={{
    minHeight: "100vh",
    background: "#F8F9FC",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'DM Sans', sans-serif",
  }}>
    <div style={{
      background: "rgba(255,255,255,0.8)",
      backdropFilter: "blur(20px)",
      borderRadius: 20,
      padding: "48px 56px",
      textAlign: "center",
      maxWidth: 440,
      border: "1px solid rgba(239,68,68,0.1)",
      boxShadow: "0 8px 40px rgba(239,68,68,0.06)",
    }}>
      <div style={{
        width: 48, height: 48, margin: "0 auto 20px",
        borderRadius: "50%",
        background: "rgba(239,68,68,0.08)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "1.3rem",
      }}>
        ⚠
      </div>
      <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#1E1B4B", marginBottom: 8 }}>
        Something went wrong
      </div>
      <div style={{ fontSize: "0.84rem", color: "#64748B", marginBottom: 24, lineHeight: 1.6 }}>
        {error}
      </div>
      <button
        onClick={onBack}
        style={{
          padding: "10px 24px", borderRadius: 10, cursor: "pointer",
          fontSize: "0.84rem", fontWeight: 600,
          border: "1px solid rgba(124,58,237,0.2)",
          background: "transparent", color: "#7C3AED",
          fontFamily: "'DM Sans', sans-serif",
          transition: "all 0.2s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(124,58,237,0.05)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent";
        }}
      >
        ← Go Back
      </button>
    </div>
  </div>
);