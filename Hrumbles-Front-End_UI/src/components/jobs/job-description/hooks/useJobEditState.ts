
import { useState } from "react";
import { toast } from "sonner";
import { JobData } from "@/lib/types";
import { updateJob } from "@/services/jobService";

export const useJobEditState = () => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
  const openDrawer = () => setIsDrawerOpen(true);
  const closeDrawer = () => setIsDrawerOpen(false);
  
  const handleJobUpdate = async (id: string, updatedJobData: JobData) => {
    try {
      await updateJob(id, updatedJobData);
      closeDrawer();
      toast.success("Job updated successfully");
    } catch (error) {
      console.error("Failed to update job:", error);
      toast.error("Failed to update job");
    }
  };
  
  return {
    isDrawerOpen,
    openDrawer,
    closeDrawer,
    handleJobUpdate
  };
};
