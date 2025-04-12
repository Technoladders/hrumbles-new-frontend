
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getEmployees } from "@/lib/supabaseData";
import { Employee } from "@/types/goal";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface EmployeeListProps {
  onEmployeeSelect: (employee: Employee) => void;
}

const EmployeeList: React.FC<EmployeeListProps> = ({ onEmployeeSelect }) => {
  const [searchQuery, setSearchQuery] = useState("");
  
  const { data: employees, isLoading, error } = useQuery({
    queryKey: ["employees"],
    queryFn: getEmployees,
  });

  const filteredEmployees = employees?.filter(employee => 
    employee.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    employee.position.toLowerCase().includes(searchQuery.toLowerCase()) ||
    employee.department.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500">Error loading employees. Please try again later.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
        <Input
          placeholder="Search employees..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>
      
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <Card key={index} className="p-4 cursor-not-allowed">
              <div className="flex items-center space-x-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[120px]" />
                  <Skeleton className="h-3 w-[80px]" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : filteredEmployees.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">
            {searchQuery ? "No employees matching your search" : "No employees found"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredEmployees.map((employee) => (
            <Card
              key={employee.id}
              className="p-4 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => onEmployeeSelect(employee)}
            >
              <div className="flex items-center space-x-4">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={employee.avatar} alt={employee.name} />
                  <AvatarFallback>
                    {employee.name.split(" ").map((n) => n[0]).join("")}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-medium text-base">{employee.name}</h3>
                  <p className="text-sm text-gray-500">{employee.position}</p>
                  <span className="inline-block mt-1 text-xs px-2 py-1 bg-gray-100 rounded-full">
                    {employee.department}
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default EmployeeList;
