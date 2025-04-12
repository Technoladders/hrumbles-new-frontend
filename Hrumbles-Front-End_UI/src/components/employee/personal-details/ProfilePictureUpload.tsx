
import React, { useState } from "react";
import { UploadField } from "../UploadField";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { uploadDocument } from "@/utils/uploadDocument";
import { toast } from "sonner";
import { Camera, Pencil, Trash2, Loader2 } from "lucide-react";
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

interface ProfilePictureUploadProps {
  value?: string;
  onChange: (url: string) => void;
  onDelete?: () => Promise<void>;
}

export const ProfilePictureUpload: React.FC<ProfilePictureUploadProps> = ({
  value,
  onChange,
  onDelete,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showReplaceDialog, setShowReplaceDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const handleUpload = async (file: File) => {
    if (value) {
      setPendingFile(file);
      setShowReplaceDialog(true);
      return;
    }
    await processUpload(file);
  };

  const processUpload = async (file: File) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please upload a valid image file (JPG, JPEG, or PNG)');
      return;
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast.error('File size should be less than 5MB');
      return;
    }

    setIsUploading(true);
    try {
      const url = await uploadDocument(file, 'profile-pictures', 'profile');
      onChange(url);
      toast.success('Profile picture uploaded successfully');
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      toast.error('Failed to upload profile picture');
    } finally {
      setIsUploading(false);
      setPendingFile(null);
      setShowReplaceDialog(false);
    }
  };

  const handleReplace = async () => {
    if (pendingFile) {
      await processUpload(pendingFile);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    
    setIsDeleting(true);
    try {
      await onDelete();
      setShowDeleteDialog(false);
      toast.success('Profile picture deleted successfully');
    } catch (error) {
      console.error('Error deleting profile picture:', error);
      toast.error('Failed to delete profile picture');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-6 w-full max-w-2xl">
        <div className="relative flex-shrink-0 group">
          <Avatar className="h-24 w-24">
            {value ? (
              <AvatarImage src={value} alt="Profile" />
            ) : (
              <AvatarFallback>
                <Camera className="h-8 w-8 text-gray-400" />
              </AvatarFallback>
            )}
          </Avatar>
          {value && !isDeleting && (
            <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <label className="cursor-pointer p-2 rounded-full hover:bg-white/20 transition-colors">
                <Pencil className="h-5 w-5 text-white" />
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUpload(file);
                  }}
                  disabled={isUploading || isDeleting}
                />
              </label>
              <button
                onClick={() => setShowDeleteDialog(true)}
                className="p-2 rounded-full hover:bg-white/20 transition-colors"
                disabled={isUploading || isDeleting}
              >
                <Trash2 className="h-5 w-5 text-white" />
              </button>
            </div>
          )}
          {(isUploading || isDeleting) && (
            <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center">
              <Loader2 className="h-6 w-6 text-white animate-spin" />
            </div>
          )}
        </div>
        <div className="flex-grow space-y-2">
          <UploadField
            label="Profile Picture"
            onUpload={handleUpload}
            showProgress={true}
            currentFile={value ? { name: 'Profile Picture', type: 'image', url: value } : undefined}
            onRemove={() => setShowDeleteDialog(true)}
            error={undefined}
          />
          <p className="text-xs text-gray-500">
            Accepted formats: JPG, JPEG, PNG (max 5MB)
          </p>
        </div>
      </div>

      <AlertDialog open={showReplaceDialog} onOpenChange={setShowReplaceDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace Profile Picture</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to replace your current profile picture? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingFile(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleReplace}>Replace</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Profile Picture</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete your profile picture? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={() => setShowDeleteDialog(false)}
              disabled={isDeleting}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              className="bg-red-600 hover:bg-red-700"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
