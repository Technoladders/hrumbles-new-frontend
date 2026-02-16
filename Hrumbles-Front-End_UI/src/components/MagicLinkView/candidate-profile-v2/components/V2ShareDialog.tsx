import React, { useState } from "react";

interface DataSharingOptions {
  personalInfo: boolean;
  contactInfo: boolean;
  documentsInfo: boolean;
  workInfo: boolean;
  skillinfo: boolean;
  resumeAnalysis: boolean;
  resumeAttachment: boolean;
  maskContact: boolean;
  bgvResults: boolean;
}

interface V2ShareDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (options: DataSharingOptions, password?: string, expiryDays?: number) => void;
  defaultOptions?: Partial<DataSharingOptions>;
  isSharing: boolean;
  magicLink: string | null;
  isCopied: boolean;
  onCopyMagicLink: () => void;
  sharePassword?: string | null;
}

/* ─── Expiry presets ─── */
const EXPIRY_PRESETS: { label: string; days: number }[] = [
  { label: "1 Day", days: 1 },
  { label: "2 Days", days: 2 },
  { label: "3 Days", days: 3 },
  { label: "7 Days", days: 7 },
  { label: "14 Days", days: 14 },
  { label: "30 Days", days: 30 },
];

export const V2ShareDialog: React.FC<V2ShareDialogProps> = ({
  open,
  onClose,
  onConfirm,
  defaultOptions,
  isSharing,
  magicLink,
  isCopied,
  onCopyMagicLink,
  sharePassword,
}) => {
  const [options, setOptions] = useState<DataSharingOptions>({
    personalInfo: defaultOptions?.personalInfo ?? true,
    contactInfo: defaultOptions?.contactInfo ?? true,
    documentsInfo: defaultOptions?.documentsInfo ?? false,
    workInfo: defaultOptions?.workInfo ?? false,
    skillinfo: defaultOptions?.skillinfo ?? false,
    resumeAnalysis: defaultOptions?.resumeAnalysis ?? true,
    resumeAttachment: defaultOptions?.resumeAttachment ?? true,
    maskContact: defaultOptions?.maskContact ?? false,
    bgvResults: (defaultOptions as any)?.bgvResults ?? false,
  });

  const [passwordEnabled, setPasswordEnabled] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [expiryDays, setExpiryDays] = useState(2);

  if (!open) return null;

  const toggle = (key: keyof DataSharingOptions) => {
    setOptions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  /* ─── Data sharing items ─── */
  const dataItems: { key: keyof DataSharingOptions; label: string; desc: string; icon: string }[] = [
    { key: "personalInfo",    label: "Personal Information",  desc: "Name, role, salary, notice period, experience",      icon: "👤" },
    { key: "contactInfo",     label: "Contact Information",   desc: "Email, phone, LinkedIn profile",                     icon: "📧" },
    { key: "documentsInfo",   label: "Document Information",  desc: "PAN, UAN, PF, ESIC numbers (from metadata)",        icon: "📄" },
    { key: "skillinfo",       label: "Skill Information",     desc: "Skills, skill ratings, and competency data",         icon: "⚡" },
    { key: "workInfo",        label: "Work History",          desc: "Employment history, companies, and verification",    icon: "💼" },
    { key: "resumeAnalysis",  label: "Resume Analysis",       desc: "AI scoring, matched skills, gaps, recommendations", icon: "🧠" },
    { key: "resumeAttachment",label: "Attach Resume",         desc: "Include resume PDF for preview and download",       icon: "📎" },
    { key: "bgvResults",      label: "BGV Results",           desc: "Background verification results (UAN, employment)",  icon: "🛡️" },
  ];

  /* ─── Privacy items ─── */
  const privacyItems: { key: keyof DataSharingOptions; label: string; desc: string; icon: string }[] = [
    { key: "maskContact",     label: "Mask Contact Details",  desc: "Show partial email/phone (e.g. j***@g***.com, +91 ****1234)", icon: "🔒" },
  ];

  const handleGenerate = () => {
    onConfirm(options, passwordEnabled ? password : undefined, expiryDays);
  };

  const isGenerateDisabled = isSharing || (passwordEnabled && password.length < 4);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 200,
          background: "rgba(15, 23, 42, 0.4)",
          backdropFilter: "blur(6px)",
          animation: "v2FadeUp 0.2s ease",
        }}
      />

      {/* Dialog */}
      <div style={{
        position: "fixed", top: "50%", left: "50%",
        transform: "translate(-50%, -50%)", zIndex: 201,
        width: "100%", maxWidth: 500,
        background: "#ffffff",
        borderRadius: 16,
        boxShadow: "0 24px 64px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.04)",
        animation: "v2ScaleIn 0.25s ease",
        overflow: "hidden",
        fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
      }}>

        {/* ═══ Header ═══ */}
        <div style={{
          padding: "18px 24px",
          borderBottom: "1px solid #F1F5F9",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          background: "#FAFBFC",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: "linear-gradient(135deg, #7C3AED, #06B6D4)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "0.85rem",
            }}>
              🔗
            </div>
            <div>
              <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "#1E1B4B", margin: 0 }}>
                Share Profile
              </h3>
              <p style={{ fontSize: "0.68rem", color: "#64748B", margin: 0 }}>
                Choose data, privacy & expiration
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 30, height: 30, borderRadius: 8, cursor: "pointer",
              border: "1px solid #E2E8F0", background: "#fff",
              color: "#94A3B8", fontSize: "0.85rem",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#F1F5F9"; e.currentTarget.style.color = "#475569"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.color = "#94A3B8"; }}
          >
            ✕
          </button>
        </div>

        {/* ═══ Body ═══ */}
        <div style={{ padding: "16px 24px", maxHeight: "62vh", overflowY: "auto" }}>

          {/* ─── Section: Data Selection ─── */}
          <SectionLabel>Data to Include</SectionLabel>

          <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 16 }}>
            {dataItems.map((item) => (
              <CheckRow
                key={item.key}
                checked={options[item.key]}
                onToggle={() => toggle(item.key)}
                icon={item.icon}
                label={item.label}
                desc={item.desc}
              />
            ))}
          </div>

          {/* ─── Section: Privacy & Security ─── */}
          <SectionLabel>Privacy & Security</SectionLabel>

          {/* Mask contact toggle */}
          {privacyItems.map((item) => (
            <CheckRow
              key={item.key}
              checked={options[item.key]}
              onToggle={() => toggle(item.key)}
              icon={item.icon}
              label={item.label}
              desc={item.desc}
              style={{ marginBottom: 10 }}
            />
          ))}

          {/* Password Protection */}
          <div style={{
            padding: "12px 14px", borderRadius: 10, marginBottom: 10,
            border: `1.5px solid ${passwordEnabled ? "#7C3AED" : "#E2E8F0"}`,
            background: passwordEnabled ? "rgba(124, 58, 237, 0.02)" : "#fff",
            transition: "all 0.15s",
          }}>
            <div
              onClick={() => setPasswordEnabled(!passwordEnabled)}
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: "0.9rem" }}>🛡️</span>
                <div>
                  <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "#1E1B4B" }}>
                    Password Protection
                  </div>
                  <p style={{ fontSize: "0.68rem", color: "#94A3B8", marginTop: 1 }}>
                    Require a password to view shared profile
                  </p>
                </div>
              </div>
              <ToggleSwitch on={passwordEnabled} />
            </div>

            {passwordEnabled && (
              <div style={{ marginTop: 10 }}>
                <div style={{ position: "relative" }}>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter share password…"
                    style={{
                      width: "100%", padding: "9px 40px 9px 12px",
                      borderRadius: 8, border: "1.5px solid #E2E8F0",
                      fontSize: "0.82rem", color: "#1E1B4B",
                      background: "#fff", outline: "none",
                      fontFamily: "'DM Sans', sans-serif",
                      transition: "border-color 0.15s",
                      boxSizing: "border-box" as const,
                    }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = "#7C3AED"; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = "#E2E8F0"; }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
                      background: "none", border: "none", cursor: "pointer",
                      padding: 4, color: "#94A3B8", fontSize: "0.78rem",
                    }}
                  >
                    {showPassword ? "🙈" : "👁"}
                  </button>
                </div>
                {password.length > 0 && password.length < 4 && (
                  <p style={{ fontSize: "0.65rem", color: "#F59E0B", marginTop: 4 }}>
                    Password should be at least 4 characters
                  </p>
                )}
              </div>
            )}
          </div>

          {/* ─── Section: Expiration ─── */}
          <SectionLabel>Link Expiration</SectionLabel>

          <div style={{
            display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16,
          }}>
            {EXPIRY_PRESETS.map((preset) => (
              <button
                key={preset.days}
                onClick={() => setExpiryDays(preset.days)}
                style={{
                  padding: "6px 14px", borderRadius: 8, cursor: "pointer",
                  fontSize: "0.76rem", fontWeight: 600,
                  border: `1.5px solid ${expiryDays === preset.days ? "#7C3AED" : "#E2E8F0"}`,
                  background: expiryDays === preset.days ? "rgba(124,58,237,0.06)" : "#fff",
                  color: expiryDays === preset.days ? "#7C3AED" : "#64748B",
                  fontFamily: "'DM Sans', sans-serif",
                  transition: "all 0.15s",
                }}
                onMouseEnter={(e) => { if (expiryDays !== preset.days) e.currentTarget.style.borderColor = "#CBD5E1"; }}
                onMouseLeave={(e) => { if (expiryDays !== preset.days) e.currentTarget.style.borderColor = "#E2E8F0"; }}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* ─── Generated Link Display ─── */}
          {magicLink && (
            <div style={{
              marginTop: 4, padding: "14px 16px", borderRadius: 10,
              background: "#F0FDF4", border: "1.5px solid #BBF7D0",
            }}>
              <div style={{
                display: "flex", alignItems: "center", gap: 6,
                fontSize: "0.65rem", fontWeight: 700, color: "#059669",
                marginBottom: 8, textTransform: "uppercase", letterSpacing: "1px",
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Magic Link Generated
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  readOnly
                  value={magicLink}
                  style={{
                    flex: 1, padding: "8px 12px", borderRadius: 8,
                    border: "1px solid #E2E8F0", fontSize: "0.72rem",
                    fontFamily: "'JetBrains Mono', monospace",
                    color: "#475569", background: "#fff", outline: "none",
                  }}
                />
                <button
                  onClick={onCopyMagicLink}
                  style={{
                    padding: "8px 14px", borderRadius: 8, cursor: "pointer",
                    fontSize: "0.76rem", fontWeight: 600, border: "none",
                    background: isCopied ? "#059669" : "#7C3AED",
                    color: "#fff", fontFamily: "'DM Sans', sans-serif",
                    transition: "all 0.2s", whiteSpace: "nowrap",
                  }}
                >
                  {isCopied ? "✓ Copied" : "📋 Copy"}
                </button>
              </div>

              {/* Password reminder */}
              {sharePassword && (
                <div style={{
                  marginTop: 10, padding: "8px 12px", borderRadius: 8,
                  background: "#FFFBEB", border: "1px solid #FDE68A",
                  display: "flex", alignItems: "flex-start", gap: 8,
                }}>
                  <span style={{ fontSize: "0.82rem", flexShrink: 0, marginTop: 1 }}>🔒</span>
                  <div>
                    <div style={{ fontSize: "0.72rem", fontWeight: 600, color: "#92400E" }}>
                      Password Protected
                    </div>
                    <div style={{ fontSize: "0.68rem", color: "#A16207", marginTop: 2 }}>
                      Share this password separately:{" "}
                      <strong style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        background: "#FEF3C7", padding: "1px 6px", borderRadius: 4,
                        letterSpacing: "0.5px",
                      }}>{sharePassword}</strong>
                    </div>
                  </div>
                </div>
              )}

              <div style={{ fontSize: "0.64rem", color: "#94A3B8", marginTop: 8 }}>
                Link expires in {expiryDays} day{expiryDays > 1 ? "s" : ""}.{" "}
                {sharePassword ? "Viewers must enter the password to access." : "Anyone with this link can view."}
              </div>
            </div>
          )}
        </div>

        {/* ═══ Footer ═══ */}
        <div style={{
          padding: "14px 24px",
          borderTop: "1px solid #F1F5F9",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          background: "#FAFBFC",
        }}>
          <div style={{ fontSize: "0.66rem", color: "#94A3B8" }}>
            {Object.values(options).filter(Boolean).length} options selected • {expiryDays}d expiry
            {passwordEnabled ? " • 🔒" : ""}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={onClose}
              style={{
                padding: "9px 20px", borderRadius: 8, cursor: "pointer",
                fontSize: "0.82rem", fontWeight: 600,
                border: "1.5px solid #E2E8F0", background: "#fff",
                color: "#64748B", fontFamily: "'DM Sans', sans-serif",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#CBD5E1"; e.currentTarget.style.background = "#F8FAFC"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#E2E8F0"; e.currentTarget.style.background = "#fff"; }}
            >
              Cancel
            </button>
            <button
              onClick={handleGenerate}
              disabled={isGenerateDisabled}
              style={{
                padding: "9px 20px", borderRadius: 8,
                cursor: isGenerateDisabled ? "not-allowed" : "pointer",
                fontSize: "0.82rem", fontWeight: 600, border: "none",
                background: isGenerateDisabled
                  ? "#C4B5FD" : "linear-gradient(135deg, #7C3AED, #6D28D9)",
                color: "#fff", fontFamily: "'DM Sans', sans-serif",
                opacity: isGenerateDisabled ? 0.7 : 1,
                transition: "all 0.15s",
                boxShadow: "0 1px 3px rgba(124,58,237,0.2)",
              }}
            >
              {isSharing ? "⏳ Generating…" : "🔗 Generate Magic Link"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Sub-components (internal — not exported)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

/** Section label */
const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{
    fontSize: "0.6rem", fontWeight: 800, textTransform: "uppercase",
    letterSpacing: "2px", color: "#94A3B8", marginBottom: 8,
  }}>
    {children}
  </div>
);

/** Toggle switch */
const ToggleSwitch: React.FC<{ on: boolean }> = ({ on }) => (
  <div style={{
    width: 40, height: 22, borderRadius: 11, padding: 2,
    background: on ? "#7C3AED" : "#CBD5E1",
    cursor: "pointer", transition: "background 0.2s",
    display: "flex", alignItems: "center",
    justifyContent: on ? "flex-end" : "flex-start",
    flexShrink: 0,
  }}>
    <div style={{
      width: 18, height: 18, borderRadius: "50%",
      background: "#fff",
      boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
      transition: "all 0.2s",
    }} />
  </div>
);

/** Checkbox row */
const CheckRow: React.FC<{
  checked: boolean;
  onToggle: () => void;
  icon: string;
  label: string;
  desc: string;
  style?: React.CSSProperties;
}> = ({ checked, onToggle, icon, label, desc, style: extraStyle }) => (
  <div
    onClick={onToggle}
    style={{
      display: "flex", alignItems: "flex-start", gap: 12,
      padding: "10px 14px", borderRadius: 10, cursor: "pointer",
      border: `1.5px solid ${checked ? "#7C3AED" : "#E2E8F0"}`,
      background: checked ? "rgba(124, 58, 237, 0.02)" : "#fff",
      transition: "all 0.15s",
      ...extraStyle,
    }}
  >
    <div style={{
      width: 18, height: 18, borderRadius: 4, flexShrink: 0, marginTop: 1,
      border: `2px solid ${checked ? "#7C3AED" : "#CBD5E1"}`,
      background: checked ? "#7C3AED" : "#fff",
      display: "flex", alignItems: "center", justifyContent: "center",
      transition: "all 0.15s",
    }}>
      {checked && (
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      )}
    </div>
    <div style={{ flex: 1 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: "0.88rem" }}>{icon}</span>
        <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "#1E1B4B" }}>{label}</span>
      </div>
      <p style={{ fontSize: "0.68rem", color: "#94A3B8", marginTop: 2, lineHeight: 1.4 }}>
        {desc}
      </p>
    </div>
  </div>
);