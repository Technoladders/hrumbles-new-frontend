
import React, { useState, useRef } from "react";
import { DashboardLayout } from "@/components/employee/layout/DashboardLayout";
import { FormContainer } from "@/components/employee/layout/FormContainer";
import { FormContent } from "@/components/employee/forms/FormContent";
import { DashboardView } from "@/components/employee/dashboard/DashboardView";
import { useEmployeeForm } from "@/hooks/useEmployeeForm";
import { calculateProgress, getProgressMessage } from "@/utils/progressCalculator";

const Index = () => {
  const [showForm, setShowForm] = useState(false);
  const {
    activeTab,
    formProgress,
    formData,
    isFormCompleted,
    updateSectionProgress,
    updateFormData,
    handleTabChange,
    handleSaveAndNext,
  } = useEmployeeForm();
  const formRef = useRef<HTMLFormElement | null>(null);

  const tabs = [
    { id: "personal", label: "Personal Details", isActive: activeTab === "personal" },
    { id: "education", label: "Education & Experience", isActive: activeTab === "education" },
    { id: "bank", label: "Bank Account Details", isActive: activeTab === "bank" },
  ];

  const progress = calculateProgress(formProgress);
  const progressMessage = getProgressMessage(formProgress);

  const handleAddEmployee = () => {
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
  };

  const handleFormComplete = () => {
    setShowForm(false);
  };

  return (
    <>
      {showForm ? (
        <>
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Add New Employee</h1>
            <button
              onClick={handleFormClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
          </div>
          <FormContainer
            tabs={tabs}
            onTabChange={handleTabChange}
            onSaveAndNext={handleSaveAndNext}
            activeTab={activeTab}
            formRef = {formRef}
          >
            <FormContent
              activeTab={activeTab}
              formData={formData}
              updateSectionProgress={updateSectionProgress}
              updateFormData={updateFormData}
              handleSaveAndNext={handleSaveAndNext}
              formRef = {formRef}
            />
          </FormContainer>
        </>
      ) : (
        <DashboardView onAddEmployee={handleAddEmployee} />
      )}
    </>
  );
};

export default Index;
