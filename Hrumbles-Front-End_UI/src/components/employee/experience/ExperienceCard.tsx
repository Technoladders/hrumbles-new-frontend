
import React, { useState } from "react";
import { format, differenceInMonths } from "date-fns";
import { FileText, Pencil, Trash2, Eye, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Experience } from "@/services/types/employee.types";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ExperienceCardProps {
  experience: Experience;
  onEdit: (experience: Experience) => void;
  onDelete: (experience: Experience) => void;
  onViewDocument: (docType: keyof Pick<Experience, 'offerLetter' | 'separationLetter' | 'payslips'>) => void;
  onDownloadDocument: (docType: keyof Pick<Experience, 'offerLetter' | 'separationLetter' | 'payslips'>) => void;
}

export const ExperienceCard: React.FC<ExperienceCardProps> = ({
  experience,
  onEdit,
  onDelete,
  onViewDocument,
  onDownloadDocument,
}) => {
  const [isDownloading, setIsDownloading] = useState(false);

  const formatDate = (date: string) => {
    if (!date) return "Present";
    return format(new Date(date), "MMM yyyy");
  };

  const calculateExperience = (startDate: string, endDate: string | null) => {
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : new Date();
    const years = differenceInMonths(end, start) / 12;
    return `${years.toFixed(1)} years`;
  };

  const handleDownload = async (docType: keyof Pick<Experience, 'offerLetter' | 'separationLetter' | 'payslips'>) => {
    try {
      setIsDownloading(true);
      await onDownloadDocument(docType);
    } finally {
      setIsDownloading(false);
    }
  };

  const renderDocumentIcon = (docType: keyof Pick<Experience, 'offerLetter' | 'separationLetter' | 'payslips'>, label: string) => {
    if (!experience[docType]) return null;
    
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="inline-flex">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 rounded-full hover:bg-gray-100 group"
              >
                <FileText className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
              </Button>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="flex flex-col gap-1">
              <p className="text-xs font-medium">{label}</p>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => onViewDocument(docType)}
                >
                  <Eye className="h-3 w-3 mr-1" />
                  View
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => handleDownload(docType)}
                  disabled={isDownloading}
                >
                  <Download className="h-3 w-3 mr-1" />
                  Download
                </Button>
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  return (
    <div className="group flex items-center justify-between py-3 px-4 hover:bg-gray-50/80 rounded-lg transition-colors">
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-900">{experience.jobTitle}</h3>
            <p className="text-xs text-gray-500">
              {experience.company} • {calculateExperience(experience.startDate, experience.endDate)}
            </p>
          </div>
          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(experience)}
              className="h-7 w-7 rounded-full hover:bg-gray-100"
            >
              <Pencil className="h-3.5 w-3.5 text-gray-500" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(experience)}
              className="h-7 w-7 rounded-full hover:bg-red-50 text-red-500 hover:text-red-600"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        <div className="mt-2 flex items-center gap-2">
          {renderDocumentIcon('offerLetter', 'Offer Letter')}
          {renderDocumentIcon('separationLetter', 'Separation Letter')}
          {experience.payslips?.length > 0 && renderDocumentIcon('payslips', 'Payslips')}
        </div>
      </div>
    </div>
  );
};
