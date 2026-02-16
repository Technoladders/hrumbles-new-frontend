import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import CandidateProfileV2 from "./CandidateProfileV2";

/**
 * SharedProfileV2 — Public page for viewing shared candidate profiles via magic link.
 *
 * Route: /share-v2/:shareId?expires=<timestamp>&jobId=<jobId>
 * Table: public.shares (share_id, expiry_date, data_options, candidate, share_password_hash)
 *
 * Flow:
 * 1. Fetch share from `shares` table by share_id
 * 2. Validate: exists, not expired
 * 3. If password-protected → show password gate
 * 4. Once verified → render CandidateProfileV2 in shareMode
 */

interface DataSharingOptions {
  personalInfo: boolean;
  contactInfo: boolean;
  documentsInfo: boolean;
  workInfo: boolean;
  skillinfo: boolean;
}

interface ShareRecord {
  share_id: string;
  expiry_date: number;
  data_options: DataSharingOptions;
  candidate: any;
  organization_id: string | null;
  share_password_hash: string | null;
}

/* ─── SHA-256 hash (Web Crypto API) ─── */
async function sha256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/* ─── Expiry helper ─── */
function getExpiryText(expiryMs: number): string {
  const remaining = expiryMs - Date.now();
  if (remaining <= 0) return "expired";
  const hours = Math.floor(remaining / (1000 * 60 * 60));
  if (hours < 24) return `${hours} hour${hours !== 1 ? "s" : ""}`;
  const days = Math.floor(hours / 24);
  const remH = hours % 24;
  return `${days} day${days !== 1 ? "s" : ""}${remH > 0 ? ` ${remH}h` : ""}`;
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
const SharedProfileV2: React.FC = () => {
  const { shareId } = useParams<{ shareId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  /* ─── States ─── */
  const [phase, setPhase] = useState<"loading" | "error" | "password" | "verified">("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [shareData, setShareData] = useState<ShareRecord | null>(null);

  // Password gate
  const [passwordInput, setPasswordInput] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [pwError, setPwError] = useState("");
  const [pwChecking, setPwChecking] = useState(false);

  /* ─── Load & validate share ─── */
  useEffect(() => {
    const load = async () => {
      if (!shareId) {
        setErrorMsg("Invalid share link — no share ID found.");
        setPhase("error");
        return;
      }

      try {
        // Fetch from shares table
        const { data, error } = await supabase
          .from("shares")
          .select("share_id, expiry_date, data_options, candidate, organization_id, share_password_hash")
          .eq("share_id", shareId)
          .single();

        if (error || !data) {
          setErrorMsg("This share link does not exist or has been removed.");
          setPhase("error");
          return;
        }

        // Check expiry (from URL param or DB field)
        const expiryParam = searchParams.get("expires");
        const expiryMs = expiryParam ? parseInt(expiryParam, 10) : data.expiry_date;

        if (expiryMs && Date.now() > expiryMs) {
          setErrorMsg("This share link has expired. Profile links are valid for 2 days.");
          setPhase("error");
          return;
        }

        // Parse data_options
        const opts = typeof data.data_options === "string"
          ? JSON.parse(data.data_options)
          : data.data_options;

        const record: ShareRecord = {
          share_id: data.share_id,
          expiry_date: data.expiry_date,
          data_options: opts,
          candidate: data.candidate,
          organization_id: data.organization_id,
          share_password_hash: data.share_password_hash || null,
        };

        setShareData(record);

        // If password protected → show gate, otherwise verified
        if (record.share_password_hash) {
          setPhase("password");
        } else {
          setPhase("verified");
        }
      } catch (err: any) {
        console.error("Failed to load share:", err);
        setErrorMsg("Failed to load shared profile. Please try again.");
        setPhase("error");
      }
    };

    load();
  }, [shareId, searchParams]);

  /* ─── Password verification ─── */
  const verifyPassword = useCallback(async () => {
    if (!shareData?.share_password_hash) return;
    if (passwordInput.trim().length === 0) {
      setPwError("Please enter the password.");
      return;
    }

    setPwChecking(true);
    setPwError("");

    try {
      const inputHash = await sha256(passwordInput.trim());
      if (inputHash === shareData.share_password_hash) {
        setPhase("verified");
      } else {
        setPwError("Incorrect password. Please try again.");
      }
    } catch {
      setPwError("Verification failed. Please try again.");
    } finally {
      setPwChecking(false);
    }
  }, [passwordInput, shareData]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") verifyPassword();
  };

  /* ─── Parsed data options ─── */
  const sharedDataOptions = useMemo(() => {
    return shareData?.data_options || undefined;
  }, [shareData]);

  /* ─── Shared categories for display ─── */
  const sharedCategories = useMemo(() => {
    if (!sharedDataOptions) return [];
    const cats: string[] = [];
    if (sharedDataOptions.personalInfo) cats.push("Personal Info");
    if (sharedDataOptions.contactInfo) cats.push("Contact Info");
    if (sharedDataOptions.documentsInfo) cats.push("Documents");
    if (sharedDataOptions.skillinfo) cats.push("Skills");
    if (sharedDataOptions.workInfo) cats.push("Work History");
    if ((sharedDataOptions as any).resumeAnalysis) cats.push("Resume Analysis");
    if ((sharedDataOptions as any).resumeAttachment) cats.push("Resume");
    if ((sharedDataOptions as any).maskContact) cats.push("Masked Contact");
    if ((sharedDataOptions as any).bgvResults) cats.push("BGV Results");
    return cats;
  }, [sharedDataOptions]);

  /* ━━━ Common styling ━━━ */
  const pageBase: React.CSSProperties = {
    fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
    background: "linear-gradient(135deg, #F8F9FC 0%, #EEF2FF 50%, #F0FDFA 100%)",
    minHeight: "100vh",
    display: "flex", alignItems: "center", justifyContent: "center",
    padding: 24,
  };

  const cardBase: React.CSSProperties = {
    background: "#fff",
    borderRadius: 16,
    padding: "40px 44px",
    textAlign: "center" as const,
    border: "1px solid rgba(0,0,0,0.06)",
    boxShadow: "0 8px 32px rgba(124,58,237,0.06)",
    maxWidth: 440,
    width: "100%",
  };

  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ RENDER ━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  /* ─── Loading ─── */
  if (phase === "loading") {
    return (
      <div style={pageBase}>
        <div style={{ ...cardBase, display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <div style={{
            width: 44, height: 44,
            border: "3px solid rgba(124,58,237,0.12)",
            borderTopColor: "#7C3AED",
            borderRadius: "50%",
            animation: "shSpin 0.8s linear infinite",
          }} />
          <div style={{ fontSize: "0.9rem", color: "#64748B", fontWeight: 500 }}>
            Loading shared profile…
          </div>
          <style>{`@keyframes shSpin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  /* ─── Error ─── */
  if (phase === "error") {
    return (
      <div style={pageBase}>
        <div style={cardBase}>
          <div style={{
            width: 56, height: 56, borderRadius: 14,
            background: "rgba(239,68,68,0.06)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 16px", fontSize: "1.5rem",
          }}>
            ⚠️
          </div>
          <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#1E1B4B", marginBottom: 8 }}>
            Unable to Load Profile
          </div>
          <div style={{ fontSize: "0.86rem", color: "#64748B", lineHeight: 1.6, marginBottom: 24 }}>
            {errorMsg}
          </div>
          <button
            onClick={() => navigate("/")}
            style={{
              padding: "10px 28px", borderRadius: 10, cursor: "pointer",
              fontSize: "0.82rem", fontWeight: 600,
              border: "none", background: "#7C3AED", color: "#fff",
              fontFamily: "'DM Sans', sans-serif",
              boxShadow: "0 2px 8px rgba(124,58,237,0.2)",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#6D28D9"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "#7C3AED"; }}
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  /* ─── Password Gate ─── */
  if (phase === "password") {
    return (
      <div style={pageBase}>
        <div style={cardBase}>
          {/* Lock icon */}
          <div style={{
            width: 60, height: 60, borderRadius: 16,
            background: "linear-gradient(135deg, rgba(124,58,237,0.08), rgba(6,182,212,0.06))",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 20px", fontSize: "1.6rem",
          }}>
            🔐
          </div>

          <div style={{ fontSize: "1.15rem", fontWeight: 700, color: "#1E1B4B", marginBottom: 4 }}>
            Password Required
          </div>
          <div style={{ fontSize: "0.82rem", color: "#64748B", lineHeight: 1.5, marginBottom: 24 }}>
            This shared profile is protected. Enter the password to continue.
          </div>

          {/* Password input */}
          <div style={{ position: "relative", marginBottom: 12, textAlign: "left" as const }}>
            <input
              type={showPw ? "text" : "password"}
              value={passwordInput}
              onChange={(e) => { setPasswordInput(e.target.value); setPwError(""); }}
              onKeyDown={handleKeyDown}
              placeholder="Enter password…"
              autoFocus
              style={{
                width: "100%", padding: "12px 44px 12px 16px",
                borderRadius: 10, fontSize: "0.88rem",
                border: `1.5px solid ${pwError ? "#EF4444" : "#E2E8F0"}`,
                color: "#1E1B4B", background: "#fff",
                fontFamily: "'DM Sans', sans-serif",
                outline: "none", transition: "border-color 0.15s",
                boxSizing: "border-box" as const,
              }}
              onFocus={(e) => { if (!pwError) e.currentTarget.style.borderColor = "#7C3AED"; }}
              onBlur={(e) => { if (!pwError) e.currentTarget.style.borderColor = "#E2E8F0"; }}
            />
            <button
              type="button"
              onClick={() => setShowPw(!showPw)}
              style={{
                position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                background: "none", border: "none", cursor: "pointer",
                color: "#94A3B8", fontSize: "0.9rem", padding: 0,
              }}
            >
              {showPw ? "🙈" : "👁"}
            </button>
          </div>

          {/* Error message */}
          {pwError && (
            <div style={{
              fontSize: "0.74rem", color: "#DC2626", marginBottom: 12,
              display: "flex", alignItems: "center", gap: 4, justifyContent: "center",
            }}>
              <span>⚠</span> {pwError}
            </div>
          )}

          {/* Submit button */}
          <button
            onClick={verifyPassword}
            disabled={pwChecking || passwordInput.trim().length === 0}
            style={{
              width: "100%", padding: "12px 20px", borderRadius: 10,
              cursor: pwChecking || passwordInput.trim().length === 0 ? "not-allowed" : "pointer",
              fontSize: "0.88rem", fontWeight: 600, border: "none",
              background: pwChecking || passwordInput.trim().length === 0
                ? "#C4B5FD" : "linear-gradient(135deg, #7C3AED, #6D28D9)",
              color: "#fff", fontFamily: "'DM Sans', sans-serif",
              opacity: pwChecking || passwordInput.trim().length === 0 ? 0.6 : 1,
              transition: "all 0.15s",
              boxShadow: "0 2px 8px rgba(124,58,237,0.2)",
            }}
          >
            {pwChecking ? (
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <span style={{
                  width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)",
                  borderTopColor: "#fff", borderRadius: "50%",
                  animation: "shSpin 0.6s linear infinite", display: "inline-block",
                }} />
                Verifying…
              </span>
            ) : (
              "🔓 Unlock Profile"
            )}
          </button>

          {/* Shared data categories preview */}
          {sharedCategories.length > 0 && (
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid #F1F5F9" }}>
              <div style={{ fontSize: "0.62rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1.5px", color: "#94A3B8", marginBottom: 8 }}>
                Shared Data Includes
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center" }}>
                {sharedCategories.map((cat, i) => (
                  <span key={i} style={{
                    fontSize: "0.68rem", fontWeight: 500, color: "#059669",
                    padding: "3px 10px", borderRadius: 6,
                    background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.12)",
                  }}>
                    {cat}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Expiry info */}
          {shareData?.expiry_date && (
            <div style={{ fontSize: "0.66rem", color: "#94A3B8", marginTop: 12 }}>
              Link expires in {getExpiryText(shareData.expiry_date)}
            </div>
          )}

          <style>{`@keyframes shSpin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  /* ─── Verified → Render CandidateProfileV2 in shareMode ─── */
  return (
    <div>
      {/* Shared banner */}
      <div style={{
        background: "linear-gradient(90deg, #F0FDF4, #ECFDF5)",
        borderBottom: "1px solid #BBF7D0",
        padding: "8px 24px",
        display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
        flexWrap: "wrap",
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
        <span style={{ fontSize: "0.76rem", color: "#059669", fontWeight: 600 }}>
          Securely shared profile
        </span>
        <span style={{ fontSize: "0.68rem", color: "#64748B" }}>•</span>
        {sharedCategories.map((cat, i) => (
          <span key={i} style={{
            fontSize: "0.66rem", fontWeight: 500, color: "#059669",
            padding: "2px 8px", borderRadius: 4,
            background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.1)",
          }}>
            {cat}
          </span>
        ))}
        {shareData?.expiry_date && (
          <>
            <span style={{ fontSize: "0.68rem", color: "#64748B" }}>•</span>
            <span style={{ fontSize: "0.66rem", color: "#94A3B8" }}>
              Expires in {getExpiryText(shareData.expiry_date)}
            </span>
          </>
        )}
      </div>

      {/* CandidateProfileV2 in shareMode */}
      <CandidateProfileV2
        shareMode={true}
        shareId={shareId}
        sharedDataOptions={sharedDataOptions}
      />
    </div>
  );
};

export default SharedProfileV2;