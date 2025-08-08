import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DateRangePickerField } from '@/components/reports/DateRangePickerField';
import { format, isValid } from 'date-fns';
import { AlertCircle, Search, Download, Calendar, ChevronLeft, ChevronRight, Sigma, TrendingUp, DollarSign, Settings, Building, Tag, User } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import Papa from 'papaparse';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import PricingModal from '@/components/global/verifications/PricingModal'; // We will create this next


// --- Type Definitions ---
interface Verification {
  id: string;
  created_at: string;
  lookup_type: string;
  lookup_value: string;
  response_data: { status: number };
  verified_by: { first_name: string; last_name: string } | null;
  organization: { id: string; name: string } | null;
}

interface Organization {
  id: string;
  name: string;
}

interface Price {
  price: number;
  organization_id: string | null;
}

// --- Report Configuration ---
const reportConfigs = {
  'uan-by-mobile-pan': {
    title: 'UAN by Mobile/PAN Report',
    lookupTypes: ['mobile', 'pan'],
  },
  'basic-uan-history': {
    title: 'Basic UAN History Report',
    lookupTypes: ['uan_full_history'],
  },
};

const COLORS = ['#7B43F1', '#00C49F', '#FFBB28', '#FF8042'];

const GlobalVerificationReportPage: React.FC = () => {
  const { type } = useParams<{ type: string }>();
  const config = reportConfigs[type as keyof typeof reportConfigs];

  const [verifications, setVerifications] = useState<Verification[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [prices, setPrices] = useState<Price[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);

  // Filters
  const [draftDateRange, setDraftDateRange] = useState({
    startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)),
    endDate: new Date(),
    key: 'selection',
  });
  const [appliedDateRange, setAppliedDateRange] = useState(draftDateRange);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [orgFilter, setOrgFilter] = useState('all');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // --- Data Fetching ---
  useEffect(() => {
    if (!config) {
      setError('Invalid report type specified.');
      setIsLoading(false);
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Fetch verifications with organization details
        const { data: verificationData, error: fetchError } = await supabase
          .from('uanlookups')
          .select('*, verified_by:hr_employees(first_name, last_name), organization:hr_organizations(id, name)')
          .in('lookup_type', config.lookupTypes)
          .gte('created_at', appliedDateRange.startDate.toISOString())
          .lte('created_at', appliedDateRange.endDate.toISOString())
          .order('created_at', { ascending: false });
        if (fetchError) throw fetchError;
        setVerifications(verificationData as Verification[]);

        // Fetch all organizations for the filter
        const { data: orgData, error: orgError } = await supabase.from('hr_organizations').select('id, name');
        if (orgError) throw orgError;
        setOrganizations(orgData);

        // Fetch pricing data for this verification type
        const { data: priceData, error: priceError } = await supabase
          .from('verification_pricing')
          .select('price, organization_id')
          .eq('verification_type', type);
        if (priceError) throw priceError;
        setPrices(priceData);

      } catch (err: any) {
        setError(err.message || 'An unknown error occurred.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [type, config, appliedDateRange]);

  const getPriceForOrg = (orgId: string | null): number => {
      if (!orgId) return 0;
      const defaultPrice = prices.find(p => p.organization_id === null)?.price || 0;
      const orgOverride = prices.find(p => p.organization_id === orgId)?.price;
      return orgOverride ?? defaultPrice;
  };


  // --- Memoized Data Transformations ---
  const filteredVerifications = useMemo(() => {
    return verifications
      .filter(v => (orgFilter === 'all' || v.organization?.id === orgFilter))
      .filter(v => {
        const statusName = v.response_data?.status === 1 ? 'Found' : 'Not Found';
        return statusFilter === 'all' || statusName === statusFilter;
      })
      .filter(v => {
        if (!searchTerm) return true;
        const lowerSearch = searchTerm.toLowerCase();
        return (
          v.lookup_value?.toLowerCase().includes(lowerSearch) ||
          v.organization?.name?.toLowerCase().includes(lowerSearch)
        );
      });
  }, [verifications, searchTerm, statusFilter, orgFilter]);

  // --- Summary Metrics ---
  const totalVerifications = filteredVerifications.length;
  const totalCost = useMemo(() => {
      return filteredVerifications.reduce((sum, v) => sum + getPriceForOrg(v.organization?.id ?? null), 0);
  }, [filteredVerifications, prices]);
  const statusChartData = useMemo(() => {
      const grouped = filteredVerifications.reduce((acc, v) => {
          const statusName = v.response_data?.status === 1 ? 'Found' : 'Not Found';
          acc[statusName] = (acc[statusName] || 0) + 1;
          return acc;
      }, {} as Record<string, number>);
      return Object.entries(grouped).map(([name, value]) => ({ name, value }));
  }, [filteredVerifications]);

  // --- Pagination Logic ---
  const totalPages = Math.ceil(filteredVerifications.length / itemsPerPage);
  const paginatedData = filteredVerifications.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // --- Handlers ---
  const handleApplyFilters = () => setAppliedDateRange(draftDateRange);
  const onFilterChange = (setter: React.Dispatch<React.SetStateAction<string>>) => (value: string) => {
      setter(value);
      setCurrentPage(1);
  };
    
  if (!config) {
      return (
          <div className="p-8"><Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>Report configuration not found.</AlertDescription></Alert></div>
      );
  }

  if (isLoading) {
      return <div className="flex h-screen items-center justify-center"><LoadingSpinner size={60} /></div>;
  }
  
  if (error) {
    return <div className="p-8"><Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert></div>;
  }
  
  return (
    <div className="space-y-8 p-4 sm:p-6 lg:p-8">
      <div className="flex justify-between items-start">
        <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">{config.title}</h1>
            <p className="mt-1 text-lg text-gray-600">Global analytics across all organizations.</p>
        </div>
        <Button onClick={() => setIsPricingModalOpen(true)}>
            <Settings className="mr-2 h-4 w-4" /> Manage Pricing
        </Button>
      </div>
      
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="p-6"><div className="flex items-center justify-between"><p className="text-sm font-medium text-gray-500">Total Verifications</p><Sigma size={24} className="text-purple-500" /></div><h3 className="text-2xl font-bold mt-2">{totalVerifications}</h3></CardContent></Card>
        <Card><CardContent className="p-6"><div className="flex items-center justify-between"><p className="text-sm font-medium text-gray-500">Total Cost</p><DollarSign size={24} className="text-green-500" /></div><h3 className="text-2xl font-bold mt-2">{totalCost.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</h3></CardContent></Card>
        <Card><CardContent className="p-6"><div className="flex items-center justify-between"><p className="text-sm font-medium text-gray-500">Success Rate</p><TrendingUp size={24} className="text-blue-500" /></div><h3 className="text-2xl font-bold mt-2">{totalVerifications > 0 ? `${((statusChartData.find(d => d.name === 'Found')?.value || 0) / totalVerifications * 100).toFixed(1)}%` : 'N/A'}</h3></CardContent></Card>
        <Card><CardContent className="h-[300px] p-6"><h4 className="font-semibold text-gray-700 mb-4">Status Breakdown</h4><ResponsiveContainer width="100%" height="90%"><PieChart><Pie data={statusChartData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={5}>{statusChartData.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}</Pie><Tooltip /></PieChart></ResponsiveContainer></CardContent></Card>
      </div>

      {/* Filter Bar and Table */}
       <div className="space-y-6">
            <Card className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-center">
                  <DateRangePickerField dateRange={draftDateRange} onDateRangeChange={setDraftDateRange} />
                  <Select value={orgFilter} onValueChange={onFilterChange(setOrgFilter)}>
                    <SelectTrigger><div className="flex items-center gap-2"><Building size={16} /> <SelectValue placeholder="Filter by Organization" /></div></SelectTrigger>
                    <SelectContent><SelectItem value="all">All Organizations</SelectItem>{organizations.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}</SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={onFilterChange(setStatusFilter)}>
                    <SelectTrigger><div className="flex items-center gap-2"><Tag size={16} /> <SelectValue placeholder="Filter by Status" /></div></SelectTrigger>
                    <SelectContent><SelectItem value="all">All Statuses</SelectItem><SelectItem value="Found">Found</SelectItem><SelectItem value="Not Found">Not Found</SelectItem></SelectContent>
                  </Select>
                  <Button onClick={handleApplyFilters} className="w-full">Apply Filters</Button>
                </div>
                <div className="relative mt-4"><Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} /><Input placeholder="Search by Input or Organization..." className="pl-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
            </Card>

            <div className="rounded-md border"><Table><TableHeader><TableRow><TableHead>Verified On</TableHead><TableHead>Organization</TableHead><TableHead>Input</TableHead><TableHead>Status</TableHead><TableHead>Verified By</TableHead><TableHead>Cost</TableHead></TableRow></TableHeader><TableBody>{paginatedData.length > 0 ? (paginatedData.map(v => (<TableRow key={v.id}><TableCell>{format(new Date(v.created_at), 'PPp')}</TableCell><TableCell>{v.organization?.name || 'N/A'}</TableCell><TableCell><Badge variant="outline">{v.lookup_type}</Badge> {v.lookup_value}</TableCell><TableCell><Badge variant={v.response_data.status === 1 ? 'success' : 'destructive'}>{v.response_data.status === 1 ? 'Found' : 'Not Found'}</Badge></TableCell><TableCell>{v.verified_by ? `${v.verified_by.first_name} ${v.verified_by.last_name}` : 'System'}</TableCell><TableCell>{getPriceForOrg(v.organization?.id ?? null).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</TableCell></TableRow>))) : (<TableRow><TableCell colSpan={6} className="h-24 text-center">No data found matching your criteria.</TableCell></TableRow>)}</TableBody></Table></div>

            {totalPages > 1 && (<div className="flex justify-between items-center mt-4"><span className="text-sm text-gray-600">Showing {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, filteredVerifications.length)} of {filteredVerifications.length}</span><div className="flex items-center gap-2"><Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1}><ChevronLeft className="h-4 w-4" /></Button><span className="text-sm font-medium">Page {currentPage} of {totalPages}</span><Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}><ChevronRight className="h-4 w-4" /></Button></div></div>)}
        </div>

        <PricingModal isOpen={isPricingModalOpen} onClose={() => setIsPricingModalOpen(false)} verificationType={type!} verificationTitle={config.title} />
    </div>
  );
};

export default GlobalVerificationReportPage;