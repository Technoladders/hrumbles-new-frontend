
import React from "react";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { EducationData } from "../types";

interface EducationSectionProps {
  data: EducationData;
  onEdit: () => void;
}

export const EducationSection: React.FC<EducationSectionProps> = ({
  data,
  onEdit,
}) => {
  const renderDocument = (file: File | undefined, label: string) => {
    return (
      <div className="flex items-center gap-4">
        <label className="text-sm text-gray-600">{label}</label>
        {file ? (
          <div className="flex items-center gap-2">
            <span className="text-blue-600">{file.name}</span>
          </div>
        ) : (
          <span className="text-gray-400">No document uploaded</span>
        )}
      </div>
    );
  };

  return (
    <div className="p-6 bg-white rounded-lg border border-gray-200">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-[#30409F]">Education</h2>
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
          onClick={onEdit}
        >
          <Pencil className="h-4 w-4" />
          Edit
        </Button>
      </div>

      <div className="space-y-4">
        {renderDocument(data.ssc, "SSC Certificate")}
        {renderDocument(data.hsc, "HSC Certificate")}
        {renderDocument(data.degree, "Degree Certificate")}
      </div>
    </div>
  );
};
