import React from "react";
import { BgvVerificationSection } from "@/pages/bg-verification/BgvVerificationSection";

interface V2BgvDialogProps {
  open: boolean;
  onClose: () => void;
  candidate: any;
  employee: any;
  documents: any;
}

export const V2BgvDialog: React.FC<V2BgvDialogProps> = ({
  open,
  onClose,
  candidate,
  employee,
  documents,
}) => {
  if (!open) return null;

  const candidateForVerification = {
    id: employee.id,
    name: employee.name,
    email: employee.email,
    phone: employee.phone,
    metadata: { uan: documents?.uan?.value || null },
  } as any;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 200,
          background: "rgba(0,0,0,0.35)",
          backdropFilter: "blur(6px)",
        }}
      />

      {/* Dialog */}
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 201,
          width: "100%",
          maxWidth: 900,
          maxHeight: "85vh",
          background: "#ffffff",                    // solid white
          borderRadius: "var(--v2-radius)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.2)",
          animation: "v2ScaleIn 0.25s ease",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Content area – full height, no header */}
        <div style={{ flex: 1, overflow: "auto", position: "relative", padding: 0 }}>
          <BgvVerificationSection candidate={candidateForVerification} />

          {/* Close button – top-right corner */}
          <button
            onClick={onClose}
            style={{
              position: "absolute",
              top: "14px",
              right: "16px",
              width: 36,
              height: 36,
              
              cursor: "pointer",
              border: "none",
              background: "rgba(0,0,0,0.07)",
              color: "#333",
              fontSize: "1.1rem",
              fontWeight: "bold",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
              transition: "all 0.2s",
              zIndex: 10,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(0,0,0,0.12)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(0,0,0,0.07)";
            }}
          >
            ✕
          </button>
        </div>
      </div>
    </>
  );
};