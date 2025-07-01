// components/DocumentsSection.tsx
import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DocumentState } from "@/components/MagicLinkView/types";

interface DocumentsSectionProps {
  documents: {
    uan: DocumentState;
    pan: DocumentState;
    pf: DocumentState;
    esic: DocumentState;
  };
  shareMode: boolean;
  onDocumentChange: (type: keyof typeof documents, value: string) => void;
  onToggleEditing: (type: keyof typeof documents) => void;
  onToggleUANResults: () => void;
  onVerifyDocument: (type: keyof typeof documents) => Promise<void>;
  onSaveDocuments: () => Promise<void>;
  isSavingDocuments: boolean;
}

export const DocumentsSection: React.FC<DocumentsSectionProps> = ({
  documents,
  shareMode,
  onDocumentChange,
  onToggleEditing,
  onToggleUANResults,
  onVerifyDocument,
  onSaveDocuments,
  isSavingDocuments,
}) => {
  const renderVerificationStatus = (doc: DocumentState) => {
    if (shareMode) return null;
    if (doc.isVerifying) {
      return (
        <div className="flex items-center text-yellow-600">
          <Loader2 className="mr-1 h-4 w-4 animate-spin" />
          <span className="text-xs">Verifying...</span>
        </div>
      );
    }
    if (doc.isVerified) {
      return (
        <div className="flex items-center text-green-600">
          <CheckCircle2 className="mr-1 h-4 w-4" />
          <span className="text-xs">Verified on {doc.verificationDate}</span>
        </div>
      );
    }
    if (doc.error) {
      return (
        <div className="flex items-center text-red-600">
          <XCircle className="mr-1 h-4 w-4" />
          <span className="text-xs">{doc.error}</span>
        </div>
      );
    }
    return null;
  };

  console.log("documents", documents)
  const renderDocumentRow = (type: keyof typeof documents, label: string) => {
    const doc = documents[type];

    return (
      <div className="border rounded-lg mb-4 bg-white shadow-sm hover:shadow-md transition-shadow w-full">
        <div className="p-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div className="flex-1">
              <div className="flex items-center">
                <p className="text-sm font-medium">{label}</p>
                {doc.isVerified && !shareMode && (
                  <Badge className="ml-2 bg-green-100 text-green-800 hover:bg-green-100">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Verified
                  </Badge>
                )}
              </div>
              {doc.isEditing && !shareMode ? (
                <Input
                  value={doc.value}
                  onChange={(e) => onDocumentChange(type, e.target.value)}
                  className="mt-1 h-8 text-sm w-full sm:w-1/2"
                />
              ) : (
                <p className="text-xs text-muted-foreground">
                  {doc.value || "Not Provided"}
                </p>
              )}
              {renderVerificationStatus(doc)}
              {type === "uan" && doc.results && doc.results.length > 0 && (
                <div className="mt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onToggleUANResults}
                    className="flex items-center text-indigo-600 hover:text-indigo-800"
                  >
                    {doc.isUANResultsOpen ? (
                      <ChevronUp className="w-4 h-4 mr-1" />
                    ) : (
                      <ChevronDown className="w-4 h-4 mr-1" />
                    )}
                    {doc.isUANResultsOpen
                      ? "Hide Verification Details"
                      : "Show Verification Details"}
                  </Button>
                  {doc.isUANResultsOpen && (
                    <div className="mt-2 p-4 bg-gray-50 rounded-lg">
                      <h4 className="text-sm font-medium mb-2">
                        Dual Employment Verification Results
                      </h4>
                      <div className="space-y-4">
                        {doc.results.map((entry, index) => (
                          <div key={index} className="border-b pb-2">
                            <p className="text-xs font-medium">
                              {entry.EstablishmentName}
                            </p>
                            <p className="text-xs text-gray-600">
                              Join Date: {entry.Doj}
                            </p>
                            <p className="text-xs text-gray-600">
                              Exit Date:{" "}
                              {entry.DateOfExitEpf === "NA"
                                ? "Currently Employed"
                                : entry.DateOfExitEpf}
                            </p>
                            <p className="text-xs text-gray-600">
                              Overlapping: {entry.Overlapping}
                            </p>
                            <p className="text-xs text-gray-600">
                              Member ID: {entry.MemberId}
                            </p>
                            <p className="text-xs text-gray-600">
                              Name: {entry.name}
                            </p>
                            <p className="text-xs text-gray-600">
                              Father/Husband: {entry.fatherOrHusbandName}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            {!shareMode && (
              <div className="flex space-x-2">
                <Button
                  onClick={() => onToggleEditing(type)}
                  variant="outline"
                  size="sm"
                  disabled={doc.isVerifying || doc.isVerified}
                  className={cn(
                    doc.isEditing && "bg-indigo-100 text-indigo-800 hover:bg-indigo-200"
                  )}
                >
                  {doc.isEditing ? "Cancel" : "Edit"}
                </Button>
                <Button
                  onClick={() => onVerifyDocument(type)}
                  variant="secondary"
                  size="sm"
                  disabled={doc.isVerifying}
                  className={cn(
                    doc.isVerified && "bg-green-100 text-green-800 hover:bg-green-200"
                  )}
                >
                  {doc.isVerifying ? (
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  ) : doc.isVerified && type === "uan" ? (
                    <>
                      Reverify <CheckCircle2 className="ml-1 h-3 w-3" />
                    </>
                  ) : doc.isVerified ? (
                    <>
                      Verified <CheckCircle2 className="ml-1 h-3 w-3" />
                    </>
                  ) : (
                    <>Verify 🔍</>
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Verification Documents</h3>
        {!shareMode && (
          <Button
            onClick={onSaveDocuments}
            variant="secondary"
            size="sm"
            disabled={isSavingDocuments || !Object.values(documents).some((doc) => doc.isEditing)}
          >
            {isSavingDocuments ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        )}
      </div>
      {renderDocumentRow("uan", "UAN Number")}
      {renderDocumentRow("pan", "PAN Number")}
      {renderDocumentRow("pf", "PF Number")}
      {renderDocumentRow("esic", "ESIC Number")}
    </div>
  );
};