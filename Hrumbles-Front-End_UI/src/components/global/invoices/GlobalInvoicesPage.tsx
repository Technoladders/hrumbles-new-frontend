import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import { supabase } from "@/integrations/supabase/client";
import { 
  Plus, Search, FileText, Download, Edit, Eye, Trash2, 
  CheckCircle, Clock, AlertTriangle, Loader2, ChevronLeft, ChevronRight 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { format } from 'date-fns';
import OrganizationInvoiceForm from './OrganizationInvoiceForm';
import OrganizationInvoiceDetail from './OrganizationInvoiceDetail';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
// We render a hidden version of the detail component to generate PDF without opening modal
import { createRoot } from 'react-dom/client';

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

  // --- URL SYNCED STATE ---
  const searchQuery = searchParams.get('search') || '';
  const currentTab = searchParams.get('status') || 'all';
  const currentPage = parseInt(searchParams.get('page') || '1');
  const itemsPerPage = parseInt(searchParams.get('limit') || '10');

  // Helper to update URL params
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
      .select('*')
      .eq('organization_id', organizationId)
      .eq('type', 'Organization') 
      .not('organization_client_id', 'is', null) 
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching invoices:', error);
      toast.error("Failed to fetch invoices");
    } else {
      setInvoices(data || []);
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
    };

    return invoices.reduce((acc, inv) => {
        // Handle currency conversion roughly if needed, assuming INR for display stats
        // If mixed currency, you might need separate stats or a converter.
        // For now, we sum up totals directly.
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

  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const matchesSearch = 
        inv.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.client_name?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesTab = currentTab === 'all' || inv.status.toLowerCase() === currentTab.toLowerCase();
      
      return matchesSearch && matchesTab;
    });
  }, [invoices, searchQuery, currentTab]);

  const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedInvoices = filteredInvoices.slice(startIndex, startIndex + itemsPerPage);

  // --- ACTIONS ---

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
        const { error } = await supabase
            .from('hr_invoices')
            .update({ status: newStatus })
            .eq('id', id);
        
        if (error) throw error;
        toast.success(`Status updated to ${newStatus}`);
        fetchInvoices();
    } catch (error: any) {
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

  // --- DOWNLOAD PDF LOGIC ---
  // Reuses the Logic from Detail Page but renders it invisibly to capture
  const handleDownload = async (invoiceId: string, invoiceNumber: string) => {
    if (downloadingIds.includes(invoiceId)) return;
    
    setDownloadingIds(prev => [...prev, invoiceId]);
    toast.info("Generating PDF...");

    try {
        // Create a hidden container
        const container = document.createElement('div');
        container.style.position = 'absolute';
        container.style.left = '-9999px';
        container.style.top = '0';
        container.style.width = '800px'; // A4 width approx
        document.body.appendChild(container);

        // Render the Detail component into it
        const root = createRoot(container);
        // We render the Detail component. It needs to handle its own data fetching based on ID.
        // Since it does that in useEffect, we just mount it.
        // IMPORTANT: We need to wait for it to load data. 
        // This is a hacky way. Better way is to have a "dumb" component that takes data props.
        // For now, we will assume OrganizationInvoiceDetail handles its own loading state.
        root.render(<OrganizationInvoiceDetail invoiceId={invoiceId} />);

        // Wait for data to load (simple timeout, or improved if refactoring Detail component)
        await new Promise(resolve => setTimeout(resolve, 2000)); 

        const canvas = await html2canvas(container.querySelector('.shadow-none') as HTMLElement || container, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff'
        });

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const imgWidth = 210; 
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
        pdf.save(`${invoiceNumber}.pdf`);
        
        toast.success("Downloaded");
        
        // Cleanup
        root.unmount();
        document.body.removeChild(container);

    } catch (error) {
        console.error("Download error:", error);
        toast.error("Failed to generate PDF");
    } finally {
        setDownloadingIds(prev => prev.filter(id => id !== invoiceId));
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid': return <CheckCircle className="h-3 w-3 text-green-600" />;
      case 'unpaid': return <Clock className="h-3 w-3 text-yellow-600" />;
      case 'overdue': return <AlertTriangle className="h-3 w-3 text-red-600" />;
      default: return <FileText className="h-3 w-3 text-gray-500" />;
    }
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50/50 min-h-screen">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Organization Invoices</h1>
          <p className="text-sm text-gray-500">Manage billing and subscriptions for organizations.</p>
        </div>
        <Button onClick={() => { setSelectedInvoice(null); setIsCreateOpen(true); }} className="bg-purple-600 hover:bg-purple-700 shadow-sm">
          <Plus className="h-4 w-4 mr-2" /> Create Invoice
        </Button>
      </div>

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

      {/* FILTERS & SEARCH */}
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
      </div>

      {/* TABS & TABLE */}
      <Tabs value={currentTab} onValueChange={(val) => updateParams({ status: val, page: '1' })} className="w-full">
        <TabsList className="inline-flex h-auto items-center justify-start rounded-full bg-white p-1 border border-gray-200 shadow-sm w-full sm:w-auto overflow-x-auto">
            {['all', 'draft', 'paid', 'unpaid', 'overdue'].map(tab => (
                <TabsTrigger 
                    key={tab} 
                    value={tab} 
                    className="rounded-full px-4 py-1.5 text-xs font-medium data-[state=active]:bg-purple-100 data-[state=active]:text-purple-700 data-[state=active]:shadow-none capitalize"
                >
                    {tab}
                    <span className={`ml-2 px-1.5 py-0.5 rounded-full text-[10px] ${currentTab === tab ? 'bg-white text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                        {stats[tab as keyof typeof stats].count}
                    </span>
                </TabsTrigger>
            ))}
        </TabsList>

        <TabsContent value={currentTab} className="mt-4">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                {/* TABLE HEADER */}
                <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50/80 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <div className="col-span-2">Invoice #</div>
                    <div className="col-span-3">Organization</div>
                    <div className="col-span-2">Date</div>
                    <div className="col-span-2">Amount</div>
                    <div className="col-span-1">Status</div>
                    <div className="col-span-2 text-right">Actions</div>
                </div>

                {/* TABLE BODY */}
                <div className="divide-y divide-gray-100">
                    {isLoading ? (
                        <div className="py-20 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-purple-600" /></div>
                    ) : paginatedInvoices.length === 0 ? (
                        <div className="py-20 text-center text-gray-500 text-sm">No invoices found matching your filters.</div>
                    ) : (
                        paginatedInvoices.map((inv) => (
                            <div key={inv.id} className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-gray-50/50 transition-colors text-sm">
                                <div className="col-span-2 font-medium text-gray-900">{inv.invoice_number}</div>
                                <div className="col-span-3 text-gray-600 truncate" title={inv.client_name}>{inv.client_name}</div>
                                <div className="col-span-2 text-gray-500">
                                    <div className="flex flex-col">
                                        <span>{inv.invoice_date ? format(new Date(inv.invoice_date), 'dd MMM yyyy') : '-'}</span>
                                        <span className="text-[10px] text-gray-400">Due: {inv.due_date ? format(new Date(inv.due_date), 'dd MMM') : '-'}</span>
                                    </div>
                                </div>
                                <div className="col-span-2 font-semibold text-gray-900">
                                    {inv.currency === 'USD' ? '$' : '₹'}{Number(inv.total_amount).toLocaleString()}
                                </div>
                                <div className="col-span-1">
                                    <Select 
                                        value={inv.status} 
                                        onValueChange={(val) => handleStatusChange(inv.id, val)}
                                    >
                                        <SelectTrigger className={`h-7 text-[10px] font-medium border-none rounded-full px-2 gap-1 w-fit
                                            ${inv.status === 'Paid' ? 'bg-green-100 text-green-700' : 
                                              inv.status === 'Unpaid' ? 'bg-yellow-100 text-yellow-700' :
                                              inv.status === 'Overdue' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                                            }
                                        `}>
                                            <SelectValue>
                                                <div className="flex items-center gap-1.5">
                                                    {getStatusIcon(inv.status)}
                                                    {inv.status}
                                                </div>
                                            </SelectValue>
                                        </SelectTrigger>
                                        <SelectContent>
                                            {['Draft', 'Unpaid', 'Paid', 'Overdue'].map(st => (
                                                <SelectItem key={st} value={st} className="text-xs">{st}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="col-span-2 flex justify-end gap-1">
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-purple-600 hover:bg-purple-50" onClick={() => setViewInvoiceId(inv.id)}>
                                        <Eye className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-blue-600 hover:bg-blue-50" onClick={() => { setSelectedInvoice(inv); setIsCreateOpen(true); }}>
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-8 w-8 text-gray-400 hover:text-green-600 hover:bg-green-50" 
                                        onClick={() => handleDownload(inv.id, inv.invoice_number)}
                                        disabled={downloadingIds.includes(inv.id)}
                                    >
                                        {downloadingIds.includes(inv.id) ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(inv.id)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))
                    )}
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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
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

    </div>
  );
};

export default GlobalInvoicesPage;