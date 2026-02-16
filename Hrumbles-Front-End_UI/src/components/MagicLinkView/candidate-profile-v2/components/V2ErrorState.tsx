// src/components/MagicLinkView/candidate-profile-v2/components/V2ErrorState.tsx

import React from "react";
import { Button } from "@/components/ui/button"; // assuming you use shadcn/ui or similar
import { AlertCircle, ArrowLeft, RefreshCw } from "lucide-react";

interface V2ErrorStateProps {
  error: string | Error | null | undefined;
  onBack?: () => void;
  onRetry?: () => void;
  title?: string;
  showRetry?: boolean;
}

export const V2ErrorState: React.FC<V2ErrorStateProps> = ({
  error,
  onBack,
  onRetry,
  title = "Something went wrong",
  showRetry = true,
}) => {
  const errorMessage =
    typeof error === "string"
      ? error
      : error instanceof Error
      ? error.message
      : "An unexpected error occurred. Please try again later.";

  return (
    <div
      className="v2-root min-h-screen flex items-center justify-center p-6"
      style={{
        background: "var(--v2-bg)",
      }}
    >
      <div
        className="v2-card v2-animate-scale"
        style={{
          maxWidth: 480,
          width: "100%",
          padding: "40px 32px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: 80,
            height: 80,
            margin: "0 auto 24px",
            background: "rgba(239, 68, 68, 0.08)",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "1px solid rgba(239,68,68,0.2)",
          }}
        >
          <AlertCircle size={40} color="#EF4444" strokeWidth={1.8} />
        </div>

        <h2
          style={{
            fontSize: "1.5rem",
            fontWeight: 700,
            color: "var(--v2-text)",
            marginBottom: 12,
          }}
        >
          {title}
        </h2>

        <p
          style={{
            fontSize: "0.95rem",
            color: "var(--v2-text-secondary)",
            lineHeight: 1.6,
            marginBottom: 32,
          }}
        >
          {errorMessage}
        </p>

        <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
          {onBack && (
            <Button
              variant="outline"
              onClick={onBack}
              className="gap-2"
              style={{
                borderColor: "var(--v2-border)",
                color: "var(--v2-text-secondary)",
              }}
            >
              <ArrowLeft size={16} />
              Go Back
            </Button>
          )}

          {showRetry && onRetry && (
            <Button
              onClick={onRetry}
              className="gap-2 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700"
            >
              <RefreshCw size={16} />
              Try Again
            </Button>
          )}

          {!onBack && !onRetry && (
            <Button
              variant="outline"
              onClick={() => window.location.reload()}
              className="gap-2"
            >
              <RefreshCw size={16} />
              Refresh Page
            </Button>
          )}
        </div>

        {/* Optional debug info in development */}
        {process.env.NODE_ENV === "development" && error && (
          <div
            style={{
              marginTop: 40,
              padding: 16,
              background: "rgba(239,68,68,0.05)",
              borderRadius: "var(--v2-radius-sm)",
              fontSize: "0.82rem",
              color: "#DC2626",
              textAlign: "left",
              fontFamily: "var(--v2-mono)",
              overflowX: "auto",
              maxWidth: "100%",
            }}
          >
            <strong>Dev stack trace:</strong>
            <pre style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>
              {error instanceof Error ? error.stack : JSON.stringify(error, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};