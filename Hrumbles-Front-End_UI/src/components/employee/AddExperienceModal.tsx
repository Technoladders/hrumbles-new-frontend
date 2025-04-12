
import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Experience } from "@/services/types/employee.types";
import { ExperienceFormFields } from "./experience/ExperienceFormFields";
import { ExperienceDocumentUploads } from "./experience/ExperienceDocumentUploads";
import { Button } from "@/components/ui/button";
import { Briefcase, X } from "lucide-react";

interface AddExperienceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Experience) => Promise<void>;
  initialData?: Experience | null;
}

export const AddExperienceModal: React.FC<AddExperienceModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<Partial<Experience>>({
    jobTitle: "",
    company: "",
    location: "",
    employmentType: "Full Time",
    startDate: "",
    endDate: "",
    payslips: [],
  });

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      setFormData({
        jobTitle: "",
        company: "",
        location: "",
        employmentType: "Full Time",
        startDate: "",
        endDate: "",
        payslips: [],
      });
    }
  }, [initialData, isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onSave(formData as Experience);
      onClose();
    } catch (error) {
      console.error("Error saving experience:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileUpload = (field: keyof Experience) => async (file: File): Promise<void> => {
    if (field === 'payslips') {
      setFormData((prev) => ({
        ...prev,
        payslips: [...(prev.payslips || []), file],
      }));
    } else {
      setFormData((prev) => ({ ...prev, [field]: file }));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden bg-white border border-gray-200 shadow-2xl max-h-[90vh] flex flex-col">
        <DialogHeader className="p-3 bg-gradient-to-r from-[#30409F] to-[#4B5FBD] sticky top-0 z-10">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-white" />
              <DialogTitle className="text-sm font-semibold text-white tracking-tight">
                {initialData ? "Edit Experience" : "Add Experience"}
              </DialogTitle>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6 text-white hover:bg-white/20"
              onClick={onClose}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 p-3">
          <ExperienceFormFields
            formData={formData}
            handleInputChange={handleInputChange}
            setFormData={setFormData}
          />

          <ExperienceDocumentUploads
            formData={formData}
            handleFileUpload={handleFileUpload}
          />
        </div>

        <div className="flex justify-end gap-3 p-3 border-t">
          <Button 
            variant="outline" 
            onClick={onClose} 
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting}
          >
            {isSubmitting ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
