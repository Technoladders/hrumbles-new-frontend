import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { DashboardLayout } from "@/components/employee/layout/DashboardLayout";
import { ArrowLeft } from "lucide-react";
import { useEmployeeData } from "@/hooks/useEmployeeData";
import { ProfileHeader } from "@/components/employee/profile/ProfileHeader";
import { StatsBar } from "@/components/employee/profile/StatsBar";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { QuickActions } from "@/components/employee/profile/QuickActions";
import { LoadingState, ErrorState } from "@/components/employee/profile/ProfileStates";
import { EmploymentDetailsModal } from "@/components/employee/profile/modals/EmploymentDetailsModal";
import { PersonalInfoSection } from "@/components/employee/profile/sections/PersonalInfoSection";
import { EmploymentInfoSection } from "@/components/employee/profile/sections/EmploymentInfoSection";
import { EducationSection } from "@/components/employee/profile/sections/EducationSection";
import { BankInfoSection } from "@/components/employee/profile/sections/BankInfoSection";
import { MetricsSection } from "@/components/employee/profile/sections/MetricsSection";

const HomePage = () => {
  const user = useSelector((state: any) => state.auth.user);
  const id = user?.id; // Ensure the user ID is available
  const navigate = useNavigate();
  const { isLoading, employeeData, error, fetchEmployeeData, updateEmployee } = useEmployeeData(id);
  const [isEmploymentModalOpen, setIsEmploymentModalOpen] = useState(false);

  useEffect(() => {
    if (id) {
      fetchEmployeeData();
    }
  }, [id, fetchEmployeeData]);

  const handleEdit = (section: string) => {
    if (section === "employment") {
      setIsEmploymentModalOpen(true);
    } else {
      toast.info(`Editing ${section} details`);
    }
  };

  const handleUpdateEmployment = async (data: any) => {
    try {
      await updateEmployee("employment", data);
      await fetchEmployeeData();
    } catch (error) {
      throw error;
    }
  };

  const calculateYearsOfExperience = (joinedDate: string) => {
    const joined = new Date(joinedDate);
    const now = new Date();
    const years = now.getFullYear() - joined.getFullYear();
    const months = now.getMonth() - joined.getMonth();
    return months < 0 ? `${years - 1} years` : `${years} years`;
  };

  if (!id) {
    return <ErrorState message="No Employee Selected" onReturn={() => navigate("/")} />;
  }

  if (isLoading) {
    return <LoadingState />;
  }

  if (error || !employeeData) {
    return <ErrorState message={error || "Employee Not Found"} onReturn={() => navigate("/")} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-200 p-8">

     

     

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-6">
       
        <MetricsSection employeeId={employeeData.id} />
      </div>

      <EmploymentDetailsModal
        isOpen={isEmploymentModalOpen}
        onClose={() => setIsEmploymentModalOpen(false)}
        employeeId={employeeData?.id || ""}
        initialData={{
          employeeId: employeeData?.employee_id || "",
          department: "Engineering",
          position: "Software Engineer",
          joinedDate: employeeData?.created_at || "",
          employmentHistory: [
            {
              title: "Senior Developer",
              date: "Jan 2023",
              description: "Promoted to Senior Developer role",
              type: "promotion",
            },
            {
              title: "Developer",
              date: "Jan 2022",
              description: "Joined as Developer",
              type: "join",
            },
          ],
        }}
        onUpdate={handleUpdateEmployment}
      />
    </div>
  );
};

export default HomePage;
