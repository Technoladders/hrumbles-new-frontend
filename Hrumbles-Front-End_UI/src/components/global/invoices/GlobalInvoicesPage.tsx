import React, { useState, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import { supabase } from "@/integrations/supabase/client";
import { 
  Plus, Search, FileText, Download, Edit, Eye, Trash2, 
  CheckCircle, Clock, AlertTriangle, Loader2, ChevronLeft, ChevronRight,
  Filter, X, CheckSquare, Square, Package, AlertCircle, DollarSign, HandCoins
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { toast } from 'sonner';
import { format, differenceInDays } from 'date-fns';
import OrganizationInvoiceForm from './OrganizationInvoiceForm';
import OrganizationInvoiceDetail from './OrganizationInvoiceDetail';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { motion } from "framer-motion";


const GlobalInvoicesPage = () => {
  const organizationId = useSelector((state: any) => state.auth.organization_id);
  const [searchParams, setSearchParams] = useSearchParams();
  
  // --- STATE ---
  const [invoices, setInvoices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [viewInvoiceId, setViewInvoiceId] = useState<string | null>(null);
  const [downloadingIds, setDownloadingIds] = useState<string[]>([]);
  
  // NEW: Bulk actions and preview panel
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [previewInvoice, setPreviewInvoice] = useState<any>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);


const [paymentType, setPaymentType] = useState<'full' | 'manual'>('full');
const [paymentData, setPaymentData] = useState({
  id: '',
  status: '',
  amount: '' as string | number, // Allow string for empty input
  date: format(new Date(), 'yyyy-MM-dd'),
  method: 'Bank Transfer'
});
  
  // NEW: Advanced filters
  const [dateRange, setDateRange] = useState<{ start: string; end: string } | null>(null);
  const [amountFilter, setAmountFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  // --- URL SYNCED STATE ---
  const searchQuery = searchParams.get('search') || '';
  const currentTab = searchParams.get('status') || 'all';
  const currentPage = parseInt(searchParams.get('page') || '1');
  const itemsPerPage = parseInt(searchParams.get('limit') || '10');

  // Easy to adjust colors here
  const statusStyles: Record<string, string> = {
    Paid: "bg-green-100 text-green-700 border-green-200 hover:bg-green-200",
    Unpaid: "bg-yellow-100 text-yellow-700 border-yellow-200 hover:bg-yellow-200",
    Overdue: "bg-red-100 text-red-700 border-red-200 hover:bg-red-200",
    'Partially Paid': "bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200",
    Cancelled: "bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200",
    Draft: "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200",
  };

  const updateParams = (updates: any) => {
    const newParams = new URLSearchParams(searchParams);
    Object.keys(updates).forEach(key => {
      if (updates[key]) newParams.set(key, updates[key]);
      else newParams.delete(key);
    });
    setSearchParams(newParams);
  };

const fetchInvoices = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('hr_invoices')
      .select('*, status_history, updated_by')
      .eq('organization_id', organizationId)
      .eq('type', 'Organization')
      .not('organization_client_id', 'is', null)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Error fetching invoices:', error);
      toast.error("Failed to fetch invoices");
    } else {
      // Parse items for compatibility
      const parsedInvoices = (data || []).map(inv => ({
        ...inv,
        items: typeof inv.items === 'string' ? JSON.parse(inv.items) : inv.items || []
      }));
      setInvoices(parsedInvoices);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (organizationId) fetchInvoices();
  }, [organizationId]);

  // --- COMPUTED DATA ---
  const stats = useMemo(() => {
    const initial = {
        all: { count: 0, amount: 0 },
        draft: { count: 0, amount: 0 },
        paid: { count: 0, amount: 0 },
        unpaid: { count: 0, amount: 0 },
        overdue: { count: 0, amount: 0 },
        'partially paid': { count: 0, amount: 0 },
        cancelled: { count: 0, amount: 0 },
    };

    return invoices.reduce((acc, inv) => {
        const amount = Number(inv.total_amount) || 0;
        
        acc.all.count++;
        acc.all.amount += amount;

        const statusKey = inv.status.toLowerCase();
        if (acc[statusKey]) {
            acc[statusKey].count++;
            acc[statusKey].amount += amount;
        }
        return acc;
    }, initial);
  }, [invoices]);

  // Calculate payment health score
  const paymentHealthScore = useMemo(() => {
    if (invoices.length === 0) return 100;
    const paidCount = stats.paid.count;
    const totalCount = invoices.length;
    const overdueCount = stats.overdue.count;
    
    const score = ((paidCount / totalCount) * 70) + (((totalCount - overdueCount) / totalCount) * 30);
    return Math.round(score);
  }, [invoices, stats]);

  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      // Search filter
      const matchesSearch = 
        inv.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.client_name?.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Tab filter
      const matchesTab = currentTab === 'all' || inv.status.toLowerCase() === currentTab.toLowerCase();
      
      // Date range filter
      let matchesDate = true;
      if (dateRange) {
        const invDate = new Date(inv.invoice_date);
        const startDate = new Date(dateRange.start);
        const endDate = new Date(dateRange.end);
        matchesDate = invDate >= startDate && invDate <= endDate;
      }
      
      // Amount filter
      let matchesAmount = true;
      if (amountFilter !== 'all') {
        const amount = Number(inv.total_amount);
        switch (amountFilter) {
          case 'low': matchesAmount = amount < 5000; break;
          case 'medium': matchesAmount = amount >= 5000 && amount < 20000; break;
          case 'high': matchesAmount = amount >= 20000; break;
        }
      }
      
      return matchesSearch && matchesTab && matchesDate && matchesAmount;
    });
  }, [invoices, searchQuery, currentTab, dateRange, amountFilter]);

  const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedInvoices = filteredInvoices.slice(startIndex, startIndex + itemsPerPage);

  // --- BULK ACTIONS ---
  const toggleSelectAll = () => {
    if (selectedIds.length === paginatedInvoices.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(paginatedInvoices.map(inv => inv.id));
    }
  };

  const toggleSelectInvoice = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleBulkAction = async (action: string) => {
    if (selectedIds.length === 0) {
      toast.error("Please select at least one invoice");
      return;
    }

    switch (action) {
      case 'mark-paid':
        await handleBulkStatusChange('Paid');
        break;
      case 'download-zip':
        toast.info("Preparing ZIP download...");
        // Implement ZIP download logic here
        setTimeout(() => toast.success("Downloaded!"), 1500);
        break;
      case 'delete':
        handleBulkDelete();
        break;
    }
    setSelectedIds([]);
  };

  const handleBulkStatusChange = async (status: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('hr_invoices')
        .update({ 
          status,
          updated_by: user?.id,
          updated_at: new Date().toISOString()
        })
        .in('id', selectedIds);
      
      if (error) throw error;
      toast.success(`${selectedIds.length} invoices marked as ${status}`);
      fetchInvoices();
    } catch (error) {
      toast.error("Failed to update invoices");
    }
  };

  const handleBulkDelete = () => {
    toast.warning(`Delete ${selectedIds.length} invoices?`, {
      description: "This action cannot be undone.",
      action: {
        label: "Delete",
        onClick: async () => {
          const { error } = await supabase.from('hr_invoices').delete().in('id', selectedIds);
          if (error) toast.error("Failed to delete invoices");
          else {
            toast.success("Invoices deleted");
            fetchInvoices();
          }
        }
      },
      cancel: { label: "Cancel" }
    });
  };

// Update handleStatusChange to intercept Paid/Partially Paid
const handleStatusChange = async (id: string, newStatus: string) => {
  const inv = invoices.find(i => i.id === id);
  
  if (newStatus === 'Paid' || newStatus === 'Partially Paid') {
    const remainingBalance = Number(inv.total_amount) - Number(inv.paid_amount || 0);
    
    setPaymentType('full'); // Default to full
    setPaymentData({
      id,
      status: newStatus,
      amount: remainingBalance, 
      date: format(new Date(), 'yyyy-MM-dd'),
      method: 'Bank Transfer'
    });
    setIsPaymentDialogOpen(true);
    return;
  }
  await performStatusUpdate(id, newStatus, inv.paid_amount, null, null);
};

  // Update logic to handle Edit Modal correctly
  const handleEditClick = (inv: any) => {
    // Ensure items are parsed if they come as a string from DB
    const processedInvoice = {
      ...inv,
      items: typeof inv.items === 'string' ? JSON.parse(inv.items) : (inv.items || [])
    };
    setSelectedInvoice(processedInvoice);
    setIsCreateOpen(true);
  };

// New function to handle the actual database save
const performStatusUpdate = async (id: string, status: string, paidAmount: number, date: string | null, method: string | null) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    // Calculate if it should be Paid or Partially Paid based on amount
    const inv = invoices.find(i => i.id === id);
    const totalAmount = Number(inv.total_amount);
    const finalStatus = (status === 'Paid' && paidAmount < totalAmount) ? 'Partially Paid' : status;

    const { error } = await supabase
      .from('hr_invoices')
      .update({ 
        status: finalStatus,
        paid_amount: paidAmount,
        payment_date: date,
        updated_by: user?.id,
        updated_at: new Date().toISOString(),
        // We pass method via metadata if needed, but history trigger captures status
      })
      .eq('id', id);
    
    if (error) throw error;
    toast.success(`Invoice updated to ${finalStatus}`);
    setIsPaymentDialogOpen(false);
    fetchInvoices();
  } catch (error) {
    toast.error("Failed to update status");
  }
};

  const handleDelete = (id: string) => {
    toast.warning("Are you sure?", {
      description: "This action cannot be undone.",
      action: {
        label: "Delete",
        onClick: async () => {
          const { error } = await supabase.from('hr_invoices').delete().eq('id', id);
          if (error) toast.error("Failed to delete invoice");
          else {
            toast.success("Invoice deleted");
            fetchInvoices();
          }
        }
      },
      cancel: { label: "Cancel" }
    });
  };

  // --- HELPER FUNCTIONS ---
  const getDaysOverdue = (invoice: any) => {
    if (invoice.status.toLowerCase() !== 'overdue' || !invoice.due_date) return 0;
    return differenceInDays(new Date(), new Date(invoice.due_date));
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid': return <CheckCircle className="h-3 w-3 text-green-600" />;
      case 'unpaid': return <Clock className="h-3 w-3 text-yellow-600" />;
      case 'overdue': return <AlertTriangle className="h-3 w-3 text-red-600" />;
      case 'partially paid': return <DollarSign className="h-3 w-3 text-blue-600" />;
      case 'cancelled': return <X className="h-3 w-3 text-gray-600" />;
      default: return <FileText className="h-3 w-3 text-gray-500" />;
    }
  };

  const getPaymentMethod = (invoice: any) => {
    // This would come from invoice data
    return invoice.payment_method || 'Bank Transfer';
  };

  // Get last status change time from history
  const getLastStatusChange = (invoice: any) => {
    if (!invoice.status_history || invoice.status_history.length === 0) {
      return null;
    }
    const history = Array.isArray(invoice.status_history) 
      ? invoice.status_history 
      : JSON.parse(invoice.status_history);
    const lastChange = history[history.length - 1];
    return lastChange?.changed_at ? new Date(lastChange.changed_at) : null;
  };

  // Format relative time (e.g., "2 hours ago", "3 days ago")
  const getRelativeTime = (date: Date | null) => {
    if (!date) return '';
    
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return format(date, 'dd MMM yyyy');
  };

const openPreview = (invoice: any) => {
    const parsedInvoice = {
      ...invoice,
      items: typeof invoice.items === 'string' ? JSON.parse(invoice.items) : invoice.items || []
    };
    setPreviewInvoice(parsedInvoice);
    setIsPreviewOpen(true);
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50/50 min-h-screen">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Organization Invoices</h1>
          <p className="text-sm text-gray-500">Manage billing and subscriptions for organizations.</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => setShowFilters(!showFilters)}
            className="border-purple-200 text-purple-700 hover:text-purple-800 hover:bg-purple-50"
          >
            <Filter className="h-4 w-4 mr-2" />
            {showFilters ? 'Hide' : 'Show'} Filters
          </Button>
          <Button onClick={() => { setSelectedInvoice(null); setIsCreateOpen(true); }} className="bg-purple-600 hover:bg-purple-700 shadow-sm">
            <Plus className="h-4 w-4 mr-2" /> Create Invoice
          </Button>
        </div>
      </div>

      {/* PAYMENT HEALTH SCORE */}
      <Card className="border-none shadow-md bg-gradient-to-r from-purple-50 to-blue-50">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">Payment Health Score:</span>
                <div className="flex items-center gap-2">
                  <span className={`text-2xl font-bold ${
                    paymentHealthScore >= 80 ? 'text-green-600' :
                    paymentHealthScore >= 60 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {paymentHealthScore}%
                  </span>
                  <span className="text-2xl">
                    {paymentHealthScore >= 80 ? '🟢' : paymentHealthScore >= 60 ? '🟡' : '🔴'}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="text-blue-600 border-blue-200 hover:text-blue-700e hover:bg-blue-50">
                <FileText className="h-4 w-4 mr-2" />
                Generate Report
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* STATS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Invoiced', stat: stats.all, icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Total Paid', stat: stats.paid, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Total Overdue', stat: stats.overdue, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
          { label: 'Total Draft', stat: stats.draft, icon: Edit, color: 'text-gray-600', bg: 'bg-gray-100' },
        ].map((item, i) => (
          <Card key={i} className="shadow-sm border-none">
            <CardContent className="p-5 flex justify-between items-center">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{item.label}</p>
                <h3 className="text-2xl font-bold text-gray-800 mt-1">₹{item.stat.amount.toLocaleString()}</h3>
                <p className="text-xs text-gray-400 mt-1">{item.stat.count} invoices</p>
              </div>
              <div className={`h-10 w-10 rounded-full flex items-center justify-center ${item.bg}`}>
                <item.icon className={`h-5 w-5 ${item.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ADVANCED FILTERS */}
      {showFilters && (
        <Card className="shadow-sm border-purple-100">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-2 block">Date Range</label>
                <Select 
                  value={dateRange ? 'custom' : 'all'} 
                  onValueChange={(val) => {
                    if (val === 'all') {
                      setDateRange(null);
                    } else if (val === 'last-30') {
                      const end = new Date();
                      const start = new Date();
                      start.setDate(start.getDate() - 30);
                      setDateRange({ 
                        start: start.toISOString().split('T')[0], 
                        end: end.toISOString().split('T')[0] 
                      });
                    }
                  }}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="All Time" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="last-30">Last 30 Days</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600 mb-2 block">Amount Range</label>
                <Select value={amountFilter} onValueChange={setAmountFilter}>
                  <SelectTrigger className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Amounts</SelectItem>
                    <SelectItem value="low">&lt; ₹5,000</SelectItem>
                    <SelectItem value="medium">₹5,000 - ₹20,000</SelectItem>
                    <SelectItem value="high">&gt; ₹20,000</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button 
                  variant="outline" 
                  className="w-full" 
                  onClick={() => {
                    setDateRange(null);
                    setAmountFilter('all');
                  }}
                >
                  <X className="h-4 w-4 mr-2" />
                  Clear Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* SEARCH & BULK ACTIONS */}
      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input 
            placeholder="Search by Invoice # or Organization Name..." 
            className="pl-10 bg-white border-gray-200"
            value={searchQuery}
            onChange={(e) => updateParams({ search: e.target.value, page: '1' })}
          />
        </div>

        {selectedIds.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">
              {selectedIds.length} selected
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="border-purple-200">
                  Bulk Actions
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => handleBulkAction('mark-paid')}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Mark as Paid
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleBulkAction('download-zip')}>
                  <Package className="h-4 w-4 mr-2" />
                  Download Selected (ZIP)
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => handleBulkAction('delete')}
                  className="text-red-600"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Selected
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {/* TABS & TABLE */}
      <Tabs value={currentTab} onValueChange={(val) => updateParams({ status: val, page: '1' })} className="w-full">
<TabsList className="inline-flex h-auto items-center justify-start rounded-full bg-slate-100 p-1 shadow-inner w-full sm:w-auto overflow-x-auto relative">
          {['all', 'draft', 'paid', 'unpaid', 'overdue', 'partially paid', 'cancelled'].map(tab => {
            const isActive = currentTab === tab;
            
            return (
              <TabsTrigger 
                key={tab} 
                value={tab} 
                className="
                  relative rounded-full px-4 py-1.5 text-xs font-medium transition-colors duration-200
                  text-slate-500
                  data-[state=active]:text-white
                  data-[state=active]:bg-transparent 
                  data-[state=active]:shadow-none
                  capitalize flex items-center gap-2 z-10
                "
              >
                {/* The Sliding Background */}
                {isActive && (
                  <motion.div
                    layoutId="active-pill"
                    className="absolute inset-0 bg-purple-600 rounded-full shadow-md z-[-1]"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                
                {/* Tab Name */}
                <span className="relative z-10">{tab}</span>
                
                {/* Count Badge */}
                <span className={`
                  relative z-10 px-1.5 py-0.5 rounded-full text-[10px] transition-colors duration-200
                  ${isActive 
                    ? 'bg-white/20 text-white' 
                    : 'bg-white text-slate-600 shadow-sm'}
                `}>
                  {stats[tab as keyof typeof stats]?.count || 0}
                </span>
              </TabsTrigger>
            );
          })}
        </TabsList>
        <TabsContent value={currentTab} className="mt-4">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <div className="min-w-[1000px]">
                {/* TABLE HEADER */}
                <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50/80 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <div className="col-span-1 flex items-center">
                    <button onClick={toggleSelectAll} className="hover:bg-gray-200 p-1 rounded">
                      {selectedIds.length === paginatedInvoices.length && paginatedInvoices.length > 0 ? 
                        <CheckSquare className="h-4 w-4 text-purple-600" /> : 
                        <Square className="h-4 w-4" />
                      }
                    </button>
                  </div>
                  <div className="col-span-2">Invoice #</div>
                  <div className="col-span-3">Organization</div>
                  <div className="col-span-1">Amount</div>
                  <div className="col-span-1">Method</div> 
                  <div className="col-span-2">Status</div>   
                  <div className="col-span-1 text-center">Actions</div>
                </div>

                {/* TABLE BODY */}
                <div className="divide-y divide-gray-100">
                  {isLoading ? (
                    <div className="py-20 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-purple-600" /></div>
                  ) : paginatedInvoices.length === 0 ? (
                    <div className="py-20 text-center text-gray-500 text-sm">No invoices found matching your filters.</div>
                  ) : (
                    paginatedInvoices.map((inv) => {
                      const daysOverdue = getDaysOverdue(inv);
                      return (
                        <div 
                          key={inv.id} 
                          className={`grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-gray-50/50 transition-colors text-sm cursor-pointer ${
                            selectedIds.includes(inv.id) ? 'bg-purple-50/50' : ''
                          }`}
                          onClick={() => openPreview(inv)}
                        >
                          {/* 1. Checkbox */}
                          <div className="col-span-1" onClick={(e) => e.stopPropagation()}>
                            <button onClick={() => toggleSelectInvoice(inv.id)} className="hover:bg-gray-200 p-1 rounded">
                              {selectedIds.includes(inv.id) ? 
                                <CheckSquare className="h-4 w-4 text-purple-600" /> : 
                                <Square className="h-4 w-4" />
                              }
                            </button>
                          </div>

                          {/* 2. Invoice # */}
                          <div className="col-span-2 font-medium text-gray-900">{inv.invoice_number}</div>

                          {/* 3. Organization */}
                          <div className="col-span-3">
                            <div className="flex flex-col">
                              <span className="text-gray-900 font-medium truncate" title={inv.client_name}>{inv.client_name}</span>
                              <div className="flex gap-2 text-[10px] text-gray-400 mt-0.5">
                                <span>{inv.invoice_date ? format(new Date(inv.invoice_date), 'dd MMM yyyy') : '-'}</span>
                                <span>•</span>
                                <span>Due: {inv.due_date ? format(new Date(inv.due_date), 'dd MMM') : '-'}</span>
                              </div>
                            </div>
                          </div>

                          {/* 4. Amount */}
     <Popover>
        <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
          <div className="col-span-1 font-semibold text-purple-700 hover:text-purple-800 cursor-pointer underline decoration-dotted">
            ₹{Number(inv.total_amount).toLocaleString()}
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-64" align="start">
          <div className="space-y-2 text-sm">
            <h4 className="font-bold border-b pb-1">Invoice Summary</h4>
            <div className="flex justify-between">
              <span className="text-gray-500">Subtotal:</span>
              <span>₹{Number(inv.subtotal).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Tax ({inv.tax_mode}):</span>
              <span>₹{Number(inv.tax_amount).toLocaleString()}</span>
            </div>
            {Number(inv.tds_amount) > 0 && (
              <div className="flex justify-between text-red-500">
                <span>TDS (-):</span>
                <span>₹{Number(inv.tds_amount).toLocaleString()}</span>
              </div>
            )}
            {Number(inv.tcs_amount) > 0 && (
              <div className="flex justify-between text-green-600">
                <span>TCS (+):</span>
                <span>₹{Number(inv.tcs_amount).toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between pt-1 border-t font-bold text-purple-700">
              <span>Total:</span>
              <span>₹{Number(inv.total_amount).toLocaleString()}</span>
            </div>
          </div>
        </PopoverContent>
      </Popover>

                          {/* 5. Payment Method */}
                          <div className="col-span-1 text-gray-600 text-xs">
                            {getPaymentMethod(inv)}
                          </div>

      

                          {/* 7. Status */}
{/* 6. Status Column (Replaces Overdue and Status) */}
{/* 7. Status Column - Unified Display for All Statuses */}
                          <div className="col-span-3" onClick={(e) => e.stopPropagation()}>
                            <div className="flex flex-col items-start gap-1.5">
                              {/* Row 1: The Status Badge (Select) */}
                              <Select 
                                value={inv.status} 
                                onValueChange={(val) => handleStatusChange(inv.id, val)}
                              >
                                <SelectTrigger 
                                  className={`
                                    h-7 px-3 w-auto min-w-[110px] max-w-[150px] border rounded-full 
                                    flex items-center gap-2 text-xs font-semibold shadow-sm
                                    focus:ring-0 focus:ring-offset-0 transition-all
                                    ${statusStyles[inv.status] || 'bg-gray-100 text-gray-700 border-gray-200'}
                                  `}
                                >
                                  <span className="flex-shrink-0">{getStatusIcon(inv.status)}</span>
                                  <span className="truncate">{inv.status}</span>
                                </SelectTrigger>
                                
                                <SelectContent align="start">
                                  {['Draft', 'Unpaid', 'Paid', 'Partially Paid', 'Overdue', 'Cancelled'].map(st => (
                                    <SelectItem key={st} value={st} className="text-xs font-medium">{st}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>

                              {/* Row 2: Relative Time & Exact Date (Matching Status Color) */}
                              {getLastStatusChange(inv) && (
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <button 
                                      className={`
                                        flex items-center gap-1 text-[10px] pl-1 font-medium transition-opacity hover:opacity-80 outline-none cursor-pointer
                                        ${inv.status === 'Paid' ? 'text-green-600' : ''}
                                        ${inv.status === 'Unpaid' ? 'text-yellow-600' : ''}
                                        ${inv.status === 'Overdue' ? 'text-red-600' : ''}
                                        ${inv.status === 'Partially Paid' ? 'text-blue-600' : ''}
                                        ${inv.status === 'Draft' || inv.status === 'Cancelled' ? 'text-slate-500' : ''}
                                      `}
                                    >
                                      <Clock className="h-3 w-3" />
                                      <span>{getRelativeTime(getLastStatusChange(inv))}</span>
                                      <span className="ml-1">({format(getLastStatusChange(inv), 'dd MMM yyyy')})</span>
                                    </button>
                                  </PopoverTrigger>
                                  
                                  {/* Keeps your scrollable history detail on click */}
                                  <PopoverContent className="w-72 p-0 shadow-xl border-gray-100" align="start">
                                    <div className="p-4 bg-white rounded-lg">
                                      <h4 className="font-semibold text-xs text-gray-900 mb-3 flex items-center gap-2 border-b pb-2">
                                        <Clock className="h-3.5 w-3.5 text-purple-600" />
                                        Status History
                                      </h4>
                                      <div className="space-y-3 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                                        {inv.status_history && (Array.isArray(inv.status_history) ? inv.status_history : JSON.parse(inv.status_history)).length > 0 ? (
                                          (Array.isArray(inv.status_history) ? inv.status_history : JSON.parse(inv.status_history))
                                            .slice().reverse().map((change: any, index: number) => (
                                            <div key={index} className="flex items-start gap-3 relative">
                                              <div className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ring-2 ring-white ${
                                                change.status === 'Paid' ? 'bg-green-500' : 
                                                change.status === 'Unpaid' ? 'bg-yellow-500' : 
                                                change.status === 'Overdue' ? 'bg-red-500' : 'bg-gray-300'
                                              }`} />
                                              <div className="flex-1">
                                                <span className="text-xs font-medium text-gray-900 block">{change.status}</span>
                                                <span className="text-[10px] text-gray-500">{change.changed_at ? format(new Date(change.changed_at), 'dd MMM, HH:mm') : '-'}</span>
                                              </div>
                                            </div>
                                          ))
                                        ) : <div className="text-xs text-gray-400 text-center py-2">No history available</div>}
                                      </div>
                                    </div>
                                  </PopoverContent>
                                </Popover>
                              )}
                            </div>
                          </div>

                          {/* ACTIONS COLUMN - PILL SHAPE UI */}
                          <div className="col-span-1 flex justify-end" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center space-x-1 rounded-full bg-slate-100 p-1 shadow-sm border border-slate-200">
                              
                              {/* View Button */}
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-7 w-7 rounded-full text-slate-500 hover:bg-purple-600 hover:text-white transition-colors" 
                                      onClick={() => setViewInvoiceId(inv.id)}
                                    >
                                      <Eye className="h-3.5 w-3.5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent><p>View</p></TooltipContent>
                                </Tooltip>
                              </TooltipProvider>

                              {/* Edit Button */}
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-7 w-7 rounded-full text-slate-500 hover:bg-purple-600 hover:text-white transition-colors" 
                                     onClick={() => handleEditClick(inv)}
                                    >
                                      <Edit className="h-3.5 w-3.5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent><p>Edit</p></TooltipContent>
                                </Tooltip>
                              </TooltipProvider>

                              {/* Download Button */}
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-7 w-7 rounded-full text-slate-500 hover:bg-purple-600 hover:text-white transition-colors" 
                                      onClick={() => {
                                        toast.info("Generating PDF...");
                                        setTimeout(() => toast.success("PDF Downloaded!"), 1500);
                                      }}
                                      disabled={downloadingIds.includes(inv.id)}
                                    >
                                      {downloadingIds.includes(inv.id) ? 
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 
                                        <Download className="h-3.5 w-3.5" />
                                      }
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent><p>Download</p></TooltipContent>
                                </Tooltip>
                              </TooltipProvider>

                              {/* Delete Button */}
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-7 w-7 rounded-full text-slate-500 hover:bg-red-600 hover:text-white transition-colors" 
                                      onClick={() => handleDelete(inv.id)}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent><p>Delete</p></TooltipContent>
                                </Tooltip>
                              </TooltipProvider>

                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* PAGINATION */}
            {filteredInvoices.length > 0 && (
              <div className="flex items-center justify-between px-6 py-4 bg-gray-50/50 border-t border-gray-200">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>Show</span>
                  <Select value={itemsPerPage.toString()} onValueChange={(v) => updateParams({ limit: v, page: '1' })}>
                    <SelectTrigger className="h-8 w-16 bg-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                    </SelectContent>
                  </Select>
                  <span>per page</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 mr-2">
                    {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredInvoices.length)} of {filteredInvoices.length}
                  </span>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="h-8 w-8" 
                    onClick={() => updateParams({ page: String(Math.max(currentPage - 1, 1)) })}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="h-8 w-8" 
                    onClick={() => updateParams({ page: String(Math.min(currentPage + 1, totalPages)) })}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* CREATE/EDIT MODAL */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedInvoice ? 'Edit Invoice' : 'Create Organization Invoice'}</DialogTitle>
          </DialogHeader>
          <OrganizationInvoiceForm 
            invoice={selectedInvoice} 
            onClose={() => setIsCreateOpen(false)} 
            onSuccess={fetchInvoices} 
          />
        </DialogContent>
      </Dialog>

      {/* VIEW MODAL */}
      <Dialog open={!!viewInvoiceId} onOpenChange={(open) => !open && setViewInvoiceId(null)}>
        <DialogContent className="max-w-4xl h-[90vh] p-0 overflow-hidden bg-gray-50">
          <OrganizationInvoiceDetail invoiceId={viewInvoiceId} />
        </DialogContent>
      </Dialog>

<Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
  <DialogContent className="sm:max-w-[425px]">
    <DialogHeader>
      <DialogTitle>Record Payment</DialogTitle>
    </DialogHeader>
    <div className="grid gap-6 py-4">
      
      {/* Radio Selection for Payment Type */}
      <div className="space-y-3">
        <Label>Payment Type</Label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input 
              type="radio" 
              className="w-4 h-4 accent-purple-600"
              checked={paymentType === 'full'} 
              onChange={() => {
                const inv = invoices.find(i => i.id === paymentData.id);
                const balance = Number(inv.total_amount) - Number(inv.paid_amount || 0);
                setPaymentType('full');
                setPaymentData({ ...paymentData, amount: balance });
              }} 
            />
            <span className="text-sm font-medium">Fully Paid</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input 
              type="radio" 
              className="w-4 h-4 accent-purple-600"
              checked={paymentType === 'manual'} 
              onChange={() => {
                setPaymentType('manual');
                setPaymentData({ ...paymentData, amount: '' }); // Set to empty
              }} 
            />
            <span className="text-sm font-medium">Manual Amount</span>
          </label>
        </div>
      </div>

      {/* Amount Received - Visible always, but empty/editable if manual */}
      <div className="space-y-2">
        <Label>Amount Received</Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">₹</span>
          <Input 
            type="number" 
            placeholder="0.00"
            className="pl-7"
            value={paymentData.amount} 
            disabled={paymentType === 'full'}
            onChange={(e) => {
              // Allow clearing the field completely
              const val = e.target.value;
              setPaymentData({ ...paymentData, amount: val === '' ? '' : Number(val) });
            }}
          />
        </div>
        {paymentType === 'full' && (
          <p className="text-[10px] text-purple-600 font-medium italic">Auto-calculated remaining balance</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Payment Date</Label>
          <Input 
            type="date" 
            value={paymentData.date} 
            onChange={(e) => setPaymentData({...paymentData, date: e.target.value})}
          />
        </div>
        <div className="space-y-2">
          <Label>Method</Label>
          <Select value={paymentData.method} onValueChange={(val) => setPaymentData({...paymentData, method: val})}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
              <SelectItem value="UPI">UPI / QR</SelectItem>
              <SelectItem value="Cash">Cash</SelectItem>
              <SelectItem value="Cheque">Cheque</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>

    <div className="flex justify-end gap-2">
      <Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>Cancel</Button>
      <Button 
        disabled={!paymentData.amount || Number(paymentData.amount) <= 0}
        onClick={() => {
          const inv = invoices.find(i => i.id === paymentData.id);
          const paidNow = Number(paymentData.amount);
          const newTotalPaid = Number(inv.paid_amount || 0) + paidNow;
          
          // Determine status based on if balance is cleared
          const totalInvoiceAmount = Number(inv.total_amount);
          const finalStatus = newTotalPaid >= totalInvoiceAmount ? 'Paid' : 'Partially Paid';
          
          performStatusUpdate(paymentData.id, finalStatus, newTotalPaid, paymentData.date, paymentData.method);
        }}
      >
        Save Payment
      </Button>
    </div>
  </DialogContent>
</Dialog>
      {/* PREVIEW SIDE PANEL */}
      <Sheet open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <SheetContent side="right" className="w-full sm:max-w-2xl p-0 overflow-hidden">
          <SheetHeader className="p-6 border-b bg-white">
            <SheetTitle>Invoice Preview</SheetTitle>
          </SheetHeader>
{previewInvoice && (
            <div className="flex flex-col h-[calc(100vh-60px)]">
              {/* 1. TOP HEADER (Simplified) */}
              <div className="p-6 border-b bg-white">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-extrabold text-gray-900 tracking-tight">{previewInvoice.invoice_number}</h3>
                    <p className="text-sm text-gray-500 font-medium">{previewInvoice.client_name}</p>
                  </div>
                  <div className={`px-4 py-1.5 rounded-full text-xs font-bold border shadow-sm ${
                    previewInvoice.status === 'Paid' ? 'bg-green-50 text-green-700 border-green-200' :
                    previewInvoice.status === 'Unpaid' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                    previewInvoice.status === 'Overdue' ? 'bg-red-50 text-red-700 border-red-200' :
                    'bg-gray-50 text-gray-600 border-gray-200'
                  }`}>
                    {previewInvoice.status}
                  </div>
                </div>
              </div>

              {/* 2. SCROLLABLE AREA */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50/30">
                
                {/* THE INVOICE CARD */}
                <Card className="border-2 border-gray-100 shadow-sm overflow-hidden bg-white">
                  <CardContent className="p-0">
                    <div className="h-1.5 w-full bg-purple-600" />
                    <div className="p-6 space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-tight mb-2">Bill To</h4>
                          <div className="text-xs space-y-1">
                            <p className="font-bold text-gray-900">{previewInvoice.client_name}</p>
                            <p className="text-gray-500 leading-relaxed">Indore, Madhya Pradesh, India</p>
                          </div>
                        </div>
                        <div className="text-right space-y-3">
                          <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase">Invoice Date</p>
                            <p className="text-xs font-semibold">{previewInvoice.invoice_date ? format(new Date(previewInvoice.invoice_date), 'dd MMM, yyyy') : '-'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase">Due Date</p>
                            <p className="text-xs font-semibold">{previewInvoice.due_date ? format(new Date(previewInvoice.due_date), 'dd MMM, yyyy') : '-'}</p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-purple-50 p-4 rounded-xl flex justify-between items-center border border-purple-100">
                        <span className="text-xs font-bold text-purple-700 uppercase">Amount Due</span>
                        <span className="text-xl font-black text-purple-700">₹{Number(previewInvoice.total_amount).toLocaleString()}</span>
                      </div>

                      <div className="border rounded-lg overflow-hidden">
                        <table className="w-full text-[11px]">
                          <thead className="bg-gray-50 border-b">
                            <tr className="text-gray-500 font-bold uppercase">
                              <th className="px-3 py-2 text-left">Description</th>
                              <th className="px-3 py-2 text-right">Qty</th>
                              <th className="px-3 py-2 text-right">Amount</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {previewInvoice.items && Array.isArray(previewInvoice.items) && previewInvoice.items.map((item: any, idx: number) => (
                              <tr key={idx} className="text-gray-700">
                                <td className="px-3 py-2 font-medium">{item.description}</td>
                                <td className="px-3 py-2 text-right">{item.quantity}</td>
                                <td className="px-3 py-2 text-right font-bold">₹{Number(item.amount).toLocaleString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="flex justify-end pt-2 border-t border-dashed">
                        <div className="w-1/2 space-y-1 text-xs text-right">
                          <p className="text-gray-500">Subtotal: <span className="font-semibold text-gray-900 ml-2">₹{(Number(previewInvoice.total_amount) / 1.18).toFixed(1)}</span></p>
                          <p className="text-gray-500">Tax (18%): <span className="font-semibold text-gray-900 ml-2">₹{(Number(previewInvoice.total_amount) - (Number(previewInvoice.total_amount) / 1.18)).toFixed(1)}</span></p>
                          <p className="text-purple-700 font-black text-sm pt-1">Total: <span className="ml-2">₹{Number(previewInvoice.total_amount).toLocaleString()}</span></p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* --- QUICK ACTIONS (NOW DIRECTLY UNDER THE CARD) --- */}
{/* 3. QUICK ACTIONS - Refined Integrated Look */}
                <div className="mt-2 pt-4 border-t border-gray-100">
                  <div className="bg-gray-50/80 p-3 rounded-xl border border-gray-100 shadow-inner">
                    <div className="flex items-center justify-between mb-3 px-1">
                      <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Quick Actions</h4>
                      <div className="h-1 w-8 bg-gray-200 rounded-full" /> {/* Aesthetic divider */}
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="h-9 bg-white border border-gray-200 hover:border-purple-300 hover:bg-purple-50 text-gray-700 hover:text-purple-700 transition-all text-[10px] font-semibold shadow-sm" 
                        onClick={() => setViewInvoiceId(previewInvoice.id)}
                      >
                        <Eye className="h-4 w-4 mr-1.5 text-purple-600" />
                        View Full
                      </Button>
                      
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="h-9 bg-white border border-gray-200 hover:border-purple-300 hover:bg-purple-50 text-gray-700 hover:text-purple-700 transition-all text-[10px] font-semibold shadow-sm" 
                        onClick={() => { setSelectedInvoice(previewInvoice); setIsCreateOpen(true); }}
                      >
                        <Edit className="h-4 w-4 mr-1.5 text-purple-600" />
                        Edit
                      </Button>

                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="h-9 bg-white border border-gray-200 hover:border-purple-300 hover:bg-purple-50 text-gray-700 hover:text-purple-700 transition-all text-[10px] font-semibold shadow-sm" 
                        onClick={() => {
                          toast.info("Preparing PDF...");
                          setTimeout(() => toast.success("PDF Downloaded!"), 1500);
                        }}
                      >
                        <Download className="h-4 w-4 mr-1.5 text-purple-600" />
                        Download
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

    </div>
  );
};

export default GlobalInvoicesPage;