
import React, { useState, useEffect } from "react";
import { AlertCircle } from "lucide-react";
import { AddExperienceModal } from "./AddExperienceModal";
import { toast } from "sonner";
import { Experience, ExperienceFormProps } from "./types";
import { ExperienceCard } from "./experience/ExperienceCard";
import { DeleteConfirmationDialog } from "./experience/DeleteConfirmationDialog";

export const ExperienceForm: React.FC<ExperienceFormProps> = ({ onComplete, experiences = [] }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedExperience, setSelectedExperience] = useState<Experience | null>(null);
  const [experiencesList, setExperiencesList] = useState<Experience[]>(experiences);
  const [showError, setShowError] = useState(false);

  useEffect(() => {
    const isComplete = experiencesList.length > 0;
    if (!isComplete && showError) {
      toast.error("At least one experience record is required");
    }
    onComplete(isComplete, experiencesList);
  }, [experiencesList, onComplete, showError]);

  const handleAddExperience = async (data: Experience): Promise<void> => {
    try {
      setExperiencesList((prev) => {
        let newList;
        if (selectedExperience) {
          newList = prev.map((exp) =>
            exp.id === selectedExperience.id ? { ...data, id: exp.id } : exp
          );
          toast.success("Experience updated successfully");
        } else {
          const newExperience: Experience = {
            ...data,
            id: Date.now().toString(),
          };
          newList = [...prev, newExperience];
          toast.success("Experience added successfully");
        }
        return newList;
      });
      
      setSelectedExperience(null);
      setIsModalOpen(false);
      setShowError(false);
    } catch (error) {
      console.error("Error handling experience:", error);
      toast.error(
        selectedExperience
          ? "Failed to update experience"
          : "Failed to add experience"
      );
      throw error;
    }
  };

  const handleEdit = (experience: Experience) => {
    setSelectedExperience(experience);
    setIsModalOpen(true);
  };

  const handleDelete = (experience: Experience) => {
    if (experiencesList.length === 1) {
      toast.error("At least one experience record is required");
      return;
    }
    setSelectedExperience(experience);
    setIsDeleteDialogOpen(true);
  };

  const handleViewDocument = (docType: keyof Pick<Experience, 'offerLetter' | 'separationLetter' | 'payslips'>) => {
    // Handle document viewing
    console.log('Viewing document:', docType);
  };

  const handleDownloadDocument = (docType: keyof Pick<Experience, 'offerLetter' | 'separationLetter' | 'payslips'>) => {
    // Handle document downloading
    console.log('Downloading document:', docType);
  };

  const confirmDelete = () => {
    if (selectedExperience) {
      setExperiencesList((prev) => 
        prev.filter((exp) => exp.id !== selectedExperience.id)
      );
      toast.success("Experience deleted successfully");
      setIsDeleteDialogOpen(false);
      setSelectedExperience(null);
    }
  };

  return (
    <div className="flex w-full flex-col mt-[30px] px-4">
      <div className="text-[rgba(48,64,159,1)] text-sm font-bold">
        Experience
      </div>
      <div className="text-[rgba(80,80,80,1)] text-xs font-medium mt-1">
        Add your previous working experience and internship details.
      </div>

      {experiencesList.map((experience) => (
        <ExperienceCard
          key={experience.id}
          experience={experience}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onViewDocument={handleViewDocument}
          onDownloadDocument={handleDownloadDocument}
        />
      ))}

      {showError && experiencesList.length === 0 && (
        <div className="text-[#DD0101] text-xs mt-2 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          <span>At least one experience record is required</span>
        </div>
      )}

      <button
        onClick={() => {
          setSelectedExperience(null);
          setIsModalOpen(true);
        }}
        className="flex items-stretch gap-2 text-sm text-[rgba(221,1,1,1)] font-medium mt-3.5"
      >
        <img
          loading="lazy"
          src="https://cdn.builder.io/api/v1/image/assets/94b97c43fd3a409f8a2658d3c3f998e3/94ba00a354d444e81c8d49b7bd51add7537c14e2c575d31fbdfae2aad48e7d91?placeholderIfAbsent=true"
          className="aspect-[1] object-contain w-4 shrink-0"
          alt="Add icon"
        />
        Add Experience
      </button>

      <AddExperienceModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedExperience(null);
        }}
        onSave={handleAddExperience}
        initialData={selectedExperience}
      />

      <DeleteConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => {
          setIsDeleteDialogOpen(false);
          setSelectedExperience(null);
        }}
        onConfirm={confirmDelete}
      />
    </div>
  );
};
