
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ProfileImageUploadProps {
  value?: string;
  onChange: (url: string) => void;
  initialLetter?: string;
}

const ProfileImageUpload = ({ value, onChange, initialLetter = "U" }: ProfileImageUploadProps) => {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      
      if (!event.target.files || event.target.files.length === 0) {
        return;
      }
      
      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `profile-images/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('employee-documents')
        .upload(filePath, file);
        
      if (uploadError) {
        throw uploadError;
      }
      
      const { data } = supabase.storage
        .from('employee-documents')
        .getPublicUrl(filePath);
        
      onChange(data.publicUrl);
      toast.success("Profile image uploaded successfully");
      
    } catch (error: any) {
      toast.error(`Error uploading profile image: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <Avatar className="w-32 h-32 border-2 border-gray-200">
        <AvatarImage src={value} />
        <AvatarFallback className="text-4xl">{initialLetter}</AvatarFallback>
      </Avatar>
      
      <div className="flex flex-col gap-2 items-center">
        <Button 
          variant="outline" 
          disabled={uploading}
          onClick={() => document.getElementById('profile-upload')?.click()}
        >
          {uploading ? "Uploading..." : "Change Profile Picture"}
        </Button>
        <input
          id="profile-upload"
          type="file"
          accept="image/*"
          onChange={handleUpload}
          className="hidden"
        />
        {value && (
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => onChange("")}
            className="text-red-500 hover:text-red-700"
          >
            Remove
          </Button>
        )}
      </div>
    </div>
  );
};

export default ProfileImageUpload;
