import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { DashboardLayout } from "@/components/employee/layout/DashboardLayout";
import { ArrowLeft } from "lucide-react";
import { useEmployeeData } from "@/hooks/useEmployeeData";
import { ProfileHeader } from "@/components/employee/profile/ProfileHeader";
import { StatsBar } from "@/components/employee/profile/StatsBar";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase }  from "@/integrations/supabase/client";

import { LoadingState, ErrorState } from "@/components/employee/profile/ProfileStates";

import { MetricsSection } from "@/components/employee/profile/sections/MetricsSection";

const HomePage = () => {
  const dispatch = useDispatch();
  const { role, user } = useSelector((state) => state.auth);
        const organizationId = useSelector((state: any) => state.auth.organization_id);
  
  const id = user?.id; // Ensure the user ID is available
  const navigate = useNavigate();
  const { isLoading, employeeData, error, fetchEmployeeData, updateEmployee } = useEmployeeData(id);
  const [isEmploymentModalOpen, setIsEmploymentModalOpen] = useState(false);
    const [departmentName, setDepartmentName] = useState("Unknown Department");

  useEffect(() => {
    if (id) {
      fetchEmployeeData();
    }
  }, [id, fetchEmployeeData]);

    useEffect(() => {
      const fetchDepartmentName = async () => {
        if (!user?.id) {
          setDepartmentName("Unknown Department");
          return;
        }
  
        try {
          // Step 1: Fetch department_id from hr_employees where id matches user.id
          const { data: employeeData, error: employeeError } = await supabase
            .from("hr_employees")
            .select("department_id")
            .eq("id", user.id)
            .single();
  
          if (employeeError) {
            console.error("Error fetching employee data:", employeeError);
            setDepartmentName("Unknown Department");
            return;
          }
  
          if (!employeeData?.department_id) {
            setDepartmentName("Unknown Department");
            return;
          }
  
          // Step 2: Fetch department name from hr_departments using department_id
          const { data: departmentData, error: departmentError } = await supabase
            .from("hr_departments")
            .select("name")
            .eq("id", employeeData.department_id)
            .single();
  
          if (departmentError) {
            console.error("Error fetching department data:", departmentError);
            setDepartmentName("Unknown Department");
            return;
          }
  
          setDepartmentName(departmentData.name || "Unknown Department");
        } catch (error) {
          console.error("Unexpected error:", error);
          setDepartmentName("Unknown Department");
        }
      };
  
      fetchDepartmentName();
    }, [user?.id]);

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
    <div className="min-h-screen p-8">
      <MetricsSection employeeId={employeeData.id} department={departmentName} role={role} organizationId={organizationId} />
    </div>
  );
};

export default HomePage;