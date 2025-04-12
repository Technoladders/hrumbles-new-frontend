
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Experience } from "@/services/types/employee.types";
import { ExperienceCard } from "../experience/ExperienceCard";
import { AddExperienceModal } from "../AddExperienceModal";
import { DeleteConfirmationDialog } from "../experience/DeleteConfirmationDialog";
import { experienceService } from "@/services/employee/experience.service";
import { toast } from "sonner";
import { DocumentViewerDialog } from "../education/DocumentViewerDialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ExperienceSectionProps {
  data: Experience[];
  employeeId: string;
  onUpdate: () => void;
}

export const ExperienceSection: React.FC<ExperienceSectionProps> = ({
  data = [],
  employeeId,
  onUpdate,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedExperience, setSelectedExperience] = useState<Experience | null>(null);
  const [viewingDocument, setViewingDocument] = useState<{ url: string; type: string } | null>(null);

  const handleEdit = (experience: Experience) => {
    setSelectedExperience(experience);
    setIsModalOpen(true);
  };

  const handleDelete = (experience: Experience) => {
    setSelectedExperience(experience);
    setIsDeleteDialogOpen(true);
  };

  const getDocumentUrl = (docType: keyof Pick<Experience, 'offerLetter' | 'separationLetter' | 'payslips'>, experience: Experience): string | null => {
    const doc = docType === 'payslips' ? experience.payslips?.[0] : experience[docType];
    if (!doc) return null;
    if (typeof doc === 'string') return doc;
    return null;
  };

  const handleViewDocument = (docType: keyof Pick<Experience, 'offerLetter' | 'separationLetter' | 'payslips'>, experience: Experience) => {
    const documentUrl = getDocumentUrl(docType, experience);
    if (!documentUrl) {
      toast.error("Document not available");
      return;
    }
    setViewingDocument({
      url: documentUrl,
      type: docType
    });
  };

  const handleDownloadDocument = async (docType: keyof Pick<Experience, 'offerLetter' | 'separationLetter' | 'payslips'>, experience: Experience) => {
    try {
      const documentUrl = getDocumentUrl(docType, experience);
      if (!documentUrl) {
        toast.error("Document not available");
        return;
      }

      const response = await fetch(documentUrl);
      if (!response.ok) {
        throw new Error('Download failed');
      }
      
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `${docType}_${experience.company}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      toast.success("Document downloaded successfully");
    } catch (error) {
      console.error("Error downloading document:", error);
      toast.error("Failed to download document");
    }
  };

  const handleSave = async (formData: Experience) => {
    try {
      if (selectedExperience) {
        await experienceService.updateExperience(employeeId, selectedExperience.id, formData);
        toast.success('Experience updated successfully');
      } else {
        await experienceService.createExperience(employeeId, formData);
        toast.success('Experience added successfully');
      }
      onUpdate();
      setIsModalOpen(false);
      setSelectedExperience(null);
    } catch (error) {
      console.error('Error saving experience:', error);
      toast.error(selectedExperience ? 'Failed to update experience' : 'Failed to add experience');
    }
  };

  const handleConfirmDelete = async () => {
    if (selectedExperience) {
      try {
        await experienceService.deleteExperience(employeeId, selectedExperience.id);
        toast.success('Experience deleted successfully');
        onUpdate();
        setIsDeleteDialogOpen(false);
        setSelectedExperience(null);
      } catch (error) {
        console.error('Error deleting experience:', error);
        toast.error('Failed to delete experience');
      }
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-sm h-[280px]">
      <div className="flex justify-between items-center mb-4 sticky top-0 bg-white">
        <h2 className="text-lg font-semibold text-[#30409F]">Experience</h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setSelectedExperience(null);
            setIsModalOpen(true);
          }}
          className="h-8 w-8 rounded-full hover:bg-gray-100/80 transition-colors"
        >
          <Plus className="h-4 w-4 text-[#30409F]" />
        </Button>
      </div>

      <ScrollArea className="h-[200px] pr-4">
        <div className="space-y-1">
          {(data || []).map((experience) => (
            <ExperienceCard
              key={experience.id}
              experience={experience}
              onEdit={() => handleEdit(experience)}
              onDelete={() => handleDelete(experience)}
              onViewDocument={(docType) => handleViewDocument(docType, experience)}
              onDownloadDocument={(docType) => handleDownloadDocument(docType, experience)}
            />
          ))}
          
          {(!data || data.length === 0) && (
            <div className="text-center py-8 text-gray-500">
              No experience records found. Click the plus icon to add your work history.
            </div>
          )}
        </div>
      </ScrollArea>

      <AddExperienceModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedExperience(null);
        }}
        onSave={handleSave}
        initialData={selectedExperience}
      />

      <DeleteConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => {
          setIsDeleteDialogOpen(false);
          setSelectedExperience(null);
        }}
        onConfirm={handleConfirmDelete}
      />

      <DocumentViewerDialog
        isOpen={!!viewingDocument}
        onClose={() => setViewingDocument(null)}
        documentUrl={viewingDocument?.url || ""}
        documentType={viewingDocument?.type || ""}
      />
    </div>
  );
};
