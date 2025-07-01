// components/ResumePreviewSection.tsx
import React from "react";

interface ResumePreviewSectionProps {
  resumeUrl: string;
}

export const ResumePreviewSection: React.FC<ResumePreviewSectionProps> = ({
  resumeUrl,
}) => {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium">Resume Preview</h3>
      {resumeUrl !== "#" ? (
        <iframe
          src={resumeUrl}
          title="Resume Preview"
          className="w-full h-[800px] border border-gray-200 rounded-lg"
        />
      ) : (
        <p className="text-sm text-gray-600">No resume available for preview.</p>
      )}
    </div>
  );
};