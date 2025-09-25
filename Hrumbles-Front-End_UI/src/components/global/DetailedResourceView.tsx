// src/components/global/DetailedResourceView.tsx

import { FC, useState, useEffect } from 'react';
import { useParams, useSearchParams, Link as RouterLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../integrations/supabase/client';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Loader from '@/components/ui/Loader';
import { Search, ChevronLeft, ChevronRight, ArrowLeft, BriefcaseBusiness, Building2  } from 'lucide-react';
import moment from 'moment';

interface DetailedResourceViewProps {
  resourceType: 'users' | 'talent'  | 'jobs' | 'clients';
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
      { header: 'Login History', accessor: 'login_history',
        customRender: true 
      },
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
  },

  // NEW: Configuration for 'jobs'
  jobs: {
    title: 'Job Postings',
    rpcFunction: 'get_paginated_organization_jobs', // You will create this RPC function
    columns: [
      { header: 'Job ID', accessor: 'job_id' },
      { header: 'Title', accessor: 'title' },
      { header: 'Department', accessor: 'department' },
      { header: 'Location', accessor: 'location' }, // Will need custom render for array
      { header: 'Job Type', accessor: 'job_type' },
      { header: 'Status', accessor: 'status' },
      { header: 'Posted Date', accessor: 'posted_date' },
      { header: 'Applications', accessor: 'applications' },
      // Add other relevant job columns from your hr_jobs table
    ],
  },
  // NEW: Configuration for 'clients'
  clients: {
    title: 'Client Management',
    rpcFunction: 'get_paginated_organization_clients', // You will create this RPC function
    columns: [
      { header: 'Client Name', accessor: 'name' }, // Assuming a 'name' column in hr_clients
      { header: 'Email', accessor: 'email' },     // Assuming an 'email' column
      { header: 'Contact Person', accessor: 'contact_person' }, // Assuming a 'contact_person'
      { header: 'Status', accessor: 'status' }, // Assuming a 'status' column
      { header: 'Date Added', accessor: 'created_at' },
      // Add other relevant client columns from your hr_clients table
    ],
  },

};




const DetailedResourceView: FC<DetailedResourceViewProps> = ({ resourceType }) => {
  const { organizationId } = useParams<{ organizationId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "");
  const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get("page") || "1", 10));
  const itemsPerPage = 20;
  

  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [currentHistoryUser, setCurrentHistoryUser] = useState<{ id: string; name: string } | null>(null);
  const [userFullLoginHistory, setUserFullLoginHistory] = useState<any[]>([]);
  const [isFetchingHistory, setIsFetchingHistory] = useState(false);


  const { title, rpcFunction, columns } = CONFIG[resourceType];

  useEffect(() => {
    const params = new URLSearchParams();
    if (searchTerm) params.set("search", searchTerm);
    if (currentPage !== 1) params.set("page", currentPage.toString());
    setSearchParams(params, { replace: true });
  }, [searchTerm, currentPage, setSearchParams]);

  const { data, isLoading, refetch } = useQuery({
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


  const fetchAndShowUserLoginHistory = async (userId: string, userName: string) => {
    setCurrentHistoryUser({ id: userId, name: userName });
    setShowHistoryModal(true);
    setIsFetchingHistory(true);
    setUserFullLoginHistory([]); // Clear previous history

    try {
      // Assuming user_activity_logs is your detailed table for all events
      const { data, error } = await supabase
        .from('user_activity_logs')
        .select('timestamp, ip_address, city, country, event_type, device_info') // Select relevant fields
        .eq('user_id', userId)
        .eq('event_type', 'login') // Filter only successful login events
        .order('timestamp', { ascending: false }); // Newest first

      if (error) throw error;

      setUserFullLoginHistory(data || []);
    } catch (error: any) {
      console.error("Error fetching full login history:", error.message);
      // Optionally, set an error message in the modal state to display to the user
    } finally {
      setIsFetchingHistory(false);
    }
  };

  const handleCloseHistoryModal = () => {
    setShowHistoryModal(false);
    setCurrentHistoryUser(null);
    setUserFullLoginHistory([]);
  };



    const renderCell = (item: any, accessor: string, isCustomRender: boolean | undefined, userName: string) => {
    const value = item[accessor];
    if (accessor === 'status') return getStatusBadge(value);
    
    // Check if the accessor is for a standard date/time column that's not login_history
    if ((accessor.includes('created_at') || accessor.includes('last_login')) && accessor !== 'login_history') {
      return value ? moment(value).format("DD MMM YYYY, h:mm A") : <span className="text-gray-400">Never</span>;
    }

           // --- MODIFIED: Handle login_history accessor ---
    if (accessor === 'login_history' && isCustomRender) { // <-- Changed columnAccessor to accessor
      const hasHistory = Array.isArray(value) && value.length > 0;
      return (
        <div className="flex items-center gap-2">
          {hasHistory ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchAndShowUserLoginHistory(item.id, userName)}
              className="text-xs px-2 py-1"
            >
              View History
            </Button>
          ) : (
            <span className="text-gray-400 text-sm">No history</span>
          )}
        </div>
      );
    }
    // --- END MODIFIED ---
    if (accessor === 'location' && Array.isArray(value)) {
        return value.length > 0 ? value.join(', ') : <span className="text-gray-400">N/A</span>;
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
                                       {columns.map(col => (
                                          <td key={col.accessor} className="table-cell">
                                            {renderCell(item, col.accessor, col.customRender, item.name)}
                                          </td>
                                        ))}
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

        {/* --- NEW: LOGIN HISTORY MODAL --- */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-800">Login History for {currentHistoryUser?.name}</h2>
              <Button variant="ghost" size="sm" onClick={handleCloseHistoryModal}>
                &times;
              </Button>
            </div>
            <div className="p-6">
              {isFetchingHistory ? (
                <div className="flex items-center justify-center h-24"><Loader size={30} /></div>
              ) : userFullLoginHistory.length > 0 ? (
                <div className="space-y-3">
                  {userFullLoginHistory.map((log, index) => (
                    <div key={index} className="border border-gray-200 rounded-md p-3 text-sm bg-gray-50">
                      <p><strong>Time:</strong> {moment(log.timestamp).format("DD MMM YYYY, h:mm A")}</p>
                      <p><strong>IP Address:</strong> {log.ip_address || 'N/A'}</p>
                      <p><strong>Location:</strong> {log.city && log.country ? `${log.city}, ${log.country}` : 'N/A'}</p>
                      {log.device_info && <p className="truncate"><strong>Device:</strong> {log.device_info}</p>}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500">No detailed login history found.</p>
              )}
            </div>
            <div className="p-4 border-t border-gray-200 flex justify-end">
              <Button onClick={handleCloseHistoryModal}>Close</Button>
            </div>
          </div>
        </div>
      )}
      {/* --- END NEW MODAL --- */}


    </div>
  );
};

export default DetailedResourceView;