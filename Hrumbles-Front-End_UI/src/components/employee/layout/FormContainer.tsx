import React, { RefObject, useEffect } from "react";
import { TabNavigation } from "../TabNavigation";
import { LoaderCircle } from "lucide-react";
import { toast } from "sonner";

interface FormContainerProps {
  children: React.ReactNode;
  tabs: Array<{ id: string; label: string; isActive?: boolean }>;
  onTabChange: (tabId: string) => void;
  onSaveAndNext: (data: any) => void;
  activeTab: string;
  isSubmitting?: boolean;
  formRef: RefObject<HTMLFormElement>; // 🔥 Accept formRef as a prop
  formData: Record<string, any>;
}

export const FormContainer: React.FC<FormContainerProps> = ({
  children,
  tabs,
  onTabChange,
  onSaveAndNext,
  activeTab,
  isSubmitting = false,
  formRef, // 🔥 Receive formRef
  formData = {},
}) => {

  useEffect(() => {
    console.log("🔍 Debug: Full formData: ", formData);
    console.log("🔍 Debug: Active Tab:", activeTab);
    console.log("🔍 Debug: Data for Active Tab:", formData?.[activeTab]);
  }, [activeTab, formData]);
  
  return (
    <section className="bg-white shadow-sm rounded-lg mt-6 p-6">
      <TabNavigation tabs={tabs} onTabChange={onTabChange} />
      {children}
      <div className="h-px my-6 bg-gray-200" />
      <div className="flex justify-end space-x-4">
      <button
  onClick={async (e) => {
    e.preventDefault();
    if (formRef.current) {
      await formRef.current.requestSubmit(); // ✅ Ensure form submits before fetching data
  
      setTimeout(() => { // 🕒 Delay ensures state updates before reading formData
        console.log("🔍 Debug: Active Tab:", activeTab);
        console.log("🔍 Debug: Full formData:", formData);
        console.log("🔍 Debug: Data for Active Tab:", formData?.[activeTab]);
  
        const latestData = formData?.[activeTab];
  
        if (!latestData || Object.keys(latestData).length === 0) {
          console.warn("⚠️ Warning: No data found for activeTab:", activeTab);
        } else {
          console.log("✅ Submitting with data:", latestData);
          onSaveAndNext(latestData);
        }
      }, 100); // Small delay to ensure state update
    }
  }}
  
  disabled={isSubmitting}
  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
>
  {isSubmitting && <LoaderCircle className="animate-spin h-4 w-4" />}
  {activeTab === "bank" ? "Submit" : "Save & Next"}
</button>

      </div>
    </section>
  );
};
