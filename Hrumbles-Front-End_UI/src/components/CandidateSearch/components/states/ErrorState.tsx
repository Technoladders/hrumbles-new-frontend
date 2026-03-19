import React from "react";
import { SearchError } from "../../types";

interface ErrorStateProps {
  error: SearchError;
  onRetry: () => void;
  onClearAll: () => void;
}

const ERROR_INFO: Record<string, { icon: string; title: string; hint: string; fix?: string }> = {
  auth: {
    icon: "🔑",
    title: "Authentication Failed",
    hint: "The API key stored in your Supabase secrets is invalid or expired.",
    fix:  'Run: supabase secrets set TALENT_SEARCH_API_KEY=your_valid_key',
  },
  rateLimit: {
    icon: "⏳",
    title: "Rate Limit Reached",
    hint: "You've hit the hourly search limit. Please wait a few minutes before trying again.",
  },
  invalid: {
    icon: "⚠️",
    title: "Invalid Search Parameters",
    hint: "One or more filter values were rejected. Check technology names match the supported list exactly.",
  },
  unknown: {
    icon: "💥",
    title: "Something Went Wrong",
    hint: "An unexpected error occurred. Check the edge function logs in your Supabase dashboard.",
    fix:  "Supabase Dashboard → Edge Functions → search-candidates → Logs",
  },
};

export const ErrorState: React.FC<ErrorStateProps> = ({ error, onRetry, onClearAll }) => {
  const info = ERROR_INFO[error.type] || ERROR_INFO.unknown;

  return (
    <div style={{
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      minHeight: "55vh", textAlign: "center",
      animation: "cs-fadeUp 0.4s ease",
      padding: "0 24px",
    }}>
      <div style={{ fontSize: "2.8rem", marginBottom: 16 }}>{info.icon}</div>

      <div style={{
        fontFamily: "var(--font-d)", fontSize: "1.2rem", fontWeight: 800,
        color: "var(--text)", marginBottom: 8,
      }}>
        {info.title}
      </div>

      {error.statusCode && (
        <div style={{
          fontFamily: "var(--font-m)", fontSize: "0.72rem",
          color: "var(--text-3)", marginBottom: 10,
        }}>
          Status {error.statusCode}
        </div>
      )}

      <div style={{
        fontSize: "0.82rem", color: "var(--text-2)",
        maxWidth: 400, lineHeight: 1.75, marginBottom: 16,
      }}>
        {info.hint}
      </div>

      {info.fix && (
        <div style={{
          fontFamily: "var(--font-m)", fontSize: "0.7rem", color: "#2563EB",
          padding: "8px 16px", borderRadius: 8,
          background: "rgba(37,99,235,0.06)", border: "1px solid rgba(37,99,235,0.15)",
          maxWidth: 480, marginBottom: 8, wordBreak: "break-word", textAlign: "left",
        }}>
          {info.fix}
        </div>
      )}

      {error.message && (
        <div style={{
          fontFamily: "var(--font-m)", fontSize: "0.68rem", color: "#DC2626",
          padding: "7px 14px", borderRadius: 8,
          background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.15)",
          maxWidth: 460, marginBottom: 24, wordBreak: "break-word",
        }}>
          {error.message}
        </div>
      )}

      <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
        <button
          onClick={onRetry}
          style={{
            padding: "9px 22px", borderRadius: 9,
            background: "#2563EB", border: "none",
            color: "#fff", fontFamily: "var(--font-b)", fontSize: "0.8rem",
            fontWeight: 600, cursor: "pointer",
          }}
        >
          Try Again
        </button>
        <button
          onClick={onClearAll}
          style={{
            padding: "9px 22px", borderRadius: 9,
            background: "transparent", border: "1px solid var(--border)",
            color: "var(--text-2)", fontFamily: "var(--font-b)", fontSize: "0.8rem", cursor: "pointer",
          }}
        >
          Reset Filters
        </button>
      </div>

      <div style={{
        marginTop: 32, padding: "12px 18px", borderRadius: 10,
        background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.18)",
        maxWidth: 400,
      }}>
        <div style={{
          fontFamily: "var(--font-m)", fontSize: "0.6rem", fontWeight: 600,
          color: "#D97706", marginBottom: 5,
          textTransform: "uppercase", letterSpacing: "0.8px",
        }}>
          β Beta Note
        </div>
        <div style={{ fontSize: "0.7rem", color: "var(--text-3)", lineHeight: 1.65 }}>
          Errors are logged in the Supabase Edge Function dashboard under{" "}
          <strong>search-candidates → Logs</strong>. If issues persist, contact your admin.
        </div>
      </div>
    </div>
  );
};