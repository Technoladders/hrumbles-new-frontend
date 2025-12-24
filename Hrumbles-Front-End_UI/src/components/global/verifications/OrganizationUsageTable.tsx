import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ExternalLink, Search, ChevronLeft, ChevronRight, CheckCircle2, XCircle } from 'lucide-react';

interface OrgStat {
  id: string;
  name: string;
  usage: number;
  successfulCount: number;
  failedCount: number;
  successRate: number;
  cost: number;
  unitPrice: number;
  priceNotFound: number;
}

interface OrganizationUsageTableProps {
  data: OrgStat[];
  verificationType: string;
  sourceFilter: string;
}

const OrganizationUsageTable: React.FC<OrganizationUsageTableProps> = ({ data, verificationType, sourceFilter }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const filteredData = useMemo(() => {
    return data.filter(item =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase())
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
        <CardTitle className="text-xl font-semibold text-gray-800">All Organizations Report</CardTitle>
        <div className="relative w-full md:w-64 mt-2 md:mt-0">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <Input
            placeholder="Search organizations..."
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
                <TableHead className="py-3 px-6 text-slate-600">Organization</TableHead>
                <TableHead className="py-3 px-6 text-slate-600">Success Price</TableHead>
                <TableHead className="py-3 px-6 text-slate-600">Failure Price</TableHead>
                <TableHead className="py-3 px-6 text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span>Successful</span>
                  </div>
                </TableHead>
                <TableHead className="py-3 px-6 text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <XCircle className="h-4 w-4 text-red-600" />
                    <span>Failed</span>
                  </div>
                </TableHead>
                <TableHead className="py-3 px-6 text-slate-600">Total Usage</TableHead>
                <TableHead className="py-3 px-6 text-slate-600">Success Rate</TableHead>
                <TableHead className="py-3 px-6 text-slate-600">Billed Cost</TableHead>
                <TableHead className="py-3 px-6 text-slate-600 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.length > 0 ? paginatedData.map(org => (
                <TableRow key={org.id} className="hover:bg-slate-50/50 border-b">
                  <TableCell className="font-semibold text-gray-700 px-6 py-4">{org.name}</TableCell>
                  
                  {/* Success Price */}
                  <TableCell className="px-6 py-4 text-gray-600">
                    {(org.unitPrice || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                  </TableCell>

                  {/* Failure Price */}
                  <TableCell className="px-6 py-4 text-gray-600">
                    {(org.priceNotFound || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                  </TableCell>

                  {/* Successful Count - Green styling */}
                  <TableCell className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-700 border border-green-200">
                        {org.successfulCount.toLocaleString()}
                      </span>
                    </div>
                  </TableCell>

                  {/* Failed Count - Red styling */}
                  <TableCell className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-red-100 text-red-700 border border-red-200">
                        {org.failedCount.toLocaleString()}
                      </span>
                    </div>
                  </TableCell>

                  {/* UPDATED: Total Usage - Just the number, no breakdown */}
                  <TableCell className="px-6 py-4 font-semibold text-gray-700">
                    {org.usage.toLocaleString()}
                  </TableCell>

                  <TableCell className="px-6 py-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      org.successRate >= 80 ? 'bg-green-100 text-green-700' :
                      org.successRate >= 50 ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>     
                      {org.successRate.toFixed(1)}%
                    </span>
                  </TableCell>
                  <TableCell className="px-6 py-4 text-gray-600">{org.cost.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</TableCell>
                  <TableCell className="text-right px-6 py-4">
                    <Button asChild variant="ghost" size="sm" className="text-indigo-600 hover:text-indigo-700">
                      <Link to={`/verifications/${verificationType}/${org.id}?source=${sourceFilter}`}>
                        View Logs <ExternalLink className="h-4 w-4 ml-1.5" />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow><TableCell colSpan={9} className="text-center h-24 text-gray-500">No organizations found for this period.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
      {totalPages > 1 && (
        <div className="p-4 border-t flex justify-between items-center bg-slate-50">
            <span className="text-sm text-gray-600">Page {currentPage} of {totalPages}</span>
            <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1}><ChevronLeft className="h-4 w-4" /> Previous</Button>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages}>Next <ChevronRight className="h-4 w-4" /></Button>
            </div>
        </div>
      )}
    </Card>
  );
};

export default OrganizationUsageTable;