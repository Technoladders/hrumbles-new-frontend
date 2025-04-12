
import { useState } from "react";
import { FormProgress, FormData } from "@/utils/progressCalculator";
import { toast } from "sonner";

export const useFormState = () => {
  const [activeTab, setActiveTab] = useState("personal");
  const [formProgress, setFormProgress] = useState<FormProgress>({
    personal: false,
    education: false,
    experience: false,
    bank: false,
  });

  const [formData, setFormData] = useState<FormData>({
    personal: {
      documents: []
    },
    education: null,
    experience: [],
    bank: null,
  });

  const updateSectionProgress = (section: keyof FormProgress, completed: boolean) => {
    console.log(`Updating ${section} progress:`, completed);
    setFormProgress((prev) => ({
      ...prev,
      [section]: completed,
    }));
  };

  const updateFormData = (section: keyof FormData, data: any) => {
    console.log(`Updating ${section} data:`, data);
    setFormData((prev) => ({
      ...prev,
      [section]: data,
    }));
  };

  const handleTabChange = (tabId: string) => {
    const currentTabKey = activeTab as keyof FormProgress;
    if (!formProgress[currentTabKey]) {
      toast.error("Please save the current section before proceeding");
      return;
    }
    setActiveTab(tabId);
  };

  return {
    activeTab,
    formProgress,
    formData,
    updateSectionProgress,
    updateFormData,
    handleTabChange,
    setActiveTab
  };
};
