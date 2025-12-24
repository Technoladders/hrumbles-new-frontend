import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ExternalLink, Search, ChevronLeft, ChevronRight } from 'lucide-react';

interface TypeStat {
  key: string;
  title: string;
  color: string;
  usage: number;
  successfulCount: number;
  failedCount: number;
  successRate: number;
  cost: number;
}

interface VerificationTypeTableProps {
  data: TypeStat[];
  sourceFilter: string;
  organizationFilter?: string;
  organizationName?: string;
}

const VerificationTypeTable: React.FC<VerificationTypeTableProps> = ({ 
  data, 
  sourceFilter, 
  organizationFilter,
  organizationName 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const filteredData = useMemo(() => {
    return data.filter(item =>
      item.title.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [data, searchTerm]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredData, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  return (
    <Card className="shadow-xl border-none bg-white overflow-hidden transition-all duration-300 hover:shadow-2xl rounded-2xl">
      <CardHeader className="p-4 border-b flex flex-col md:flex-row justify-between items-center">
        <div>
          <CardTitle className="text-xl font-semibold text-gray-800">
            Performance by Verification Type
          </CardTitle>
          {organizationFilter && organizationFilter !== 'all' && organizationName && (
            <p className="text-sm text-gray-500 mt-1">
              Showing results for <span className="font-semibold text-indigo-600">{organizationName}</span>
            </p>
          )}
        </div>
        <div className="relative w-full md:w-64 mt-2 md:mt-0">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <Input
            placeholder="Search verification types..."
            className="pl-10 h-9"
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
          />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 hover:bg-slate-100">
                <TableHead className="py-3 px-6 text-slate-600">Verification Type</TableHead>
                <TableHead className="py-3 px-6 text-slate-600">Total Usage</TableHead>
                <TableHead className="py-3 px-6 text-slate-600">Successful</TableHead>
                <TableHead className="py-3 px-6 text-slate-600">Failed</TableHead>
                <TableHead className="py-3 px-6 text-slate-600">Success Rate</TableHead>
                <TableHead className="py-3 px-6 text-slate-600">Total Cost</TableHead>
                <TableHead className="py-3 px-6 text-slate-600 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.length > 0 ? paginatedData.map(type => (
                <TableRow key={type.key} className="hover:bg-slate-50/50 border-b">
                  <TableCell className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: type.color }}
                      />
                      <span className="font-semibold text-gray-700">{type.title}</span>
                    </div>
                  </TableCell>
                  
                  <TableCell className="px-6 py-4 font-semibold text-gray-700">
                    {type.usage.toLocaleString()}
                  </TableCell>

                  <TableCell className="px-6 py-4">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-700 border border-green-200">
                      {type.successfulCount.toLocaleString()}
                    </span>
                  </TableCell>

                  <TableCell className="px-6 py-4">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-red-100 text-red-700 border border-red-200">
                      {type.failedCount.toLocaleString()}
                    </span>
                  </TableCell>

                  <TableCell className="px-6 py-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      type.successRate >= 80 ? 'bg-green-100 text-green-700' :
                      type.successRate >= 50 ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>     
                      {type.successRate.toFixed(1)}%
                    </span>
                  </TableCell>

                  <TableCell className="px-6 py-4 text-gray-600">
                    {type.cost.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                  </TableCell>

                  <TableCell className="text-right px-6 py-4">
                    <Button asChild variant="ghost" size="sm" className="text-indigo-600 hover:text-indigo-700">
                      <Link 
                        to={organizationFilter && organizationFilter !== 'all'
                          ? `/verifications/${type.key}/${organizationFilter}?source=${sourceFilter}`
                          : `/verifications/${type.key}?source=${sourceFilter}`
                        }
                      >
                        Analyze <ExternalLink className="h-4 w-4 ml-1.5" />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center h-24 text-gray-500">
                    No verification types found matching your search.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
      {totalPages > 1 && (
        <div className="p-4 border-t flex justify-between items-center bg-slate-50">
            <span className="text-sm text-gray-600">Page {currentPage} of {totalPages}</span>
            <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setCurrentPage(p => p - 1)} 
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" /> Previous
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setCurrentPage(p => p + 1)} 
                  disabled={currentPage === totalPages}
                >
                  Next <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
        </div>
      )}
    </Card>
  );
};

export default VerificationTypeTable;