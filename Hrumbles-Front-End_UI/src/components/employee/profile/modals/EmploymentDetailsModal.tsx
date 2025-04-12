
import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Briefcase, Calendar, ChevronRight, X } from "lucide-react";
import { TimelineEvent } from "./components/TimelineEvent";
import { EmploymentForm } from "./components/EmploymentForm";
import { supabase } from "@/integrations/supabase/client";

interface TimelineEventType {
  title: string;
  date: string;
  description: string;
  type: 'promotion' | 'join' | 'role-change';
}

interface EmploymentDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string;
  initialData: {
    employeeId: string;
    department: string;
    position: string;
    joinedDate: string;
    employmentHistory: TimelineEventType[];
  };
  onUpdate: (data: any) => Promise<void>;
}

export const EmploymentDetailsModal: React.FC<EmploymentDetailsModalProps> = ({
  isOpen,
  onClose,
  employeeId,
  initialData,
  onUpdate,
}) => {
  const [formData, setFormData] = useState(initialData);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFieldChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!formData.department.trim() || !formData.position.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      setIsSubmitting(true);

      const { error: updateError } = await supabase
        .from('hr_employees')
        .update({
          department: formData.department,
          position: formData.position,
          employment_start_date: formData.joinedDate || new Date().toISOString()
        })
        .eq('id', employeeId);

      if (updateError) throw updateError;

      await onUpdate({
        department: formData.department,
        position: formData.position,
        joinedDate: formData.joinedDate
      });

      toast.success("Employment details updated successfully");
      onClose();
    } catch (error: any) {
      console.error("Error updating employment details:", error);
      toast.error(error.message || "Failed to update employment details");
    } finally {
      setIsSubmitting(false);
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
                Edit Employment Details
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

        <div className="overflow-y-auto flex-1">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 p-3">
            {/* Left Panel - Main Information */}
            <div className="space-y-3">
              <div className="bg-white/50 rounded-lg p-3 backdrop-blur-sm border border-white/20 transition-all duration-300 hover:shadow-lg">
                <h3 className="text-sm font-semibold mb-2 text-gray-800">Basic Information</h3>
                <EmploymentForm
                  formData={formData}
                  onChange={handleFieldChange}
                />
              </div>

              <div className="bg-white/50 rounded-lg p-3 backdrop-blur-sm border border-white/20 transition-all duration-300 hover:shadow-lg">
                <h3 className="text-sm font-semibold mb-2 text-gray-800">Documents</h3>
                <div className="space-y-1.5">
                  <Button variant="outline" className="w-full h-6 text-[11px] justify-start">
                    <Calendar className="w-3 h-3 mr-1" />
                    Offer Letter
                    <ChevronRight className="w-3 h-3 ml-auto" />
                  </Button>
                  <Button variant="outline" className="w-full h-6 text-[11px] justify-start">
                    <Calendar className="w-3 h-3 mr-1" />
                    Contract Document
                    <ChevronRight className="w-3 h-3 ml-auto" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Right Panel - Timeline */}
            <div className="bg-white/50 rounded-lg p-3 backdrop-blur-sm border border-white/20">
              <h3 className="text-sm font-semibold mb-3 text-gray-800">Career Timeline</h3>
              <div className="space-y-4">
                {formData.employmentHistory.map((event, index) => (
                  <TimelineEvent
                    key={index}
                    {...event}
                    isLast={index === formData.employmentHistory.length - 1}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 p-3 border-t">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
