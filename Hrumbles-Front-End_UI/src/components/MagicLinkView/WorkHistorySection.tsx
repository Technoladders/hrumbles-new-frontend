import React, { useState } from "react";
import { Loader2, CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";
import { WorkHistory, Candidate } from "@/components/MagicLinkView/types";

interface WorkHistorySectionProps {
  workHistory: WorkHistory[];
  shareMode: boolean;
  isVerifyingAll: boolean;
  onVerifyAllCompanies: () => void;
  onVerifySingleWorkHistory: (company: WorkHistory) => void;
  updateWorkHistoryItem: (
    companyId: number,
    updates: Partial<WorkHistory>
  ) => void;
  candidate: Candidate | null;
}

const ITEMS_PER_PAGE = 4;

// ✨ Bounce Animation — stays pure purple
const solidPurpleBounceAnimation = `
  @keyframes solid-purple-bounce {
    0%, 100% {
      transform: translateX(0) scale(1);
      background-color: #7E22CE; /* Pure purple */
      animation-timing-function: cubic-bezier(0.8, 0, 1, 1);
    }
    50% {
      transform: translateX(6px) scale(1.05);
      background-color: #7E22CE; /* Pure purple */
      animation-timing-function: cubic-bezier(0, 0, 0.2, 1);
    }
  }
`;

export const WorkHistorySection: React.FC<WorkHistorySectionProps> = ({
  workHistory,
  shareMode,
  isVerifyingAll,
  onVerifyAllCompanies,
  onVerifySingleWorkHistory,
  updateWorkHistoryItem,
}) => {
  const [currentPage, setCurrentPage] = useState(0);

  if (!workHistory || workHistory.length === 0) return null;

  const totalPages = Math.ceil(workHistory.length / ITEMS_PER_PAGE);
  const showNavigation = totalPages > 1;

  const startIndex = currentPage * ITEMS_PER_PAGE;
  const currentItems = workHistory.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE
  );

  const handlePrev = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 0));
  };

  const handleNext = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages - 1));
  };

  const getGridColsClass = (itemCount: number) => {
    switch (itemCount) {
      case 1:
        return "grid-cols-1";
      case 2:
        return "grid-cols-2";
      case 3:
        return "grid-cols-3";
      default:
        return "grid-cols-4";
    }
  };
  const gridColsClass = getGridColsClass(currentItems.length);

  const nextButtonStyle: React.CSSProperties = {
    animation:
      currentPage === totalPages - 1 ? "none" : "solid-purple-bounce 1.75s infinite",
  };

  return (
    <div className="bg-white rounded-lg p-4 mb-6 shadow-sm relative">
      <style>{solidPurpleBounceAnimation}</style>

      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-gray-900">Work History</h3>
      </div>

      <div className="relative px-8">
        {/* Left navigation button */}
        {showNavigation && (
          <button
            onClick={handlePrev}
            disabled={currentPage === 0}
            className={`absolute left-0 top-[40px] transform -translate-y-1/2 z-20 w-8 h-8 rounded-full flex items-center justify-center transition-all
              ${
                currentPage === 0
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                  : "bg-[#7E22CE] text-white hover:bg-[#6B21A8] shadow-lg"
              }`}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}

        {/* Right navigation button */}
        {showNavigation && (
          <button
            onClick={handleNext}
            disabled={currentPage === totalPages - 1}
            style={nextButtonStyle}
            className={`absolute right-0 top-[40px] transform -translate-y-1/2 z-20 w-8 h-8 rounded-full flex items-center justify-center transition-all
              ${
                currentPage === totalPages - 1
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                  : "bg-[#7E22CE] text-white hover:bg-[#6B21A8] shadow-lg"
              }`}
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        )}

        {/* Timeline grid */}
        <div className="relative py-2 mt-2">
          <div className="absolute top-4 left-0 w-full h-0.5 bg-purple-200"></div>

          <div className={`grid ${gridColsClass} gap-4 relative`}>
            {currentItems.map((history) => (
              <div
                key={history.company_id}
                className="flex flex-col items-center group w-full"
              >
                {/* Keep the original gradient for timeline dots */}
                <div className="relative z-10 w-8 h-8 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 border-3 border-white shadow-md flex items-center justify-center mb-2 transition-all cursor-pointer">
                  <div className="w-2.5 h-2.5 rounded-full bg-white"></div>
                </div>

                {/* Company Name */}
                <div className="text-center mb-1 px-1 w-full flex items-start justify-center">
                  <p className="text-xs font-bold text-gray-900 hover:text-purple-600 cursor-pointer transition-colors line-clamp-2 leading-tight">
                    {history.isVerified
                      ? history.selectedCompanyOption?.verifiedCompanyName
                      : history.company_name}
                  </p>
                </div>

                {/* Designation — old gradient purple-pink style */}
                <div className="text-center px-1 w-full mb-1">
                  <p className="text-xs font-semibold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">
                    {history.designation || "N/A"}
                  </p>
                </div>

                {/* Years */}
                <div className="text-center px-1 w-full mb-1">
                  <p className="text-xs text-gray-500">
                    {history.years || "N/A"}
                  </p>
                </div>

                {/* Verification Status */}
                <div className="mt-1 text-center h-[16px]">
                  {history.isVerifying && (
                    <Loader2 className="h-3 w-3 animate-spin text-yellow-600 mx-auto" />
                  )}
                  {history.isEmployeeVerified && (
                    <CheckCircle2 className="h-3 w-3 text-green-600 mx-auto" />
                  )}
                </div>

                {/* Error Messages */}
                <div className="h-[24px] w-full mt-1 flex flex-col justify-start">
                  {history.verificationError && (
                    <p className="text-[9px] text-red-600 text-center line-clamp-2 leading-tight px-1">
                      {history.verificationError}
                    </p>
                  )}
                  {history.employeeVerificationError && (
                    <p className="text-[9px] text-red-600 text-center line-clamp-2 leading-tight px-1">
                      {history.employeeVerificationError}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showNavigation && (
        <p className="text-xs text-gray-400 text-center mt-[-3rem]">
          Page {currentPage + 1} of {totalPages}
        </p>
      )}
    </div>
  );
};