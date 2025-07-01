import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Download } from "lucide-react";
 
interface SummaryModalProps {
  analysisData: {
    report_url?: string | null; // Ensure this is passed from parent
    overall_score: number;
    summary: string;
    top_skills: string[];
    missing_or_weak_areas: string[];
    // Add other fields if needed, e.g., candidate_name for filename
    candidate_name?: string;
  };
  onClose: () => void;
}
 
const SummaryModal: React.FC<SummaryModalProps> = ({ analysisData, onClose }) => {
  const reportUrl = analysisData?.report_url;
  const candidateName = analysisData?.candidate_name || 'Candidate'; // Get name for filename
  const score = analysisData?.overall_score || 0;
 
  console.log("Report url", reportUrl)
  // Construct a suggested filename
  const suggestedFilename = `Resume Analysis - ${candidateName.replace(/[^a-z0-9]/gi, '_')} - Score ${score}.pdf`;
 
  console.log('Modal received analysisData:', analysisData); // Debug log
  console.log('Extracted reportUrl:', reportUrl); // Debug log
 
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-5xl rounded-xl p-6 overflow-y-auto max-h-[85vh]">
        <DialogHeader className="flex justify-between items-center mb-4">
          <DialogTitle className="text-xl font-semibold">Resume Analysis Summary</DialogTitle>
 
          {/* --- USE <a> TAG WITH download ATTRIBUTE --- */}
          {reportUrl ? (
            <a
              href={reportUrl}
              // Remove target="_blank" if you DON'T want a new tab attempt first
              target="_blank"
              rel="noopener noreferrer" // Still good practice
              download={suggestedFilename} // Add the download attribute with a filename
              className="flex items-center gap-1 text-sm font-medium text-purple-700 hover:underline"
            >
              <Download className="w-4 h-4" />
              Download Full Report PDF
            </a>
          ) : (
            // Render disabled button if URL is missing
            <button
              disabled
              title="Report URL not available" // Add a tooltip
              className="flex items-center gap-1 text-sm font-medium text-gray-400 cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              Download Full Report PDF
            </button>
          )}
          {/* --- END <a> TAG --- */}
 
        </DialogHeader>
 
        {/* Display Content */}
        <div>
          {/* Score */}
          <div className="bg-purple-100 text-purple-700 font-semibold p-4 rounded-lg flex justify-between items-center mb-4">
            <span>Overall Score</span>
            <span className="text-xl">{analysisData.overall_score}%</span>
          </div>
 
          {/* Summary */}
          <div className="mb-4 border border-gray-200 p-4 rounded-lg">
            <h3 className="font-semibold text-lg mb-1">Overall Summary</h3>
            <p className="text-sm text-gray-700">{analysisData.summary || "No summary available"}</p>
          </div>
 
          {/* Skills Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Top Skills */}
            <div className="border border-gray-200 p-4 rounded-lg">
              <h3 className="font-semibold text-lg mb-2">Top Skills</h3>
              {analysisData.top_skills && analysisData.top_skills.length > 0 ? (
                <ul className="text-sm text-gray-700 list-disc list-inside space-y-1">
                  {analysisData.top_skills.map((skill, index) => (
                    <li key={`top-${index}`}>{skill}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500 italic">No top skills identified</p>
              )}
            </div>
 
            {/* Missed Skills */}
            <div className="border border-gray-200 p-4 rounded-lg">
              <h3 className="font-semibold text-lg mb-2">Missed Skills / Weak Areas</h3>
              {analysisData.missing_or_weak_areas && analysisData.missing_or_weak_areas.length > 0 ? (
                <ul className="text-sm text-gray-700 list-disc list-inside space-y-1">
                  {analysisData.missing_or_weak_areas.map((area, index) => (
                    <li key={`missed-${index}`}>{area}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500 italic">No missed skills identified</p>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
 
export default SummaryModal;