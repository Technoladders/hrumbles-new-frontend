import React, { useRef } from "react";
import html2pdf from "html2pdf.js";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Download } from "lucide-react";

interface SummaryModalProps {
  analysisData: {
    overall_score: number;
    skills_score: number;
    skills_summary: string;
    work_experience_score: number;
    work_experience_summary: string;
    education_score: number;
    education_summary: string;
    projects_score: number;
    projects_summary: string;
  };
  onClose: () => void;
}

const SummaryModal: React.FC<SummaryModalProps> = ({ analysisData, onClose }) => {
  const summaryRef = useRef<HTMLDivElement>(null);

  const handleDownload = () => {
    if (summaryRef.current) {
      console.log("Downloading report...", summaryRef.current);
      html2pdf()
        .set({
          margin: 0.5,
          filename: "resume_summary.pdf",
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2 },
          jsPDF: { unit: "in", format: "letter", orientation: "portrait" },
        })
        .from(summaryRef.current)
        .save()
        .then(() => console.log("PDF generated successfully"))
        .catch((error) => console.error("Error generating PDF:", error));
    } else {
      console.error("summaryRef is not set");
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-5xl rounded-xl p-6">
        <DialogHeader className="flex justify-between items-center">
          <DialogTitle className="text-xl font-semibold">Resume Analysis</DialogTitle>
          <button
            onClick={handleDownload}
            className="flex items-center gap-1 text-sm font-medium text-purple-700 hover:underline"
          >
            <Download className="w-4 h-4" />
            Download Report
          </button>
        </DialogHeader>

        {/* Content to export */}
        <div ref={summaryRef}>
          {/* Overall Score */}
          <div className="bg-purple-100 text-purple-700 font-semibold p-4 rounded-lg flex justify-between items-center">
            <span>Overall Score</span>
            <span className="text-xl">{analysisData.overall_score}%</span>
          </div>

          {/* Grid Layout for Sections */}
          <div className="grid grid-cols-2 gap-4 mt-4">
            {/* Skills Match */}
            <div className="border border-purple-300 p-4 rounded-lg">
              <h3 className="font-medium">Skills Match</h3>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Score: {analysisData.skills_score}%</span>
              </div>
              <p className="text-sm text-gray-800 mt-1">{analysisData.skills_summary}</p>
            </div>

            {/* Experience Relevance */}
            <div className="border border-purple-300 p-4 rounded-lg">
              <h3 className="font-medium">Experience Relevance</h3>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Score: {analysisData.work_experience_score}%</span>
              </div>
              <p className="text-sm text-gray-800 mt-1">{analysisData.work_experience_summary}</p>
            </div>

            {/* Education */}
            <div className="border border-purple-300 p-4 rounded-lg">
              <h3 className="font-medium">Education</h3>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Score: {analysisData.education_score}%</span>
              </div>
              <p className="text-sm text-gray-800 mt-1">{analysisData.education_summary}</p>
            </div>

            {/* Projects */}
            <div className="border border-purple-300 p-4 rounded-lg">
              <h3 className="font-medium">Projects</h3>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Score: {analysisData.projects_score}%</span>
              </div>
              <p className="text-sm text-gray-800 mt-1">{analysisData.projects_summary}</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SummaryModal;