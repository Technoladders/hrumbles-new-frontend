// Hrumbles-Front-End_UI/src/components/sales/sales-dashboard/EmployeeSelector.tsx
import React from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Users, ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  profile_picture_url?: string;
  hr_roles?: {
    name: string;
  };
}

interface EmployeeSelectorProps {
  employees: Employee[];
  selectedEmployee: string | null;
  onSelect: (employeeId: string | null) => void;
}

export function EmployeeSelector({
  employees,
  selectedEmployee,
  onSelect
}: EmployeeSelectorProps) {
  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

  const selectedMember = selectedEmployee 
    ? employees.find(e => e.id === selectedEmployee)
    : null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="h-9 px-3 bg-gray-50 border-gray-200"
        >
          {selectedMember ? (
            <>
              <Avatar className="h-5 w-5 mr-2">
                <AvatarImage src={selectedMember.profile_picture_url} />
                <AvatarFallback className="text-[9px] bg-blue-100 text-blue-600">
                  {getInitials(selectedMember.first_name, selectedMember.last_name)}
                </AvatarFallback>
              </Avatar>
              <span className="max-w-[100px] truncate">
                {selectedMember.first_name} {selectedMember.last_name}
              </span>
            </>
          ) : (
            <>
              <Users size={14} className="mr-2 text-gray-500" />
              All Team
            </>
          )}
          <ChevronDown size={14} className="ml-2 text-gray-400" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuItem 
          onClick={() => onSelect(null)}
          className={cn(!selectedEmployee && "bg-blue-50")}
        >
          <div className="flex items-center gap-2 flex-1">
            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
              <Users size={14} className="text-gray-500" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">All Team Members</p>
              <p className="text-xs text-gray-500">{employees.length} members</p>
            </div>
            {!selectedEmployee && <Check size={14} className="text-blue-600" />}
          </div>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <div className="max-h-64 overflow-y-auto">
          {employees.map((employee) => (
            <DropdownMenuItem 
              key={employee.id}
              onClick={() => onSelect(employee.id)}
              className={cn(selectedEmployee === employee.id && "bg-blue-50")}
            >
              <div className="flex items-center gap-2 flex-1">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={employee.profile_picture_url} />
                  <AvatarFallback className="text-xs bg-gray-100">
                    {getInitials(employee.first_name, employee.last_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {employee.first_name} {employee.last_name}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{employee.email}</p>
                </div>
                {selectedEmployee === employee.id && (
                  <Check size={14} className="text-blue-600 shrink-0" />
                )}
              </div>
            </DropdownMenuItem>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default EmployeeSelector;