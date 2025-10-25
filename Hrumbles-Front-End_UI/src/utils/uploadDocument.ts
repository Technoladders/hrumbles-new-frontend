import { supabase } from "@/integrations/supabase/client";

/**
 * Uploads a file to a specified Supabase Storage bucket.
 *
 * @param file The file object to upload.
 * @param bucketName The name of the Supabase Storage bucket.
 * @param filePath The full desired path for the file within the bucket (e.g., 'documents/user-id/myfile.pdf').
 * @returns A promise that resolves to the public URL of the uploaded file.
 */
export const uploadDocument = async (
  file: File,
  bucketName: string,
  filePath: string // CHANGED: Parameter renamed from 'type' to 'filePath' for clarity and correctness.
): Promise<string> => {
  try {
    // CHANGED: Validation now checks for 'filePath' and provides a more descriptive error.
    if (!file || !bucketName || !filePath) {
      throw new Error(
        "Missing required fields for upload: file, bucketName, and filePath are required."
      );
    }

    // REMOVED: The internal filePath construction is no longer needed because the form component now provides the full path.
    // const oldFilePath = `${type}/${Date.now()}_${file.name}`;

    console.log("Uploading document to path:", { filePath, bucketName });

    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, file, { // This now correctly uses the full filePath provided.
        cacheControl: "3600",
        upsert: false, // Prevent overwriting existing files.
      });

    if (error) {
      console.error("Supabase upload error:", error);
      throw error;
    }

    console.log("Supabase upload response:", data);

    // Get the public URL of the uploaded file.
    const { data: publicUrlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    if (!publicUrlData) {
      throw new Error("Could not retrieve public URL for the uploaded file.");
    }

    console.log("Public file URL:", publicUrlData.publicUrl);
    return publicUrlData.publicUrl;
    
  } catch (error) {
    // This will catch any error from the try block and log it.
    console.error("An error occurred in uploadDocument:", error);
    // Re-throw the error so the calling function in your form can handle it (e.g., show a toast).
    throw error;
  }
};