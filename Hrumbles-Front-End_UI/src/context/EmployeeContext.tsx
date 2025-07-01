
import React, { createContext, useState, useContext } from 'react';
import { Employee } from '@/types/time-tracker-types';

interface EmployeeContextType {
  employees: Employee[];
  selectedEmployee: Employee | null;
  setSelectedEmployee: (employee: Employee) => void;
  setEmployees: (employees: Employee[]) => void;
}

const EmployeeContext = createContext<EmployeeContextType | undefined>(undefined);

export const EmployeeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  return (
    <EmployeeContext.Provider value={{ 
      employees, 
      selectedEmployee, 
      setSelectedEmployee,
      setEmployees 
    }}>
      {children}
    </EmployeeContext.Provider>
  );
};

export const useEmployeeContext = () => {
  const context = useContext(EmployeeContext);
  if (context === undefined) {
    throw new Error('useEmployeeContext must be used within an EmployeeProvider');
  }
  return context;
};
