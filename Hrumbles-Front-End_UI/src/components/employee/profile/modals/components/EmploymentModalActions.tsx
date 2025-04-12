
import React from 'react';
import { Button } from "@/components/ui/button";
import { Edit2, Save, X } from "lucide-react";

interface EmploymentModalActionsProps {
  isEditing: boolean;
  loading: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
  onClose: () => void;
}

export const EmploymentModalActions: React.FC<EmploymentModalActionsProps> = ({
  isEditing,
  loading,
  onEdit,
  onCancel,
  onSave,
  onClose,
}) => {
  if (isEditing) {
    return (
      <>
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          className="h-6 px-2 hover:bg-white/20 text-white"
        >
          <X className="w-3 h-3 mr-1" />
          Cancel
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onSave}
          disabled={loading}
          className="h-6 px-2 hover:bg-white/20 text-white"
        >
          <Save className="w-3 h-3 mr-1" />
          Save
        </Button>
      </>
    );
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={onEdit}
        className="h-6 px-2 hover:bg-white/20 text-white"
      >
        <Edit2 className="w-3 h-3 mr-1" />
        Edit
      </Button>
      <Button 
        variant="ghost" 
        size="icon" 
        className="h-6 w-6 text-white hover:bg-white/20"
        onClick={onClose}
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </>
  );
};
