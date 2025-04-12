
import React from "react";
import { Button } from "@/components/ui/button";

interface FormActionsProps {
  onClose: () => void;
  isSubmitting: boolean;
}

export const FormActions: React.FC<FormActionsProps> = ({
  onClose,
  isSubmitting,
}) => {
  return (
    <div className="flex justify-end gap-4">
      <Button
        type="button"
        onClick={onClose}
        className="bg-[rgba(221,1,1,0.1)] text-[rgba(221,1,1,1)]"
        disabled={isSubmitting}
      >
        Cancel
      </Button>
      <Button
        type="submit"
        className="bg-[rgba(221,1,1,1)]"
        disabled={isSubmitting}
      >
        {isSubmitting ? "Saving..." : "Save"}
      </Button>
    </div>
  );
};
