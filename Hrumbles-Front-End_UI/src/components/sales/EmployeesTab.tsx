import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription as ShadcnCardDescription } from "@/components/ui/dialog";
import { Search, UserPlus } from 'lucide-react';
import EmployeeTable from '@/components/sales/EmployeeTable';
import AddNewCandidateAndAssociationForm from '@/components/sales/AddNewCandidateAndAssociationForm';
import { CandidateDetail } from '@/types/company';

interface EmployeesTabProps {
  employees: CandidateDetail[];
  isLoading: boolean;
  companyId: number;
  companyName: string;
  onEditEmployee: (employee: CandidateDetail) => void;
  onDataUpdate: () => void;
}

const EmployeesTab: React.FC<EmployeesTabProps> = ({ employees, isLoading, companyId, companyName, onEditEmployee, onDataUpdate }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddEmployeeDialogOpen, setIsAddEmployeeDialogOpen] = useState(false);
  
  const filteredEmployees = employees.filter(emp =>
    (emp.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (emp.email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (emp.designation?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <CardTitle>Associated Employees</CardTitle>
          <Button size="sm" onClick={() => setIsAddEmployeeDialogOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" /> Add Association
          </Button>
        </div>
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <Input 
            placeholder="Search employees..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </CardHeader>
      <CardContent>
         {isLoading ? (
          <div className="text-center py-10 text-gray-500">Loading employees...</div>
        ) : (
          <EmployeeTable employees={filteredEmployees} onEdit={onEditEmployee} />
        )}
      </CardContent>

      <Dialog open={isAddEmployeeDialogOpen} onOpenChange={setIsAddEmployeeDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto p-6">
          <DialogHeader>
            <DialogTitle>Add New Candidate & Associate</DialogTitle>
            <ShadcnCardDescription>Create/find candidate and link to {companyName}.</ShadcnCardDescription>
          </DialogHeader>
          <AddNewCandidateAndAssociationForm 
            companyId={companyId} 
            onClose={() => { setIsAddEmployeeDialogOpen(false); onDataUpdate(); }} 
          />
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default EmployeesTab;