// src/components/global/DetailedResourceView.tsx

import { FC, useState, useEffect } from 'react';
import { useParams, useSearchParams, Link as RouterLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../integrations/supabase/client';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Loader from '@/components/ui/Loader';
import { Search, ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react';
import moment from 'moment';

interface DetailedResourceViewProps {
  resourceType: 'users' | 'talent';
}

const CONFIG = {
  users: {
    title: 'User Management',
    rpcFunction: 'get_paginated_organization_users',
    columns: [
      { header: 'Name', accessor: 'name' },
      { header: 'Email', accessor: 'email' },
      { header: 'Role', accessor: 'role_name' },
      { header: 'Status', accessor: 'status' },
      { header: 'Last Login', accessor: 'last_login' },
    ],
  },
  talent: {
    title: 'Talent Pool',
    rpcFunction: 'get_paginated_organization_talent',
    columns: [
      { header: 'Candidate Name', accessor: 'candidate_name' },
      { header: 'Email', accessor: 'email' },
      { header: 'Suggested Title', accessor: 'suggested_title' },
      { header: 'Date Added', accessor: 'created_at' },
    ],
  }
};

const DetailedResourceView: FC<DetailedResourceViewProps> = ({ resourceType }) => {
  const { organizationId } = useParams<{ organizationId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "");
  const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get("page") || "1", 10));
  const itemsPerPage = 20;

  const { title, rpcFunction, columns } = CONFIG[resourceType];

  useEffect(() => {
    const params = new URLSearchParams();
    if (searchTerm) params.set("search", searchTerm);
    if (currentPage !== 1) params.set("page", currentPage.toString());
    setSearchParams(params, { replace: true });
  }, [searchTerm, currentPage, setSearchParams]);

  const { data, isLoading } = useQuery({
    queryKey: [resourceType, organizationId, currentPage, searchTerm],
    queryFn: async () => {
      if (!organizationId) return null;
      const { data, error } = await supabase.rpc(rpcFunction, {
        org_id: organizationId,
        page_num: currentPage,
        page_size: itemsPerPage,
        search_term: searchTerm,
      });
      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });

  const totalPages = Math.ceil((data?.total_count || 0) / itemsPerPage);

  const getStatusBadge = (status: string) => {
    const colorSchemes = {
      active: "bg-green-100 text-green-800",
      inactive: "bg-yellow-100 text-yellow-800",
      terminated: "bg-red-100 text-red-800",
    };
    return <Badge className={colorSchemes[status as keyof typeof colorSchemes] || 'bg-gray-100'}>{status?.toUpperCase()}</Badge>;
  };
  
  const renderCell = (item: any, accessor: string) => {
    const value = item[accessor];
    if (accessor === 'status') return getStatusBadge(value);
    if (accessor.includes('created_at') || accessor.includes('last_login')) {
      return value ? moment(value).format("DD MMM YYYY, h:mm A") : <span className="text-gray-400">Never</span>;
    }
    return value || <span className="text-gray-400">N/A</span>;
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 md:p-8 space-y-6">
      <div className="max-w-9xl mx-auto">
        <RouterLink to={`/organization/${organizationId}`} className="inline-flex items-center text-sm font-medium text-gray-600 hover:text-gray-900 mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Organization Dashboard
        </RouterLink>
        <h1 className="text-3xl font-bold text-gray-800 tracking-tight">{title}</h1>
        
        <div className="relative mt-6">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <Input
                placeholder="Search..."
                className="pl-10 h-10"
                value={searchTerm}
                onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                }}
            />
        </div>
        
        {isLoading ? (
            <div className="flex items-center justify-center h-96"><Loader size={50} /></div>
        ) : (
            <>
                <div className="bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm mt-4">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    {columns.map(col => <th key={col.accessor} scope="col" className="table-header-cell">{col.header}</th>)}
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {data?.data?.map((item: any) => (
                                    <tr key={item.id} className="hover:bg-gray-50 transition">
                                        {columns.map(col => <td key={col.accessor} className="table-cell">{renderCell(item, col.accessor)}</td>)}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {data?.data?.length === 0 && <p className="text-center text-sm text-gray-500 pt-8">No results found.</p>}

                {/* --- PAGINATION --- */}
                {totalPages > 1 && (
                     <div className="flex justify-between items-center mt-4">
                        <span className="text-sm text-gray-600">Total: {data.total_count}</span>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1}><ChevronLeft className="h-4 w-4" /></Button>
                            <span className="text-sm font-medium">Page {currentPage} of {totalPages}</span>
                            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}><ChevronRight className="h-4 w-4" /></Button>
                        </div>
                    </div>
                )}
            </>
        )}
      </div>
    </div>
  );
};

export default DetailedResourceView;