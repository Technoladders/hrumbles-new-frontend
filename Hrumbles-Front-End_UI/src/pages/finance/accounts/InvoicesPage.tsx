import React, { useState, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import { supabase } from "@/integrations/supabase/client";
import {
  Plus, Search, FileText, Download, Edit, Eye, Trash2,
  CheckCircle, Clock, AlertTriangle, Loader2, ChevronLeft, ChevronRight,
  Filter, X, CheckSquare, Square, DollarSign, UserCog,
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from 'sonner';
import { format } from 'date-fns';
import { motion } from "framer-motion";
import InvoiceForm from '@/components/accounts/InvoiceForm';
import InvoiceDetails from '@/components/accounts/InvoiceDetails';
import { printInvoicePDF } from '@/utils/printInvoicePDF';

const InvoicesPage = () => {
  const organizationId = useSelector((state: any) => state.auth.organization_id);
  const[searchParams, setSearchParams] = useSearchParams();

  const [invoices, setInvoices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const[isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [viewInvoiceId, setViewInvoiceId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [previewInvoice, setPreviewInvoice] = useState<any>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Payment dialog
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [paymentType, setPaymentType] = useState<'full' | 'manual'>('full');
  const[paymentData, setPaymentData] = useState({ id: '', status: '', amount: '' as string | number, date: format(new Date(), 'yyyy-MM-dd'), method: 'Bank Transfer' });

  // Edit billing dialog
  const [isBillingEditOpen, setIsBillingEditOpen] = useState(false);
  const [billingEditId, setBillingEditId] = useState('');
  const[billingForm, setBillingForm] = useState({ name: '', address: '', city: '', state: '', zipCode: '', country: 'India', taxId: '', currency: 'INR' });

  // Filters
  const[dateRange, setDateRange] = useState<{ start: string; end: string } | null>(null);
  const[amountFilter, setAmountFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  const searchQuery = searchParams.get('search') || '';
  const currentTab = searchParams.get('status') || 'all';
  const currentPage = parseInt(searchParams.get('page') || '1');
  const itemsPerPage = parseInt(searchParams.get('limit') || '10');

  const statusStyles: Record<string, string> = {
    Paid: "bg-green-100 text-green-700 border-green-200 hover:bg-green-200",
    Unpaid: "bg-yellow-100 text-yellow-700 border-yellow-200 hover:bg-yellow-200",
    Overdue: "bg-red-100 text-red-700 border-red-200 hover:bg-red-200",
    'Partially Paid': "bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200",
    Cancelled: "bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200",
    Draft: "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200",
  };

  const updateParams = (upd: any) => {
    const p = new URLSearchParams(searchParams);
    Object.keys(upd).forEach(k => { if (upd[k]) p.set(k, upd[k]); else p.delete(k); });
    setSearchParams(p);
  };

  const fetchInvoices = async () => {
    setIsLoading(true);
    const { data, error } = await supabase.from('hr_invoices').select('*, status_history, updated_by').eq('organization_id', organizationId).eq('type', 'Client').order('created_at', { ascending: false });
    if (error) toast.error('Failed to fetch invoices');
    else setInvoices((data ||[]).map(inv => ({ ...inv, items: typeof inv.items === 'string' ? JSON.parse(inv.items) : inv.items ||[] })));
    setIsLoading(false);
  };

  useEffect(() => { if (organizationId) fetchInvoices(); }, [organizationId]);

  const stats = useMemo(() => {
    const init: Record<string, { count: number; amount: number }> = { all: { count: 0, amount: 0 }, draft: { count: 0, amount: 0 }, paid: { count: 0, amount: 0 }, unpaid: { count: 0, amount: 0 }, overdue: { count: 0, amount: 0 }, 'partially paid': { count: 0, amount: 0 }, cancelled: { count: 0, amount: 0 } };
    return invoices.reduce((acc, inv) => { const a = Number(inv.total_amount) || 0; acc.all.count++; acc.all.amount += a; const k = inv.status.toLowerCase(); if (acc[k]) { acc[k].count++; acc[k].amount += a; } return acc; }, init);
  }, [invoices]);

  const paymentHealthScore = useMemo(() => {
    if (!invoices.length) return 100;
    return Math.round(((stats.paid.count / invoices.length) * 70) + (((invoices.length - stats.overdue.count) / invoices.length) * 30));
  }, [invoices, stats]);

  const filteredInvoices = useMemo(() => invoices.filter(inv => {
    const ms = inv.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) || inv.client_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const mt = currentTab === 'all' || inv.status.toLowerCase() === currentTab.toLowerCase();
    let md = true; if (dateRange) { const d = new Date(inv.invoice_date); md = d >= new Date(dateRange.start) && d <= new Date(dateRange.end); }
    let ma = true; const a = Number(inv.total_amount); if (amountFilter === 'low') ma = a < 5000; else if (amountFilter === 'medium') ma = a >= 5000 && a < 20000; else if (amountFilter === 'high') ma = a >= 20000;
    return ms && mt && md && ma;
  }), [invoices, searchQuery, currentTab, dateRange, amountFilter]);

  const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedInvoices = filteredInvoices.slice(startIndex, startIndex + itemsPerPage);

  const toggleSelectAll = () => setSelectedIds(selectedIds.length === paginatedInvoices.length ?[] : paginatedInvoices.map(i => i.id));
  const toggleSelect = (id: string) => setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);

  const handleBulkAction = async (action: string) => {
    if (!selectedIds.length) { toast.error('Select at least one invoice'); return; }
    if (action === 'mark-paid') {
      const { error } = await supabase.from('hr_invoices').update({ status: 'Paid', updated_at: new Date().toISOString() }).in('id', selectedIds);
      if (error) toast.error('Failed'); else { toast.success(`${selectedIds.length} marked Paid`); fetchInvoices(); }
    } else if (action === 'delete') {
      toast.warning(`Delete ${selectedIds.length} invoices?`, { action: { label: 'Delete', onClick: async () => { const { error } = await supabase.from('hr_invoices').delete().in('id', selectedIds); if (error) toast.error('Failed'); else { toast.success('Deleted'); fetchInvoices(); } } }, cancel: { label: 'Cancel' } });
    }
    setSelectedIds([]);
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    const inv = invoices.find(i => i.id === id);
    if (newStatus === 'Paid' || newStatus === 'Partially Paid') {
      const remaining = Number(inv.total_amount) - Number(inv.paid_amount || 0);
      setPaymentType('full');
      setPaymentData({ id, status: newStatus, amount: remaining, date: format(new Date(), 'yyyy-MM-dd'), method: 'Bank Transfer' });
      setIsPaymentDialogOpen(true);
      return;
    }
    await performStatusUpdate(id, newStatus, inv.paid_amount, null, null);
  };

  const performStatusUpdate = async (id: string, status: string, paidAmount: number, date: string | null, method: string | null) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const inv = invoices.find(i => i.id === id);
      const final = (status === 'Paid' && paidAmount < Number(inv.total_amount)) ? 'Partially Paid' : status;
      const { error } = await supabase.from('hr_invoices').update({ status: final, paid_amount: paidAmount, payment_date: date, payment_method: method, updated_by: user?.id, updated_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
      toast.success(`Updated to ${final}`);
      setIsPaymentDialogOpen(false);
      fetchInvoices();
    } catch { toast.error('Failed to update'); }
  };

  const handleDelete = (id: string) => {
    toast.warning('Are you sure?', { description: 'This cannot be undone.', action: { label: 'Delete', onClick: async () => { const { error } = await supabase.from('hr_invoices').delete().eq('id', id); if (error) toast.error('Failed'); else { toast.success('Deleted'); fetchInvoices(); } } }, cancel: { label: 'Cancel' } });
  };

  // ── EDIT BILLING ─────────────────────────────────────────────────────────────
  const openBillingEdit = (inv: any, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const cd = inv.client_details || {};
    setBillingEditId(inv.id);
    setBillingForm({ name: cd.name || inv.client_name || '', address: cd.address || '', city: cd.city || '', state: cd.state || '', zipCode: cd.zipCode || '', country: cd.country || 'India', taxId: cd.taxId || '', currency: cd.currency || inv.currency || 'INR' });
    setIsBillingEditOpen(true);
  };

  const saveBillingDetails = async () => {
    const snapshot = { name: billingForm.name, address: billingForm.address, city: billingForm.city, state: billingForm.state, zipCode: billingForm.zipCode, country: billingForm.country, taxId: billingForm.taxId, currency: billingForm.currency };
    const { error } = await supabase.from('hr_invoices').update({ client_details: snapshot, client_name: billingForm.name, updated_at: new Date().toISOString() }).eq('id', billingEditId);
    if (error) toast.error('Failed to save billing details');
    else { toast.success('Billing details updated'); setIsBillingEditOpen(false); fetchInvoices(); }
  };

  const getStatusIcon = (s: string) => {
    const l = s.toLowerCase();
    if (l === 'paid') return <CheckCircle className="h-3 w-3 text-green-600" />;
    if (l === 'unpaid') return <Clock className="h-3 w-3 text-yellow-600" />;
    if (l === 'overdue') return <AlertTriangle className="h-3 w-3 text-red-600" />;
    if (l === 'partially paid') return <DollarSign className="h-3 w-3 text-blue-600" />;
    return <FileText className="h-3 w-3 text-gray-500" />;
  };

  const getLastStatusChange = (inv: any) => {
    if (!inv.status_history) return null;
    const h = Array.isArray(inv.status_history) ? inv.status_history : JSON.parse(inv.status_history);
    if (!h.length) return null;
    const last = h[h.length - 1];
    return last?.changed_at ? new Date(last.changed_at) : null;
  };

  const getRelativeTime = (d: Date | null) => {
    if (!d) return '';
    const s = Math.floor((Date.now() - d.getTime()) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
    return format(d, 'dd MMM yyyy');
  };

  const fmtAmt = (inv: any) => {
    const n = Number(inv.total_amount); const c = inv.client_details?.currency || inv.currency || 'INR';
    if (c === 'USD') return `$${n.toLocaleString()}`; if (c === 'GBP') return `£${n.toLocaleString()}`; if (c === 'EUR') return `€${n.toLocaleString()}`;
    return `₹${n.toLocaleString()}`;
  };

  const openPreview = (inv: any) => { setPreviewInvoice({ ...inv, items: typeof inv.items === 'string' ? JSON.parse(inv.items) : inv.items ||[] }); setIsPreviewOpen(true); };

  return (
    <div className="p-6 space-y-6 bg-gray-50/50 min-h-screen">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div><h1 className="text-2xl font-bold text-gray-800 tracking-tight">Client Invoices</h1><p className="text-sm text-gray-500">Manage billing and payments for your clients.</p></div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowFilters(!showFilters)} className="border-purple-200 text-purple-700 hover:bg-purple-50"><Filter className="h-4 w-4 mr-2" />{showFilters ? 'Hide' : 'Show'} Filters</Button>
          <Button onClick={() => { setSelectedInvoice(null); setIsCreateOpen(true); }} className="bg-purple-600 hover:bg-purple-700 shadow-sm"><Plus className="h-4 w-4 mr-2" /> Create Invoice</Button>
        </div>
      </div>

      {/* HEALTH SCORE */}
      <Card className="border-none shadow-md bg-gradient-to-r from-purple-50 to-blue-50">
        <CardContent className="p-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-700">Payment Health Score:</span>
            <span className={`text-2xl font-bold ${paymentHealthScore >= 80 ? 'text-green-600' : paymentHealthScore >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>{paymentHealthScore}%</span>
            <span className="text-2xl">{paymentHealthScore >= 80 ? '🟢' : paymentHealthScore >= 60 ? '🟡' : '🔴'}</span>
          </div>
          <Button variant="outline" size="sm" className="text-blue-600 border-blue-200 hover:bg-blue-50"><FileText className="h-4 w-4 mr-2" />Generate Report</Button>
        </CardContent>
      </Card>

      {/* STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[{ label: 'Total Invoiced', stat: stats.all, icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' }, { label: 'Total Paid', stat: stats.paid, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' }, { label: 'Total Overdue', stat: stats.overdue, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' }, { label: 'Total Draft', stat: stats.draft, icon: Edit, color: 'text-gray-600', bg: 'bg-gray-100' }].map((item, i) => (
          <Card key={i} className="shadow-sm border-none">
            <CardContent className="p-5 flex justify-between items-center">
              <div><p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{item.label}</p><h3 className="text-2xl font-bold text-gray-800 mt-1">₹{item.stat.amount.toLocaleString()}</h3><p className="text-xs text-gray-400 mt-1">{item.stat.count} invoices</p></div>
              <div className={`h-10 w-10 rounded-full flex items-center justify-center ${item.bg}`}><item.icon className={`h-5 w-5 ${item.color}`} /></div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* FILTERS */}
      {showFilters && (
        <Card className="shadow-sm border-purple-100">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-2 block">Date Range</label>
                <Select value={dateRange ? 'last-30' : 'all'} onValueChange={v => { if (v === 'all') setDateRange(null); else { const e = new Date(), s = new Date(); s.setDate(s.getDate() - 30); setDateRange({ start: s.toISOString().split('T')[0], end: e.toISOString().split('T')[0] }); } }}>
                  <SelectTrigger className="bg-white"><SelectValue placeholder="All Time" /></SelectTrigger>
                  <SelectContent><SelectItem value="all">All Time</SelectItem><SelectItem value="last-30">Last 30 Days</SelectItem></SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-2 block">Amount Range</label>
                <Select value={amountFilter} onValueChange={setAmountFilter}>
                  <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="all">All Amounts</SelectItem><SelectItem value="low">&lt; ₹5,000</SelectItem><SelectItem value="medium">₹5,000 – ₹20,000</SelectItem><SelectItem value="high">&gt; ₹20,000</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="flex items-end"><Button variant="outline" className="w-full" onClick={() => { setDateRange(null); setAmountFilter('all'); }}><X className="h-4 w-4 mr-2" />Clear Filters</Button></div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* SEARCH & BULK */}
      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input placeholder="Search by Invoice # or Client Name..." className="pl-10 bg-white border-gray-200" value={searchQuery} onChange={e => updateParams({ search: e.target.value, page: '1' })} />
        </div>
        {selectedIds.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">{selectedIds.length} selected</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="outline" className="border-purple-200">Bulk Actions <ChevronRight className="h-4 w-4 ml-2" /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem onClick={() => handleBulkAction('mark-paid')}><CheckCircle className="h-4 w-4 mr-2" />Mark as Paid</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleBulkAction('delete')} className="text-red-600"><Trash2 className="h-4 w-4 mr-2" />Delete Selected</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {/* TABS & TABLE */}
      <Tabs value={currentTab} onValueChange={v => updateParams({ status: v, page: '1' })} className="w-full">
        <TabsList className="inline-flex h-auto items-center rounded-full bg-slate-100 p-1 shadow-inner w-full sm:w-auto overflow-x-auto">
          {['all', 'draft', 'paid', 'unpaid', 'overdue', 'partially paid', 'cancelled'].map(tab => {
            const isActive = currentTab === tab;
            return (
              <TabsTrigger key={tab} value={tab} className="relative rounded-full px-4 py-1.5 text-xs font-medium transition-colors duration-200 text-slate-500 data-[state=active]:text-white data-[state=active]:bg-transparent data-[state=active]:shadow-none capitalize flex items-center gap-2 z-10">
                {isActive && <motion.div layoutId="active-pill-inv" className="absolute inset-0 bg-purple-600 rounded-full shadow-md z-[-1]" transition={{ type: 'spring', stiffness: 300, damping: 30 }} />}
                <span className="relative z-10">{tab}</span>
                <span className={`relative z-10 px-1.5 py-0.5 rounded-full text-[10px] ${isActive ? 'bg-white/20 text-white' : 'bg-white text-slate-600 shadow-sm'}`}>{stats[tab as keyof typeof stats]?.count || 0}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value={currentTab} className="mt-4">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <div className="min-w-[980px]">
                {/* HEADER */}
                <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50/80 border-b text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <div className="col-span-1 flex items-center">
                    <button onClick={toggleSelectAll} className="hover:bg-gray-200 p-1 rounded">
                      {selectedIds.length === paginatedInvoices.length && paginatedInvoices.length > 0 ? <CheckSquare className="h-4 w-4 text-purple-600" /> : <Square className="h-4 w-4" />}
                    </button>
                  </div>
                  <div className="col-span-2">Invoice #</div>
                  <div className="col-span-2">Client</div>
                  <div className="col-span-2">Amount</div>
                  <div className="col-span-1">Method</div>
                  <div className="col-span-2">Status</div>
                  <div className="col-span-2 text-center">Actions</div>
                </div>

                {/* ROWS */}
                <div className="divide-y divide-gray-100">
                  {isLoading ? (
                    <div className="py-20 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-purple-600" /></div>
                  ) : paginatedInvoices.length === 0 ? (
                    <div className="py-20 text-center text-gray-500 text-sm">No invoices found.</div>
                  ) : paginatedInvoices.map(inv => (
                    <div key={inv.id} className={`grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-gray-50/50 transition-colors text-sm cursor-pointer ${selectedIds.includes(inv.id) ? 'bg-purple-50/50' : ''}`} onClick={() => openPreview(inv)}>
                      <div className="col-span-1" onClick={e => e.stopPropagation()}>
                        <button onClick={() => toggleSelect(inv.id)} className="hover:bg-gray-200 p-1 rounded">{selectedIds.includes(inv.id) ? <CheckSquare className="h-4 w-4 text-purple-600" /> : <Square className="h-4 w-4" />}</button>
                      </div>
                      <div className="col-span-2 font-medium text-gray-900">{inv.invoice_number}</div>
                      <div className="col-span-2">
                        <span className="text-gray-900 font-medium truncate block">{inv.client_name}</span>
                        <span className="text-[10px] text-gray-400">{inv.invoice_date ? format(new Date(inv.invoice_date), 'dd MMM yyyy') : '-'}</span>
                      </div>

                      {/* Amount popover */}
                      <Popover>
                        <PopoverTrigger asChild onClick={e => e.stopPropagation()}>
                          <div className="col-span-2 font-semibold text-purple-700 hover:text-purple-800 cursor-pointer underline decoration-dotted">
                            {fmtAmt(inv)}
                            <span className="text-[10px] text-gray-400 font-normal block">Due: {inv.due_date ? format(new Date(inv.due_date), 'dd MMM') : '-'}</span>
                          </div>
                        </PopoverTrigger>
                        <PopoverContent className="w-60" align="start">
                          <div className="space-y-2 text-sm">
                            <h4 className="font-bold border-b pb-1">Summary</h4>
                            <div className="flex justify-between"><span className="text-gray-500">Subtotal:</span><span>₹{Number(inv.subtotal).toLocaleString()}</span></div>
                            <div className="flex justify-between"><span className="text-gray-500">Tax:</span><span>₹{Number(inv.tax_amount).toLocaleString()}</span></div>
                            {Number(inv.tds_amount) > 0 && <div className="flex justify-between text-red-500"><span>TDS (-):</span><span>₹{Number(inv.tds_amount).toLocaleString()}</span></div>}
                            <div className="flex justify-between pt-1 border-t font-bold text-purple-700"><span>Total:</span><span>{fmtAmt(inv)}</span></div>
                          </div>
                        </PopoverContent>
                      </Popover>

                      <div className="col-span-1 text-gray-600 text-xs">{inv.payment_method || '—'}</div>

                      {/* Status */}
                      <div className="col-span-2" onClick={e => e.stopPropagation()}>
                        <div className="flex flex-col items-start gap-1.5">
                          <Select value={inv.status} onValueChange={v => handleStatusChange(inv.id, v)}>
                            <SelectTrigger className={`h-7 px-3 w-auto min-w-[110px] max-w-[150px] border rounded-full flex items-center gap-2 text-xs font-semibold shadow-sm focus:ring-0 focus:ring-offset-0 ${statusStyles[inv.status] || 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                              <span>{getStatusIcon(inv.status)}</span><span className="truncate">{inv.status}</span>
                            </SelectTrigger>
                            <SelectContent align="start">{['Draft', 'Unpaid', 'Paid', 'Partially Paid', 'Overdue', 'Cancelled'].map(st => <SelectItem key={st} value={st} className="text-xs font-medium">{st}</SelectItem>)}</SelectContent>
                          </Select>
                          {getLastStatusChange(inv) && (
                            <Popover>
                              <PopoverTrigger asChild>
                                <button className={`flex items-center gap-1 text-[10px] pl-1 font-medium hover:opacity-80 outline-none ${inv.status === 'Paid' ? 'text-green-600' : inv.status === 'Unpaid' ? 'text-yellow-600' : inv.status === 'Overdue' ? 'text-red-600' : inv.status === 'Partially Paid' ? 'text-blue-600' : 'text-slate-500'}`}>
                                  <Clock className="h-3 w-3" /><span>{getRelativeTime(getLastStatusChange(inv))}</span>
                                </button>
                              </PopoverTrigger>
                              <PopoverContent className="w-72 p-0 shadow-xl" align="start">
                                <div className="p-4 bg-white rounded-lg">
                                  <h4 className="font-semibold text-xs text-gray-900 mb-3 flex items-center gap-2 border-b pb-2"><Clock className="h-3.5 w-3.5 text-purple-600" />Status History</h4>
                                  <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                                    {(() => { const h = inv.status_history ? (Array.isArray(inv.status_history) ? inv.status_history : JSON.parse(inv.status_history)) :[]; return h.length > 0 ? h.slice().reverse().map((c: any, i: number) => (<div key={i} className="flex items-start gap-3"><div className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ring-2 ring-white ${c.status === 'Paid' ? 'bg-green-500' : c.status === 'Overdue' ? 'bg-red-500' : 'bg-gray-300'}`} /><div><span className="text-xs font-medium text-gray-900 block">{c.status}</span><span className="text-[10px] text-gray-500">{c.changed_at ? format(new Date(c.changed_at), 'dd MMM, HH:mm') : '-'}</span></div></div>)) : <div className="text-xs text-gray-400 text-center py-2">No history</div>; })()}
                                  </div>
                                </div>
                              </PopoverContent>
                            </Popover>
                          )}
                        </div>
                      </div>

                      {/* ACTIONS — 5 buttons: View, Edit, Billing, Download, Delete */}
                      <div className="col-span-2 flex justify-end" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center space-x-1 rounded-full bg-slate-100 p-1 shadow-sm border border-slate-200">
                          {[
                            { icon: Eye, tip: 'View Invoice', onClick: () => setViewInvoiceId(inv.id), hover: 'hover:bg-purple-600 hover:text-white' },
                            { icon: Edit, tip: 'Edit Invoice', onClick: () => { setSelectedInvoice(inv); setIsCreateOpen(true); }, hover: 'hover:bg-purple-600 hover:text-white' },
                            { icon: UserCog, tip: 'Edit Billing Details', onClick: (e: React.MouseEvent) => openBillingEdit(inv, e), hover: 'hover:bg-indigo-600 hover:text-white' },
                            { 
                              icon: Download, 
                              tip: 'Download PDF', 
                              onClick: async () => { 
                                try {
                                  toast.info('Generating PDF...');
                                  await printInvoicePDF(inv.id);
                                  toast.success('Downloaded!');
                                } catch (error) {
                                  toast.error('Failed to download PDF');
                                }
                              }, 
                              hover: 'hover:bg-purple-600 hover:text-white' 
                            },
                            { icon: Trash2, tip: 'Delete', onClick: () => handleDelete(inv.id), hover: 'hover:bg-red-600 hover:text-white' },
                          ].map(({ icon: Icon, tip, onClick, hover }) => (
                            <TooltipProvider key={tip}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className={`h-7 w-7 rounded-full text-slate-500 transition-colors ${hover}`} onClick={onClick as any}><Icon className="h-3.5 w-3.5" /></Button>
                                </TooltipTrigger>
                                <TooltipContent><p>{tip}</p></TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* PAGINATION */}
            {filteredInvoices.length > 0 && (
              <div className="flex items-center justify-between px-6 py-4 bg-gray-50/50 border-t">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>Show</span>
                  <Select value={itemsPerPage.toString()} onValueChange={v => updateParams({ limit: v, page: '1' })}><SelectTrigger className="h-8 w-16 bg-white"><SelectValue /></SelectTrigger><SelectContent>{['5', '10', '20'].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select>
                  <span>per page</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 mr-2">{startIndex + 1}–{Math.min(startIndex + itemsPerPage, filteredInvoices.length)} of {filteredInvoices.length}</span>
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateParams({ page: String(Math.max(currentPage - 1, 1)) })} disabled={currentPage === 1}><ChevronLeft className="h-4 w-4" /></Button>
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateParams({ page: String(Math.min(currentPage + 1, totalPages)) })} disabled={currentPage === totalPages}><ChevronRight className="h-4 w-4" /></Button>
                </div>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* CREATE / EDIT */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{selectedInvoice ? 'Edit Invoice' : 'Create Client Invoice'}</DialogTitle></DialogHeader>
          <InvoiceForm invoice={selectedInvoice} onClose={() => setIsCreateOpen(false)} onSuccess={fetchInvoices} />
        </DialogContent>
      </Dialog>

      {/* VIEW */}
      <Dialog open={!!viewInvoiceId} onOpenChange={open => !open && setViewInvoiceId(null)}>
        <DialogContent className="max-w-4xl h-[90vh] p-0 overflow-hidden bg-gray-50"><InvoiceDetails invoiceId={viewInvoiceId} /></DialogContent>
      </Dialog>

      {/* PAYMENT DIALOG */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader><DialogTitle>Record Payment</DialogTitle></DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="space-y-3">
              <Label>Payment Type</Label>
              <div className="flex gap-4">
                {(['full', 'manual'] as const).map(type => (
                  <label key={type} className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" className="w-4 h-4 accent-purple-600" checked={paymentType === type} onChange={() => { const inv = invoices.find(i => i.id === paymentData.id); const bal = Number(inv.total_amount) - Number(inv.paid_amount || 0); setPaymentType(type); setPaymentData(p => ({ ...p, amount: type === 'full' ? bal : '' })); }} />
                    <span className="text-sm font-medium">{type === 'full' ? 'Fully Paid' : 'Manual Amount'}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Amount Received</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">{(invoices.find(i => i.id === paymentData.id)?.client_details?.currency || invoices.find(i => i.id === paymentData.id)?.currency) === 'USD' ? '$' : '₹'}</span>
                <Input type="number" placeholder="0.00" className="pl-7" value={paymentData.amount} disabled={paymentType === 'full'} onChange={e => setPaymentData(p => ({ ...p, amount: e.target.value === '' ? '' : Number(e.target.value) }))} />
              </div>
              {paymentType === 'full' && <p className="text-[10px] text-purple-600 font-medium italic">Auto-calculated remaining balance</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Payment Date</Label><Input type="date" value={paymentData.date} onChange={e => setPaymentData(p => ({ ...p, date: e.target.value }))} /></div>
              <div className="space-y-2">
                <Label>Method</Label>
                <Select value={paymentData.method} onValueChange={v => setPaymentData(p => ({ ...p, method: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{['Bank Transfer', 'UPI', 'Cash', 'Cheque', 'Wire Transfer', 'PayPal'].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>Cancel</Button>
            <Button disabled={!paymentData.amount || Number(paymentData.amount) <= 0} onClick={() => { const inv = invoices.find(i => i.id === paymentData.id); const paidNow = Number(paymentData.amount); const newTotal = Number(inv.paid_amount || 0) + paidNow; const fs = newTotal >= Number(inv.total_amount) ? 'Paid' : 'Partially Paid'; performStatusUpdate(paymentData.id, fs, newTotal, paymentData.date, paymentData.method); }}>Save Payment</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* EDIT BILLING DIALOG */}
      <Dialog open={isBillingEditOpen} onOpenChange={setIsBillingEditOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><UserCog className="h-5 w-5 text-purple-600" />Edit Billing Details</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-slate-500 -mt-2">Changes apply only to this invoice. The original client record is not affected.</p>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2 col-span-2"><Label className="text-xs font-bold text-slate-600 uppercase">Billing Name *</Label><Input value={billingForm.name} onChange={e => setBillingForm(p => ({ ...p, name: e.target.value }))} placeholder="Client / Company name" /></div>
            <div className="space-y-2"><Label className="text-xs font-bold text-slate-600 uppercase">Address</Label><Input value={billingForm.address} onChange={e => setBillingForm(p => ({ ...p, address: e.target.value }))} placeholder="Street address" /></div>
            <div className="space-y-2"><Label className="text-xs font-bold text-slate-600 uppercase">City</Label><Input value={billingForm.city} onChange={e => setBillingForm(p => ({ ...p, city: e.target.value }))} placeholder="City" /></div>
            <div className="space-y-2"><Label className="text-xs font-bold text-slate-600 uppercase">State</Label><Input value={billingForm.state} onChange={e => setBillingForm(p => ({ ...p, state: e.target.value }))} placeholder="State" /></div>
            <div className="space-y-2"><Label className="text-xs font-bold text-slate-600 uppercase">ZIP / Postal Code</Label><Input value={billingForm.zipCode} onChange={e => setBillingForm(p => ({ ...p, zipCode: e.target.value }))} placeholder="e.g. 400001" /></div>
            <div className="space-y-2"><Label className="text-xs font-bold text-slate-600 uppercase">Country</Label><Input value={billingForm.country} onChange={e => setBillingForm(p => ({ ...p, country: e.target.value }))} placeholder="Country" /></div>
            <div className="space-y-2"><Label className="text-xs font-bold text-slate-600 uppercase">GST / Tax ID</Label><Input value={billingForm.taxId} onChange={e => setBillingForm(p => ({ ...p, taxId: e.target.value }))} placeholder="GSTIN / Tax ID" /></div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-600 uppercase">Currency</Label>
              <Select value={billingForm.currency} onValueChange={v => setBillingForm(p => ({ ...p, currency: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="INR">₹ INR</SelectItem><SelectItem value="USD">$ USD</SelectItem><SelectItem value="GBP">£ GBP</SelectItem><SelectItem value="EUR">€ EUR</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsBillingEditOpen(false)}>Cancel</Button>
            <Button onClick={saveBillingDetails} className="bg-purple-600 hover:bg-purple-700 text-white">Save Billing Details</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* PREVIEW SHEET */}
      <Sheet open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <SheetContent side="right" className="w-full sm:max-w-2xl p-0 overflow-hidden">
          <SheetHeader className="p-6 border-b bg-white"><SheetTitle>Invoice Preview</SheetTitle></SheetHeader>
          {previewInvoice && (
            <div className="flex flex-col h-[calc(100vh-60px)]">
              <div className="p-6 border-b bg-white flex items-center justify-between">
                <div><h3 className="text-xl font-extrabold text-gray-900">{previewInvoice.invoice_number}</h3><p className="text-sm text-gray-500">{previewInvoice.client_name}</p></div>
                <span className={`px-4 py-1.5 rounded-full text-xs font-bold border shadow-sm ${previewInvoice.status === 'Paid' ? 'bg-green-50 text-green-700 border-green-200' : previewInvoice.status === 'Overdue' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'}`}>{previewInvoice.status}</span>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/30">
                <Card className="border-2 border-gray-100 bg-white">
                  <CardContent className="p-0">
                    <div className="h-1.5 w-full bg-purple-600" />
                    <div className="p-6 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Bill To</p>
                          <p className="font-bold text-gray-900 text-xs">{previewInvoice.client_details?.name || previewInvoice.client_name}</p>
                          {previewInvoice.client_details?.address && <p className="text-[10px] text-gray-500">{previewInvoice.client_details.address}</p>}
                          {(previewInvoice.client_details?.city || previewInvoice.client_details?.state) && <p className="text-[10px] text-gray-500">{[previewInvoice.client_details?.city, previewInvoice.client_details?.state].filter(Boolean).join(', ')}</p>}
                          {previewInvoice.client_details?.taxId && <p className="text-[10px] text-gray-500">GST: {previewInvoice.client_details.taxId}</p>}
                        </div>
                        <div className="text-right space-y-2">
                          <div><p className="text-[10px] font-bold text-gray-400 uppercase">Invoice Date</p><p className="text-xs font-semibold">{previewInvoice.invoice_date ? format(new Date(previewInvoice.invoice_date), 'dd MMM, yyyy') : '-'}</p></div>
                          <div><p className="text-[10px] font-bold text-gray-400 uppercase">Due Date</p><p className="text-xs font-semibold">{previewInvoice.due_date ? format(new Date(previewInvoice.due_date), 'dd MMM, yyyy') : '-'}</p></div>
                        </div>
                      </div>
                      <div className="bg-purple-50 p-4 rounded-xl flex justify-between items-center border border-purple-100">
                        <span className="text-xs font-bold text-purple-700 uppercase">Amount Due</span>
                        <span className="text-xl font-black text-purple-700">{fmtAmt(previewInvoice)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <div className="bg-gray-50/80 p-3 rounded-xl border border-gray-100">
                  <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 px-1">Quick Actions</h4>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { label: 'View', icon: Eye, onClick: () => setViewInvoiceId(previewInvoice.id) },
                      { label: 'Edit', icon: Edit, onClick: () => { setSelectedInvoice(previewInvoice); setIsCreateOpen(true); } },
                      { label: 'Billing', icon: UserCog, onClick: (e: any) => openBillingEdit(previewInvoice, e) },
                      { 
                        label: 'Download', 
                        icon: Download, 
                        onClick: async () => { 
                          try {
                            toast.info('Preparing PDF...');
                            await printInvoicePDF(previewInvoice.id);
                            toast.success('Downloaded!');
                          } catch (error) {
                            toast.error('Failed to download PDF');
                          }
                        } 
                      },
                    ].map(({ label, icon: Icon, onClick }) => (
                      <Button key={label} variant="ghost" size="sm" className="h-9 bg-white border border-gray-200 hover:border-purple-300 hover:bg-purple-50 text-gray-700 hover:text-purple-700 text-[10px] font-semibold shadow-sm" onClick={onClick as any}>
                        <Icon className="h-4 w-4 mr-1 text-purple-600" />{label}
                      </Button>
                    ))}
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

export default InvoicesPage;