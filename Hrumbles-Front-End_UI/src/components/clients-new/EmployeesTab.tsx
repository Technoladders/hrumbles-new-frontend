import React, { useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Employee, SortConfig } from './ClientTypes';
import { ArrowUpDown, ChevronDown, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface EmployeesTabProps {
  employees: Employee[];
  loading: boolean;
}

// Interface updated to reflect the main row's aggregated data
interface GroupedEmployee {
  id: string;
  employee_name: string;
  total_salary_cost_inr: number;
  total_revenue_inr: number;
  total_profit_inr: number;
  assignments: Employee[]; 
}


const EmployeesTab: React.FC<EmployeesTabProps> = ({ employees, loading }) => {
  const [sortConfig, setSortConfig] = useState<SortConfig<GroupedEmployee>>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const formatCurrency = (amount: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(amount);

  const getStatusBadgeColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "working": return "bg-green-100 text-green-800 border-green-200";
      case "relieved": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "terminated": return "bg-red-100 text-red-800 border-red-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const handleSort = (key: keyof GroupedEmployee) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') direction = 'descending';
    setSortConfig({ key, direction });
  };
  
  const toggleRow = (employeeId: string) => {
    const newExpandedRows = new Set(expandedRows);
    if (newExpandedRows.has(employeeId)) {
      newExpandedRows.delete(employeeId);
    } else {
      newExpandedRows.add(employeeId);
    }
    setExpandedRows(newExpandedRows);
  };

  const groupedEmployees = useMemo((): GroupedEmployee[] => {
    const groups: { [key: string]: GroupedEmployee } = {};
    employees.forEach(assignment => {
      if (!groups[assignment.id]) {
        groups[assignment.id] = {
          id: assignment.id,
          employee_name: assignment.employee_name,
          total_salary_cost_inr: 0,
          total_revenue_inr: 0,
          total_profit_inr: 0,
          assignments: [],
        };
      }
      const assignmentSalaryCost = assignment.actual_revenue_inr - assignment.actual_profit_inr;
      groups[assignment.id].assignments.push(assignment);
      groups[assignment.id].total_revenue_inr += assignment.actual_revenue_inr;
      groups[assignment.id].total_profit_inr += assignment.actual_profit_inr;
      groups[assignment.id].total_salary_cost_inr += assignmentSalaryCost;
    });
    return Object.values(groups);
  }, [employees]);

  const sortedEmployees = useMemo(() => {
    let sortableItems = [...groupedEmployees];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        const aVal = a[sortConfig.key] || '';
        const bVal = b[sortConfig.key] || '';
        if (aVal < bVal) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [groupedEmployees, sortConfig]);

  if (loading) return <div className="mt-6 space-y-2"><Skeleton className="h-10 w-full" /><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div>
  
  const formatBilling = (amount: number, type: string, currency: string): string => {
    const symbol = currency === 'USD' ? '$' : '₹';
    const term = type === "Hourly" ? "/hr" : type === "Monthly" ? "/month" : "/year";
    return `${symbol}${amount.toLocaleString('en-IN')}${term}`;
  };

  console.log('employees', employees)

  // Helper component for rendering salary with the refined conditional tooltip
  const SalaryCell = ({ amount, type, currency }: { amount: number; type: string; currency: string; }) => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span>{formatBilling(amount, type, currency)}</span>
        </TooltipTrigger>
        {currency === 'USD' && (
          <TooltipContent>
            <p>{`${formatBilling(amount * 84, type, 'INR')}`}</p>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );

  return (
    <div className="mt-6">
       <div className="rounded-md border max-h-[600px] overflow-auto">
        <table className="min-w-full divide-y divide-gray-200">
  <thead className="bg-gray-50 sticky top-0 z-10">
    <tr>
      {/* MODIFIED: Adjusted column widths */}
      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase w-1/4">
        <div className="flex items-center gap-1 cursor-pointer" onClick={() => handleSort('employee_name')}>Name <ArrowUpDown size={14}/></div>
      </th>
      {/* NEW: Added Status header */}
      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
          <div className="flex items-center gap-1 cursor-pointer" onClick={() => handleSort('total_salary_cost_inr')}>Total Salary Cost (INR) <ArrowUpDown size={14}/></div>
      </th>
      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
          <div className="flex items-center gap-1 cursor-pointer" onClick={() => handleSort('total_revenue_inr')}>Total Revenue (INR) <ArrowUpDown size={14}/></div>
      </th>
      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
          <div className="flex items-center gap-1 cursor-pointer" onClick={() => handleSort('total_profit_inr')}>Total Profit (INR) <ArrowUpDown size={14}/></div>
      </th>
    </tr>
  </thead>
  <tbody className="bg-white divide-y divide-gray-200">
    {sortedEmployees.length > 0 ? sortedEmployees.map(employee => (
      <React.Fragment key={employee.id}>
        {/* --- MAIN EMPLOYEE ROW --- */}
        <tr className="hover:bg-gray-50 font-medium">
            <td className="px-6 py-4 whitespace-nowrap text-sm">
              <div className="flex items-center">
                {employee.assignments.length > 0 ? (
                  <button onClick={() => toggleRow(employee.id)} className="mr-2 p-1 rounded-full hover:bg-gray-200">
                    {expandedRows.has(employee.id) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </button>
                ) : (
                  <span className="inline-block w-8" /> 
                )}
                {employee.employee_name}
              </div>
            </td>
            {/* NEW: Aggregated status badges for the main row */}
            <td className="px-6 py-4 whitespace-nowrap text-sm">
              {/* <div className="flex flex-wrap gap-1">
                {[...new Set(employee.assignments.map(a => a.status))].map(status => (
                  <Badge key={status} variant="outline" className={`capitalize text-xs ${getStatusBadgeColor(status)}`}>
                    {status}
                  </Badge>
                ))}
              </div> */}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm">{formatCurrency(employee.total_salary_cost_inr)}</td>
            <td className="px-6 py-4 whitespace-nowrap text-sm">{formatCurrency(employee.total_revenue_inr)}</td>
            <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold ${employee.total_profit_inr >= 0 ? "text-green-600" : "text-red-600"}`}>{formatCurrency(employee.total_profit_inr)}</td>
        </tr>

        {/* --- NESTED PROJECT ROWS --- */}
        {expandedRows.has(employee.id) && employee.assignments.length > 0 && employee.assignments.map(assignment => (
          <tr key={assignment.project_id} className="bg-purple-50 hover:bg-purple-100">
            <td className="pl-16 pr-6 py-3 whitespace-nowrap text-sm text-gray-700">{assignment.project_name}</td>
            {/* NEW: Specific status for the nested project row */}
            <td className="px-6 py-3 whitespace-nowrap text-sm">
              <Badge variant="outline" className={`capitalize text-xs ${getStatusBadgeColor(assignment.status)}`}>
                {assignment.status}
              </Badge>
            </td>
            <td className="px-6 py-3 pl-10 whitespace-nowrap text-sm text-gray-500">
                <SalaryCell amount={assignment.salary} type={assignment.salary_type} currency={assignment.salary_currency} />
            </td>
            <td className="px-6 py-3 pl-10 whitespace-nowrap text-sm text-gray-700">{formatCurrency(assignment.actual_revenue_inr)}</td>
            <td className={`px-6 py-3 pl-10 whitespace-nowrap text-sm font-medium ${assignment.actual_profit_inr >= 0 ? "text-green-600" : "text-red-600"}`}>{formatCurrency(assignment.actual_profit_inr)}</td>
          </tr>
        ))}
      </React.Fragment>
    )) : (
       
        <tr><td colSpan={5} className="text-center py-10 text-gray-500">No employees found for the selected period.</td></tr>
    )}
  </tbody>
</table>
       </div>
    </div>
  );
};

export default EmployeesTab;