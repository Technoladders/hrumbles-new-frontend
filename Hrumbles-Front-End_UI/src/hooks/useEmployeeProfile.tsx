
import { useState, useCallback, useEffect } from "react";
import { useEmployeeData } from "./useEmployeeData";
import { toast } from "sonner";
import { differenceInMonths, parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

export const useEmployeeProfile = (id: string | undefined) => {
  const { isLoading, employeeData, error, fetchEmployeeData, updateEmployee } = useEmployeeData(id);
  const [isEmploymentModalOpen, setIsEmploymentModalOpen] = useState(false);
  const [isPersonalModalOpen, setIsPersonalModalOpen] = useState(false);
  const [totalExperience, setTotalExperience] = useState("0.0 years");

  const calculateTotalExperience = useCallback(async () => {
    if (!id) return;

    try {
      // Fetch experiences directly from the database
      const { data: experiences, error } = await supabase
        .from('hr_employee_experiences')
        .select('start_date, end_date')
        .eq('employee_id', id)
        .eq('status', 'active');

      if (error) throw error;

      if (!experiences || experiences.length === 0) {
        setTotalExperience("0.0 years");
        return;
      }

      // Sort experiences by start date
      const sortedExperiences = experiences.sort(
        (a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
      );

      let totalMonths = 0;
      let lastEndDate: Date | null = null;

      sortedExperiences.forEach((exp) => {
        if (!exp.start_date) return;
        
        const startDate = new Date(exp.start_date);
        const endDate = exp.end_date ? new Date(exp.end_date) : new Date();

        if (!lastEndDate || startDate > lastEndDate) {
          // Non-overlapping experience
          totalMonths += differenceInMonths(endDate, startDate);
          lastEndDate = endDate;
        } else if (endDate > lastEndDate) {
          // Partially overlapping experience
          totalMonths += differenceInMonths(endDate, lastEndDate);
          lastEndDate = endDate;
        }
      });

      const years = totalMonths / 12;
      setTotalExperience(`${years.toFixed(1)} years`);

    } catch (error) {
      console.error("Error calculating total experience:", error);
      setTotalExperience("Error calculating");
    }
  }, [id]);

  // Subscribe to experience changes
  useEffect(() => {
    if (!id) return;

    calculateTotalExperience();

    const experienceChannel = supabase
      .channel('experience-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'employee_experiences',
          filter: `employee_id=eq.${id}`
        },
        () => {
          console.log('Experience data changed, recalculating...');
          calculateTotalExperience();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(experienceChannel);
    };
  }, [id, calculateTotalExperience]);

  const handleEdit = (section: string) => {
    if (section === "employment") {
      setIsEmploymentModalOpen(true);
    } else if (section === "personal") {
      setIsPersonalModalOpen(true);
    } else {
      toast.info(`Editing ${section} details`);
    }
  };

  const handleUpdateEmployment = async (data: any) => {
    try {
      await updateEmployee("employment", data);
      await fetchEmployeeData();
      setIsEmploymentModalOpen(false);
      toast.success("Employment details updated successfully");
    } catch (error) {
      console.error("Error updating employment details:", error);
      toast.error("Failed to update employment details");
      throw error;
    }
  };

  const handleUpdatePersonal = async (data: any) => {
    try {
      await updateEmployee("personal", data);
      await fetchEmployeeData();
      setIsPersonalModalOpen(false);
      toast.success("Personal details updated successfully");
    } catch (error) {
      console.error("Error updating personal details:", error);
      toast.error("Failed to update personal details");
      throw error;
    }
  };

  const calculateYearsOfExperience = (joinedDate: string) => {
    const joined = new Date(joinedDate);
    const now = new Date();
    const years = now.getFullYear() - joined.getFullYear();
    const months = now.getMonth() - joined.getMonth();
    if (months < 0) {
      return `${years - 1} years`;
    }
    return `${years} years`;
  };

  return {
    isLoading,
    employeeData,
    error,
    isEmploymentModalOpen,
    setIsEmploymentModalOpen,
    isPersonalModalOpen,
    setIsPersonalModalOpen,
    handleEdit,
    handleUpdateEmployment,
    handleUpdatePersonal,
    calculateYearsOfExperience,
    totalExperience,
    fetchEmployeeData
  };
};
