// src/components/clients-new/EmployeesTab.tsx
import React, { useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Employee, SortConfig } from './ClientTypes';
import { ArrowUpDown } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface EmployeesTabProps {
  employees: Employee[];
  loading: boolean;
}

const EmployeesTab: React.FC<EmployeesTabProps> = ({ employees, loading }) => {
  const [sortConfig, setSortConfig] = useState<SortConfig<Employee>>(null);

  const formatCurrency = (amount: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(amount);

  const handleSort = (key: keyof Employee) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') direction = 'descending';
    setSortConfig({ key, direction });
  };
  
  const sortedEmployees = useMemo(() => {
    let sortableItems = [...employees];
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
  }, [employees, sortConfig]);

  if (loading) return <div className="mt-6 space-y-2"><Skeleton className="h-10 w-full" /><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div>
  
  const formatBilling = (amount: number, type: string, currency: string): string => {
    const symbol = currency === 'USD' ? '$' : '₹';
    const term = type === "Hourly" ? "/hr" : type === "Monthly" ? "/month" : "/year";
    return `${symbol}${amount.toLocaleString('en-IN')}${term}`;
  };

  return (
    <div className="mt-6">
       <div className="rounded-md border max-h-[600px] overflow-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 sticky top-0 z-10">
             <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase"><div className="flex items-center gap-1 cursor-pointer" onClick={() => handleSort('employee_name')}>Name <ArrowUpDown size={14}/></div></th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase"><div className="flex items-center gap-1 cursor-pointer" onClick={() => handleSort('project_name')}>Project <ArrowUpDown size={14}/></div></th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Salary</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client Billing</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actual Revenue (INR)</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actual Profit (INR)</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedEmployees.length > 0 ? sortedEmployees.map(e => (
               <tr key={e.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{e.employee_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{e.project_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <TooltipProvider><Tooltip><TooltipTrigger><span>{formatBilling(e.salary, e.salary_type, e.salary_currency)}</span></TooltipTrigger>
                            <TooltipContent><p>{`Equivalent to ${formatCurrency( (e.salary_currency === 'USD' ? e.salary * 84 : e.salary) * (e.salary_type === 'Monthly' ? 12 : e.salary_type === 'Hourly' ? 2016 : 1) )}/year`}</p></TooltipContent>
                        </Tooltip></TooltipProvider>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{formatBilling(e.client_billing, e.billing_type, e.currency)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{formatCurrency(e.actual_revenue_inr)}</td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${e.actual_profit_inr >= 0 ? "text-green-600" : "text-red-600"}`}>{formatCurrency(e.actual_profit_inr)}</td>
               </tr>
            )) : (
                <tr><td colSpan={6} className="text-center py-10 text-gray-500">No employees found for the selected period.</td></tr>
            )}
          </tbody>
        </table>
       </div>
    </div>
  );
};

export default EmployeesTab;