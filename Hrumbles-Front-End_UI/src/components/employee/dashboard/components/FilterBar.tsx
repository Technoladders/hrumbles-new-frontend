
import React from "react";
import { Button } from "@/components/ui/button";
import { 
  Search,
  FileText,
  FileSpreadsheet,
  Download
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Employee } from "@/hooks/useEmployees";
import jsPDF from "jspdf";
import 'jspdf-autotable';
import { saveAs } from "file-saver";
import { toast } from "sonner";

interface FilterBarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  selectedStatus: string;
  onStatusChange: (status: string) => void;
  employees: Employee[];
}

export const FilterBar: React.FC<FilterBarProps> = ({
  searchValue,
  onSearchChange,
  selectedStatus,
  onStatusChange,
  employees
}) => {
  const downloadAsCSV = () => {
    try {
      const headers = ['Employee ID', 'Name', 'Email', 'Gender', 'Blood Group', 'Status'];
      const csvData = employees.map(emp => [
        emp.employee_id,
        `${emp.first_name} ${emp.last_name}`,
        emp.email,
        emp.gender || '-',
        emp.blood_group || '-',
        emp.employment_status || 'active'
      ]);
      
      const csvContent = [
        headers.join(','),
        ...csvData.map(row => row.join(','))
      ].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
      saveAs(blob, 'employees.csv');
      toast.success('CSV file downloaded successfully');
    } catch (error) {
      console.error('Error downloading CSV:', error);
      toast.error('Failed to download CSV file');
    }
  };

  const downloadAsPDF = () => {
    try {
      const doc = new jsPDF();
      
      // Add title
      doc.setFontSize(16);
      doc.text('Employee List', 15, 15);
      
      // Add employee data
      const tableData = employees.map(emp => [
        emp.employee_id,
        `${emp.first_name} ${emp.last_name}`,
        emp.email,
        emp.gender || '-',
        emp.blood_group || '-',
        emp.employment_status || 'active'
      ]);
      
      (doc as any).autoTable({
        head: [['ID', 'Name', 'Email', 'Gender', 'Blood Group', 'Status']],
        body: tableData,
        startY: 25,
      });
      
      doc.save('employees.pdf');
      toast.success('PDF file downloaded successfully');
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error('Failed to download PDF file');
    }
  };

  const handleDownload = (format: 'csv' | 'pdf') => {
    switch (format) {
      case 'csv':
        downloadAsCSV();
        break;
      case 'pdf':
        downloadAsPDF();
        break;
    }
  };

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Select value={selectedStatus} onValueChange={onStatusChange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="terminated">Terminated</SelectItem>
            </SelectContent>
          </Select>
        
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email, or ID..."
              className="pl-10 pr-4 py-2 border rounded-lg text-sm w-64"
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
        </div>

        <div className="ml-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <Download className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleDownload('csv')}>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Download as CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDownload('pdf')}>
                <FileText className="mr-2 h-4 w-4" />
                Download as PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
};
