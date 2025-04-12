
import React from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

interface DocumentDialogsProps {
  label: string;
  showReplaceDialog: boolean;
  showDeleteDialog: boolean;
  onReplaceDialogChange: (open: boolean) => void;
  onDeleteDialogChange: (open: boolean) => void;
  onReplace: () => void;
  onDelete: () => void;
  onCancelReplace: () => void;
}

export const DocumentDialogs: React.FC<DocumentDialogsProps> = ({
  label,
  showReplaceDialog,
  showDeleteDialog,
  onReplaceDialogChange,
  onDeleteDialogChange,
  onReplace,
  onDelete,
  onCancelReplace,
}) => {
  return (
    <>
      <AlertDialog open={showReplaceDialog} onOpenChange={onReplaceDialogChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to replace the current {label}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={onCancelReplace}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onReplace}>Replace</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={onDeleteDialogChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the {label}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => onDeleteDialogChange(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
