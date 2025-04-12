
import React from "react";
import { UserCircle, Copy } from "lucide-react";
import { InfoCard } from "../InfoCard";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider
} from "@/components/ui/tooltip";

interface PersonalInfoSectionProps {
  phone: string;
  dateOfBirth: string;
  maritalStatus: string;
  onEdit: () => void;
}

export const PersonalInfoSection: React.FC<PersonalInfoSectionProps> = ({
  phone,
  dateOfBirth,
  maritalStatus,
  onEdit,
}) => {
  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'Not specified';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-GB');
    } catch (error) {
      console.error('Error formatting date:', dateStr, error);
      return 'Invalid date';
    }
  };

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${type} copied`);
  };

  const InfoRow = ({ label, value, copyable, onCopy }: { 
    label: string; 
    value: string; 
    copyable?: boolean;
    onCopy?: () => void;
  }) => (
    <div className="flex items-center">
      <span className="text-gray-500 w-1/3">{label}</span>
      <span className="flex-1 text-right">{value}</span>
      <div className="w-10 flex justify-end">
        {copyable && onCopy && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={onCopy}
                  className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="left">
                <p>Copy</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    </div>
  );

  return (
    <InfoCard 
      title="Personal Information" 
      icon={UserCircle}
      onEdit={onEdit}
    >
      <div className="space-y-3 p-2">
        <div className="space-y-2">
          <InfoRow 
            label="Phone" 
            value={phone || 'Not specified'} 
            copyable={!!phone}
            onCopy={() => handleCopy(phone, 'Phone')}
          />
          <InfoRow 
            label="Date of Birth" 
            value={formatDate(dateOfBirth)}
          />
          <InfoRow 
            label="Marital Status" 
            value={maritalStatus || 'Not specified'}
          />
        </div>
        <div className="pt-3 border-t border-gray-100">
          <h4 className="text-sm font-medium mb-2">Additional Information</h4>
          <div className="space-y-2 text-sm">
            <InfoRow 
              label="Nationality" 
              value="Indian"
            />
            <InfoRow 
              label="Languages" 
              value="English, Hindi"
            />
          </div>
        </div>
      </div>
    </InfoCard>
  );
};
