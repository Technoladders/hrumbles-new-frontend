import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import EmployeeList from "@/components/goals/employee/EmployeeList";
import EmployeeGoalDashboard from "@/components/goals/employee/EmployeeGoalDashboard";
import { Employee } from "@/types/goal";
import { ArrowLeft, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const EmployeeView = () => {
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const user = useSelector((state: any) => state.auth.user);
  const organizationId = useSelector((state: any) => state.auth.organization_id);
  const userRole = useSelector((state: any) => state.auth.role);
  const isEmployee = userRole === 'employee';

  // Fetch employee data for logged-in user
  useEffect(() => {
    const fetchEmployeeData = async () => {
      if (!user) {
        setError("No user is logged in.");
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const { data, error } = await supabase
          .from("hr_employees")
          .select(`
            id,
            first_name,
            last_name,
            email,
            position,
            profile_picture_url,
            role_id,
            department_id,
            hr_roles (name),
            hr_departments (name)
          `)
          .eq("id", user.id)
          .eq("organization_id", organizationId)
          .single();

        if (error) {
          console.error("Error fetching employee data:", error);
          setError("Failed to load employee data.");
          return;
        }

        if (data) {
          const roleName = data.hr_roles?.name;
          const isEmployee = roleName === "employee";
          if (isEmployee) {
            const employee: Employee = {
              id: data.id,
              name: `${data.first_name} ${data.last_name}`,
              email: data.email,
              position: data.position || "Unknown",
              department: data.hr_departments?.name || "Unknown",
              avatar: data.profile_picture_url || null,
            };
            console.log("Fetched employee:", employee);
            setSelectedEmployee(employee);
          }
        } else {
          setError("Employee data not found.");
        }
      } catch (err) {
        console.error("Unexpected error:", err);
        setError("An unexpected error occurred.");
      } finally {
        setLoading(false);
      }
    };

    fetchEmployeeData();
  }, [user]);

  const handleEmployeeSelect = (employee: Employee) => {
    console.log("Selected employee:", employee);
    setSelectedEmployee(employee);
  };

  const handleBackToEmployees = () => {
    setSelectedEmployee(null);
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card>
          <CardHeader>
            <CardTitle>Loading...</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Loading employee data...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card>
          <CardHeader>
            <CardTitle>Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-600">{error}</p>
            <Button asChild variant="outline" className="mt-4">
              <Link to="/">Back to Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {selectedEmployee 
              ? `${selectedEmployee.name}'s Goals` 
              : "Employee Goals Dashboard"}
          </h1>
          <p className="text-gray-600">
            {selectedEmployee
              ? `View and update goals for ${selectedEmployee.name}`
              : "Select an employee to view their goals"}
          </p>
        </div>
        {!isEmployee && (
          <div className="flex gap-4">
            {selectedEmployee && !(user && user.user_metadata?.role === "employee") && (
              <Button 
                variant="outline" 
                onClick={handleBackToEmployees}
                className="flex items-center gap-2"
              >
                <ArrowLeft size={16} />
                Back to Employees
              </Button>
            )}
            {user && user.user_metadata?.role !== "employee" && (
              <Button asChild variant="outline">
                <Link to="/goals" className="flex items-center gap-2">
                  <ArrowLeft size={16} />
                  Back to Goal Dashboard
                </Link>
              </Button>
            )}
          </div>
        )}
      </div>

      {selectedEmployee ? (
        <div className="space-y-6">
          <EmployeeGoalDashboard employee={selectedEmployee} />
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users size={20} />
              Select an Employee
            </CardTitle>
            <CardDescription>
              Choose an employee to view and update their assigned goals
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EmployeeList onEmployeeSelect={handleEmployeeSelect} />
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default EmployeeView;