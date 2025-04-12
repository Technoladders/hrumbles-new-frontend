import { supabase } from "@/integrations/supabase/client";

export const uploadDocument = async (
  file: File,
  bucketName: string,
  type: string
): Promise<string> => {
  try {
    if (!file || !bucketName || !type) {
      throw new Error("Missing required fields for upload");
    }

    const filePath = `${type}/${Date.now()}_${file.name}`; // Unique file name
    console.log("Uploading document:", { filePath, bucketName });

    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false, // Prevent overwriting
      });

    if (error) {
      console.error("Upload error:", error);
      throw error;
    }

    console.log("Upload response:", data);

    // Get the public URL of the uploaded file
    const { data: publicUrlData, error: urlError } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    if (urlError) {
      console.error("Public URL error:", urlError);
      throw urlError;
    }

    console.log("Public file URL:", publicUrlData.publicUrl);
    return publicUrlData.publicUrl;
  } catch (error) {
    console.error("Upload document error:", error);
    throw error;
  }
};
