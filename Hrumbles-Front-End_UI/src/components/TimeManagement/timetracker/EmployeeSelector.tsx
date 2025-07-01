
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Employee } from "@/types/time-tracker-types";

interface EmployeeSelectorProps {
  employees: Employee[];
  selectedEmployee: string;
  setSelectedEmployee: (id: string) => void;
  disabled?: boolean;
  className?: string;
}

export const EmployeeSelector: React.FC<EmployeeSelectorProps> = ({
  employees,
  selectedEmployee,
  setSelectedEmployee,
  disabled = false,
  className
}) => {

  console.log("employees: ", employees)
  return (
    <Select disabled={disabled} onValueChange={setSelectedEmployee} value={selectedEmployee}>
      <SelectTrigger className={className}>
        <SelectValue placeholder="Select Employee" />
      </SelectTrigger>
      <SelectContent>
        {employees.map((employee) => (
          <SelectItem key={employee.id} value={employee.id} data-has-projects={employee.has_projects}>
            {employee.first_name} {employee.last_name} ({employee?.hr_departments?.name})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
