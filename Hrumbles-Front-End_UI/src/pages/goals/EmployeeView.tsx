
import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import EmployeeList from "@/components/goals/employee/EmployeeList";
import EmployeeGoalDashboard from "@/components/goals/employee/EmployeeGoalDashboard";
import { Employee } from "@/types/goal";
import { ArrowLeft, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const EmployeeView = () => {
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  const handleEmployeeSelect = (employee: Employee) => {
    console.log("Selected employee:", employee);
    setSelectedEmployee(employee);
  };

  const handleBackToEmployees = () => {
    setSelectedEmployee(null);
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {selectedEmployee 
              ? `${selectedEmployee.name}'s Dashboard` 
              : "Employee Goals Dashboard"}
          </h1>
          <p className="text-gray-600">
            {selectedEmployee
              ? `View and update goals for ${selectedEmployee.name}`
              : "Select an employee to view their goals"}
          </p>
        </div>
        <div className="flex gap-4">
          {selectedEmployee && (
            <Button 
              variant="outline" 
              onClick={handleBackToEmployees}
              className="flex items-center gap-2"
            >
              <ArrowLeft size={16} />
              Back to Employees
            </Button>
          )}
          <Button asChild variant="outline">
            <Link to="/" className="flex items-center gap-2">
              <ArrowLeft size={16} />
              Back to Admin Dashboard
            </Link>
          </Button>
        </div>
      </div>

      {selectedEmployee ? (
        <EmployeeGoalDashboard employee={selectedEmployee} />
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
