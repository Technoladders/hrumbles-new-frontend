import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react"; // Added Chevron icons
import { WorkHistory, Candidate } from "@/components/MagicLinkView/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface WorkHistorySectionProps {
  workHistory: WorkHistory[];
  shareMode: boolean;
  isVerifyingAll: boolean;
  onVerifyAllCompanies: () => void;
  onVerifySingleWorkHistory: (company: WorkHistory) => void;
  updateWorkHistoryItem: (companyId: number, updates: Partial<WorkHistory>) => void;
  candidate: Candidate | null;
}

const ITEMS_PER_PAGE = 4;

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

  // Pagination Logic
  const totalPages = Math.ceil(workHistory.length / ITEMS_PER_PAGE);
  const showNavigation = totalPages > 1;
  
  const startIndex = currentPage * ITEMS_PER_PAGE;
  const currentItems = workHistory.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handlePrev = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 0));
  };

  const handleNext = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages - 1));
  };

  return (
    // Increased padding to p-10 for larger card size
    <div className="bg-white rounded-lg p-10 mb-6 shadow-sm relative">
      <div className="flex items-center justify-between mb-12">
        <h3 className="text-2xl font-bold text-gray-900">Work History</h3>
        {!shareMode && (
          <Button 
            onClick={onVerifyAllCompanies} 
            disabled={isVerifyingAll} 
            size="sm"
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            {isVerifyingAll ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Verify All"}
          </Button>
        )}
      </div>
      
      {/* Main Carousel Container with relative positioning for arrows */}
      <div className="relative px-8"> {/* Added horizontal padding for arrows space */}
        
        {/* Previous Button */}
     {/* Previous Button */}
{showNavigation && (
  <button
    onClick={handlePrev}
    disabled={currentPage === 0}
    className={`absolute left-0 top-[40px] transform -translate-y-1/2 z-20 w-10 h-10 rounded-full flex items-center justify-center transition-all
      ${currentPage === 0 
        ? "bg-gray-200 text-gray-400 cursor-not-allowed" 
        : "bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700 shadow-md" // <-- MODIFIED LINE
      }`}
  >
    <ChevronLeft className="h-6 w-6" />
  </button>
)}

        {/* Next Button */}
     {/* Next Button */}
{showNavigation && (
  <button
    onClick={handleNext}
    disabled={currentPage === totalPages - 1}
    className={`absolute right-0 top-[40px] transform -translate-y-1/2 z-20 w-10 h-10 rounded-full flex items-center justify-center transition-all
      ${currentPage === totalPages - 1 
        ? "bg-gray-200 text-gray-400 cursor-not-allowed" 
        : "bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700 shadow-md"  // <-- CHANGE THIS LINE
      }`}
  >
    <ChevronRight className="h-6 w-6" />
  </button>
)}

        {/* Timeline Container - Changed to Grid for 4 items */}
        <div className="relative py-6 mt-8">
          {/* Horizontal line - spans full width of grid */}
          <div className="absolute top-5 left-0 w-full h-0.5 bg-purple-200"></div>

          {/* Grid items */}
          <div className="grid grid-cols-4 gap-4 relative">
            {currentItems.map((history) => (
              <div 
                key={history.company_id} 
                className="flex flex-col items-center group w-full"
              >
                {/* Small Circle - Purple with Tooltip inside */}
                <div className="relative z-10 w-10 h-10 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 border-3 border-white shadow-md flex items-center justify-center mb-3 group-hover:from-purple-700 group-hover:to-pink-700 transition-all cursor-pointer">
                  <div className="w-3 h-3 rounded-full bg-white"></div>

                  {/* Hover tooltip - Positioned above circle */}
                  <div className="absolute left-1/2 transform -translate-x-1/2 bottom-full mb-3 w-60 bg-white border border-purple-200 rounded-lg shadow-xl p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none">
                    <div className="space-y-1 text-center">
                      <div className="text-xs">
                        <span className="font-bold text-purple-700 block">Role:</span>
                        <p className="text-gray-800 font-medium">{history.designation || 'N/A'}</p>
                      </div>
                      <div className="text-xs border-t border-gray-100 pt-1 mt-1">
                        <span className="text-gray-500">Period: {history.years || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Company name */}
                <div className="text-center mb-2 px-1 w-full h-[40px] flex items-start justify-center">
                  <p className="text-sm font-bold text-gray-900 hover:text-purple-600 cursor-pointer transition-colors line-clamp-2 leading-tight">
                    {history.isVerified ? history.selectedCompanyOption?.verifiedCompanyName : history.company_name}
                  </p>
                </div>

                {/* Verification Status Icons */}
                <div className="mt-1 text-center h-[20px]">
                  {history.isVerifying && (
                    <Loader2 className="h-4 w-4 animate-spin text-yellow-600 mx-auto" />
                  )}
                  {history.isEmployeeVerified && (
                    <CheckCircle2 className="h-4 w-4 text-green-600 mx-auto" />
                  )}
                </div>

                {/* Action buttons */}
                {!shareMode && (
                  <div className="mt-2 flex flex-col gap-2 items-center w-full px-2">
                    {/* Stage 1: Verify Company */}
                    {!history.isVerified && !history.isVerifying && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => onVerifySingleWorkHistory(history)}
                        disabled={isVerifyingAll}
                        className="text-xs w-full border-purple-300 text-purple-700 hover:bg-purple-50"
                      >
                        Verify Company
                      </Button>
                    )}

                    {/* Stage 2: Dropdowns and Verify Employee */}
                    {history.isVerified && !history.isEmployeeVerified && !history.isEmployeeVerifying && (
                      <>
                        {history.companyVerificationOptions && (
                          <Select 
                            value={history.selectedCompanyOption?.establishmentId || ""} 
                            onValueChange={(value) => {
                              const selected = history.companyVerificationOptions?.find(opt => opt.establishmentId === value);
                              if (selected) updateWorkHistoryItem(history.company_id, { selectedCompanyOption: selected });
                            }}
                          >
                            <SelectTrigger className="w-full h-7 text-xs">
                              <SelectValue placeholder="Select Match" />
                            </SelectTrigger>
                            <SelectContent>
                              {history.companyVerificationOptions.map((option) => (
                                <SelectItem key={option.establishmentId} value={option.establishmentId}>
                                  {option.verifiedCompanyName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}

                        {history.availableVerificationYears && (
                          <Select 
                            value={history.selectedVerificationYear?.toString() || ''} 
                            onValueChange={(value) => updateWorkHistoryItem(history.company_id, { selectedVerificationYear: parseInt(value, 10) })}
                          >
                            <SelectTrigger className="w-full h-7 text-xs">
                              <SelectValue placeholder="Year" />
                            </SelectTrigger>
                            <SelectContent>
                              {history.availableVerificationYears.map((year) => (
                                <SelectItem key={year} value={year.toString()}>
                                  {year}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}

                        <Button 
                          variant="secondary" 
                          size="sm" 
                          onClick={() => onVerifySingleWorkHistory(history)}
                          disabled={isVerifyingAll || !history.selectedCompanyOption || !history.selectedVerificationYear}
                          className="text-xs w-full bg-purple-100 text-purple-700 hover:bg-purple-200"
                        >
                          Verify Employee
                        </Button>
                      </>
                    )}
                  </div>
                )}

                {/* Error messages - Fixed height container to prevent jumping */}
                <div className="h-[30px] w-full mt-1 flex flex-col justify-start">
                  {history.verificationError && (
                    <p className="text-[10px] text-red-600 text-center line-clamp-2 leading-tight px-1">{history.verificationError}</p>
                  )}
                  {history.employeeVerificationError && (
                    <p className="text-[10px] text-red-600 text-center line-clamp-2 leading-tight px-1">{history.employeeVerificationError}</p>
                  )}
                </div>
              </div>
            ))}
            
            {/* Fill empty slots to maintain grid structure if last page has < 4 items */}
            {Array.from({ length: ITEMS_PER_PAGE - currentItems.length }).map((_, index) => (
              <div key={`empty-${index}`} className="w-full"></div>
            ))}
          </div>
        </div>
      </div>

      {/* Page indicator */}
      {showNavigation && (
        <p className="text-xs text-gray-400 text-center mt-2">
          Page {currentPage + 1} of {totalPages}
        </p>
      )}
    </div>
  );
};