import React, { useState, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, Search, PackagePlus, Check, ChevronsUpDown, UserPlus, Users } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { toast } from 'sonner';
import { format, addDays } from 'date-fns';
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const getFinancialYear = () => {
  const today = new Date();
  const m = today.getMonth() + 1;
  const y = today.getFullYear();
  const start = m <= 3 ? y - 1 : y;
  return `${start.toString().slice(-2)}-${(start + 1).toString().slice(-2)}`;
};

const generateNextInvoiceNumber = async (orgId: string): Promise<string> => {
  const fy = getFinancialYear();
  const { data: org } = await supabase.from('hr_organizations').select('invoice_prefix, name').eq('id', orgId).single();
  const prefix = org?.invoice_prefix || org?.name?.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 4) || 'INV';
  const { count } = await supabase.from('hr_invoices').select('id', { count: 'exact', head: true }).eq('organization_id', orgId).eq('type', 'Client');
  return `${prefix}/${fy}/${((count || 0) + 1).toString().padStart(3, '0')}`;
};

const mkItem = () => ({ id: Date.now().toString(), title: '', description: '', quantity: 1, rate: '' as string | number, amount: 0, tax_percentage: 18, tax_value: 0, total_amount: 0 });

const InvoiceForm: React.FC<{ invoice?: any; onClose: () => void; onSuccess: () => void }> = ({ invoice, onClose, onSuccess }) => {
  const creatorOrgId = useSelector((state: any) => state.auth.organization_id);
  const creatorUserId = useSelector((state: any) => state.auth.user?.id);

  const [clientMode, setClientMode] = useState<'select' | 'manual'>(invoice?.client_id ? 'select' : 'manual');
  const [selectedClientId, setSelectedClientId] = useState(invoice?.client_id || '');
  const [clients, setClients] = useState<any[]>([]);

  // clientDetails is ALWAYS populated and saved as a snapshot on the invoice
  const [clientDetails, setClientDetails] = useState(() => {
    if (invoice?.client_details) {
      return {
        name: invoice.client_details.name || invoice.client_name || '',
        address: invoice.client_details.address || '',
        city: invoice.client_details.city || '',
        state: invoice.client_details.state || '',
        zipCode: invoice.client_details.zipCode || '',
        country: invoice.client_details.country || 'India',
        currency: (invoice.client_details.currency || 'INR') as 'INR' | 'USD' | 'GBP' | 'EUR',
        taxId: invoice.client_details.taxId || '',
      };
    }
    return { name: invoice?.client_name || '', address: '', city: '', state: '', zipCode: '', country: 'India', currency: 'INR' as const, taxId: '' };
  });

  const [billerProfile, setBillerProfile] = useState<any>(null);
  const [taxApplicable, setTaxApplicable] = useState<boolean>(invoice?.tax_applicable ?? true);
  const [taxMode, setTaxMode] = useState<'GST' | 'IGST' | null>(invoice?.tax_mode || 'GST');
  const [taxMaster, setTaxMaster] = useState<{ gst: any[]; igst: any[]; tds: any[]; tcs: any[] }>({ gst: [], igst: [], tds: [], tcs: [] });
  const [adjustmentType, setAdjustmentType] = useState<'none' | 'TDS' | 'TCS'>(Number(invoice?.tds_amount || 0) > 0 ? 'TDS' : Number(invoice?.tcs_amount || 0) > 0 ? 'TCS' : 'none');
  const [adjustmentRateId, setAdjustmentRateId] = useState(invoice?.tds_rate_id || invoice?.tcs_rate_id || '');
  const [invoiceNumber, setInvoiceNumber] = useState(invoice?.invoice_number || '');
  const [invoiceDate, setInvoiceDate] = useState<Date>(invoice?.invoice_date ? new Date(invoice.invoice_date) : new Date());
  const [dueDate, setDueDate] = useState<Date>(invoice?.due_date ? new Date(invoice.due_date) : addDays(new Date(), 30));
  const [paymentTerms, setPaymentTerms] = useState(invoice?.payment_terms || 'NET 30');
  const [notes, setNotes] = useState(invoice?.notes || '');
  const [terms, setTerms] = useState(invoice?.terms || '');

  const [items, setItems] = useState<any[]>(() => {
    if (!invoice?.items) return [mkItem()];
    try {
      const p = typeof invoice.items === 'string' ? JSON.parse(invoice.items) : invoice.items;
      return Array.isArray(p) && p.length > 0 ? p.map((i: any) => ({ ...i, title: i.title || i.description || '', tax_percentage: i.tax_percentage ?? 18, tax_value: i.tax_value ?? 0, total_amount: i.total_amount ?? i.amount ?? 0 })) : [mkItem()];
    } catch { return [mkItem()]; }
  });

  const [itemCatalog, setItemCatalog] = useState<any[]>([]);
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [newCatalogItem, setNewCatalogItem] = useState({ title: '', description: '', rate: '', tax: 18 });

  useEffect(() => {
    const init = async () => {
      if (!invoice) { const num = await generateNextInvoiceNumber(creatorOrgId); setInvoiceNumber(num); }
      const [{ data: bProf }, { data: taxes }, { data: clientData }, { data: catalog }] = await Promise.all([
        supabase.from('hr_organization_profile').select('*').eq('organization_id', creatorOrgId).single(),
        supabase.from('hr_tax_master').select('*').eq('is_active', true),
        supabase.from('hr_clients').select('id,display_name,client_name,billing_address,address,city,state,postal_code,country,currency,payment_terms').eq('organization_id', creatorOrgId).eq('status', 'active'),
        supabase.from('hr_invoice_items_master').select('*').eq('organization_id', creatorOrgId),
      ]);
      setBillerProfile(bProf);
      setClients(clientData || []);
      setItemCatalog(catalog || []);
      if (taxes) setTaxMaster({ gst: taxes.filter(t => t.type === 'GST'), igst: taxes.filter(t => t.type === 'IGST'), tds: taxes.filter(t => t.type === 'TDS'), tcs: taxes.filter(t => t.type === 'TCS') });
      // For old invoices that have client_id but no snapshot yet
      if (invoice?.client_id && !invoice?.client_details && clientData) {
        const cl = clientData.find((c: any) => c.id === invoice.client_id);
        if (cl) applyClientData(cl, bProf);
      }
    };
    init();
  }, [creatorOrgId]);

  const applyClientData = (cl: any, bProf?: any) => {
    const ba = cl.billing_address || {};
    const state = ba.state || cl.state || '';
    const currency = cl.currency || 'INR';
    setClientDetails({ name: cl.display_name || cl.client_name, address: ba.street || cl.address || '', city: ba.city || cl.city || '', state, zipCode: ba.zipCode || cl.postal_code || '', country: ba.country || cl.country || 'India', currency, taxId: '' });
    if (currency === 'INR') {
      const bs = (bProf || billerProfile)?.state?.toLowerCase();
      if (bs) setTaxMode(state.toLowerCase() === bs ? 'GST' : 'IGST');
      setTaxApplicable(true);
    } else { setTaxApplicable(false); }
    if (cl.payment_terms) setPaymentTerms(`NET ${cl.payment_terms}`);
  };

  const handleClientSelect = (id: string) => {
    setSelectedClientId(id);
    const cl = clients.find(c => c.id === id);
    if (cl) applyClientData(cl);
  };

  useEffect(() => {
    if (paymentTerms === 'custom') return;
    if (paymentTerms === 'Due on Receipt') { setDueDate(invoiceDate); return; }
    setDueDate(addDays(invoiceDate, parseInt(paymentTerms.replace('NET ', '')) || 30));
  }, [paymentTerms, invoiceDate]);

  useEffect(() => {
    setItems(prev => prev.map(item => { const tv = taxApplicable ? (item.amount * (item.tax_percentage ?? 18)) / 100 : 0; return { ...item, tax_value: tv, total_amount: item.amount + tv }; }));
  }, [taxApplicable]);

  const updateItem = (idx: number, upd: any) => {
    const ns = [...items]; const item = { ...ns[idx], ...upd };
    const qty = item.quantity === '' ? 0 : Number(item.quantity);
    const rate = item.rate === '' ? 0 : Number(item.rate);
    item.amount = qty * rate;
    item.tax_value = taxApplicable ? (item.amount * (item.tax_percentage ?? 18)) / 100 : 0;
    item.total_amount = item.amount + item.tax_value;
    ns[idx] = item; setItems(ns);
  };

  const fetchCatalog = async () => { const { data } = await supabase.from('hr_invoice_items_master').select('*').eq('organization_id', creatorOrgId); setItemCatalog(data || []); };

  const handleSaveToCatalog = async () => {
    if (!newCatalogItem.title) return toast.error('Title is required');
    const { error } = await supabase.from('hr_invoice_items_master').insert([{ organization_id: creatorOrgId, title: newCatalogItem.title, description: newCatalogItem.description, default_rate: Number(newCatalogItem.rate), default_tax_rate: newCatalogItem.tax }]);
    if (!error) { toast.success('Saved to catalog'); fetchCatalog(); setIsAddItemModalOpen(false); setNewCatalogItem({ title: '', description: '', rate: '', tax: 18 }); }
  };

  const summary = useMemo(() => {
    const subtotal = items.reduce((a, i) => a + i.amount, 0);
    const totalTax = taxApplicable ? items.reduce((a, i) => a + i.tax_value, 0) : 0;
    const taxBreakdown = taxApplicable ? items.reduce((acc: any, i) => { const r = i.tax_percentage ?? 18; acc[r] = (acc[r] || 0) + i.tax_value; return acc; }, {}) : {};
    const adjRate = [...taxMaster.tds, ...taxMaster.tcs].find(t => t.id === adjustmentRateId)?.value || 0;
    const adjustment = (subtotal * adjRate) / 100;
    const grandTotal = subtotal + totalTax + (adjustmentType === 'TCS' ? adjustment : adjustmentType === 'TDS' ? -adjustment : 0);
    return { subtotal, totalTax, taxBreakdown, adjustment, grandTotal };
  }, [items, adjustmentType, adjustmentRateId, taxMaster, taxApplicable]);

  const sym = { INR: '₹', USD: '$', GBP: '£', EUR: '€' }[clientDetails.currency] || '₹';
  const fmt = (n: number) => `${sym}${n.toLocaleString()}`;

  const handleSubmit = async (status: string) => {
    if (!clientDetails.name.trim()) return toast.error('Client name is required');
    if (summary.grandTotal <= 0) return toast.error('Invoice total must be greater than 0');

    const clientSnapshot = { name: clientDetails.name, address: clientDetails.address, city: clientDetails.city, state: clientDetails.state, zipCode: clientDetails.zipCode, country: clientDetails.country, taxId: clientDetails.taxId, currency: clientDetails.currency };

    const payload: any = {
      invoice_number: invoiceNumber, client_name: clientDetails.name,
      client_id: clientMode === 'select' ? selectedClientId || null : null,
      client_details: clientSnapshot,
      organization_id: creatorOrgId, created_by: creatorUserId,
      invoice_date: format(invoiceDate, 'yyyy-MM-dd'), due_date: format(dueDate, 'yyyy-MM-dd'),
      payment_terms: paymentTerms, status, items,
      subtotal: summary.subtotal, tax_amount: summary.totalTax, total_amount: summary.grandTotal,
      tax_applicable: taxApplicable, tax_mode: taxApplicable ? taxMode : null,
      tds_amount: adjustmentType === 'TDS' ? summary.adjustment : 0, tcs_amount: adjustmentType === 'TCS' ? summary.adjustment : 0,
      tds_rate_id: adjustmentType === 'TDS' ? adjustmentRateId || null : null, tcs_rate_id: adjustmentType === 'TCS' ? adjustmentRateId || null : null,
      currency: clientDetails.currency, notes, terms, type: 'Client',
    };

    const { error } = invoice?.id ? await supabase.from('hr_invoices').update(payload).eq('id', invoice.id) : await supabase.from('hr_invoices').insert([payload]);
    if (error) toast.error(error.message);
    else { toast.success('Invoice saved'); onSuccess(); onClose(); }
  };

  return (
    <div className="space-y-6 p-1 pb-10 max-h-[90vh] overflow-y-auto custom-scrollbar">
      {/* CLIENT INFO */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-bold text-slate-500 uppercase">Client Information</Label>
          <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs font-semibold">
            {([{ mode: 'select' as const, icon: Users, label: 'Select Client' }, { mode: 'manual' as const, icon: UserPlus, label: 'Manual Entry' }] as const).map(({ mode, icon: Icon, label }) => (
              <button key={mode} type="button" onClick={() => { setClientMode(mode); if (mode === 'select') setSelectedClientId(''); }} className={`flex items-center gap-1.5 px-3 py-1.5 transition-colors ${clientMode === mode ? 'bg-purple-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
                <Icon className="h-3.5 w-3.5" /> {label}
              </button>
            ))}
          </div>
        </div>

        {clientMode === 'select' && (
          <div className="space-y-3">
            <Select value={selectedClientId} onValueChange={handleClientSelect}>
              <SelectTrigger className="h-10 shadow-sm"><SelectValue placeholder="Search and select a client..." /></SelectTrigger>
              <SelectContent>
                {clients.map(c => (<SelectItem key={c.id} value={c.id}><span className="font-medium">{c.display_name || c.client_name}</span>{c.currency && c.currency !== 'INR' && <Badge variant="outline" className="ml-2 text-[9px] py-0">{c.currency}</Badge>}</SelectItem>))}
              </SelectContent>
            </Select>
            {selectedClientId && clientDetails.name && (
              <div className="text-[11px] text-slate-500 bg-slate-50 p-3 rounded-lg border border-dashed border-slate-300">
                <p className="font-bold text-slate-700">{clientDetails.name}</p>
                {clientDetails.address && <p>{clientDetails.address}</p>}
                {(clientDetails.city || clientDetails.state) && <p>{[clientDetails.city, clientDetails.state, clientDetails.zipCode].filter(Boolean).join(', ')}</p>}
                <div className="flex gap-3 mt-2 flex-wrap"><span className="font-medium text-purple-600">{clientDetails.currency}</span>{clientDetails.taxId && <span>GST: {clientDetails.taxId}</span>}</div>
              </div>
            )}
          </div>
        )}

        {/* Billing fields — always editable (manual mode) or as override (select mode) */}
        <div className={`grid grid-cols-1 md:grid-cols-2 gap-3 ${clientMode === 'select' && selectedClientId ? 'pt-3 border-t border-dashed border-slate-200' : ''}`}>
          {clientMode === 'select' && selectedClientId && (
            <p className="text-[10px] text-slate-400 italic md:col-span-2">Override billing details for this invoice (won't affect the CRM record).</p>
          )}
          <div className="space-y-1 md:col-span-2">
            <Label className="text-[10px] text-slate-500 uppercase font-bold">{clientMode === 'select' ? 'Billing Name' : 'Client / Company Name *'}</Label>
            <Input value={clientDetails.name} onChange={e => setClientDetails(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Acme Corporation" className="h-9" />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-slate-500 uppercase font-bold">Address</Label>
            <Input value={clientDetails.address} onChange={e => setClientDetails(p => ({ ...p, address: e.target.value }))} placeholder="Street address" className="h-9" />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-slate-500 uppercase font-bold">City</Label>
            <Input value={clientDetails.city} onChange={e => setClientDetails(p => ({ ...p, city: e.target.value }))} placeholder="City" className="h-9" />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-slate-500 uppercase font-bold">State <span className="text-slate-400 font-normal text-[9px]">(for GST/IGST)</span></Label>
            <Input value={clientDetails.state} onChange={e => { const state = e.target.value; setClientDetails(p => ({ ...p, state })); if (billerProfile && clientDetails.currency === 'INR') setTaxMode(state.toLowerCase() === billerProfile.state?.toLowerCase() ? 'GST' : 'IGST'); }} placeholder="e.g. Maharashtra" className="h-9" />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-slate-500 uppercase font-bold">ZIP / Postal Code</Label>
            <Input value={clientDetails.zipCode} onChange={e => setClientDetails(p => ({ ...p, zipCode: e.target.value }))} placeholder="e.g. 400001" className="h-9" />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-slate-500 uppercase font-bold">Country</Label>
            <Input value={clientDetails.country} onChange={e => setClientDetails(p => ({ ...p, country: e.target.value }))} placeholder="Country" className="h-9" />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-slate-500 uppercase font-bold">Currency</Label>
            <Select value={clientDetails.currency} onValueChange={(v: any) => { setClientDetails(p => ({ ...p, currency: v })); setTaxApplicable(v === 'INR'); }}>
              <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="INR">₹ INR – Indian Rupee</SelectItem>
                <SelectItem value="USD">$ USD – US Dollar</SelectItem>
                <SelectItem value="GBP">£ GBP – British Pound</SelectItem>
                <SelectItem value="EUR">€ EUR – Euro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-slate-500 uppercase font-bold">GST / Tax ID <span className="text-slate-400 font-normal">(optional)</span></Label>
            <Input value={clientDetails.taxId} onChange={e => setClientDetails(p => ({ ...p, taxId: e.target.value }))} placeholder="GSTIN / Tax ID" className="h-9" />
          </div>
        </div>
      </div>

      {/* TAX CONFIG */}
      <div className="bg-white p-4 rounded-xl border border-slate-200">
        <Label className="text-xs font-bold text-slate-500 uppercase mb-3 block">Tax Configuration</Label>
        <div className="flex flex-wrap gap-6 items-center">
          <div className="space-y-2">
            <span className="text-[10px] text-slate-400 font-bold uppercase">Tax Applicable</span>
            <RadioGroup value={taxApplicable ? 'yes' : 'no'} onValueChange={v => setTaxApplicable(v === 'yes')} className="flex gap-4">
              <div className="flex items-center space-x-1"><RadioGroupItem value="yes" id="ta-y" /><Label htmlFor="ta-y" className="text-xs">Yes</Label></div>
              <div className="flex items-center space-x-1"><RadioGroupItem value="no" id="ta-n" /><Label htmlFor="ta-n" className="text-xs">No</Label></div>
            </RadioGroup>
          </div>
          {taxApplicable && (
            <div className="space-y-2">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Tax Mode</span>
              <Select value={taxMode || ''} onValueChange={(v: any) => setTaxMode(v)}>
                <SelectTrigger className="h-9 text-xs bg-white w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="GST">Intra-State (CGST + SGST)</SelectItem>
                  <SelectItem value="IGST">Inter-State (IGST)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>

      {/* INVOICE META */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border">
        <div className="space-y-1"><Label className="text-[10px] font-bold text-slate-500 uppercase">Invoice Number</Label><Input value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} className="h-9 text-xs font-bold bg-white" /></div>
        <div className="space-y-1"><Label className="text-[10px] font-bold text-slate-500 uppercase">Invoice Date</Label><Input type="date" value={format(invoiceDate, 'yyyy-MM-dd')} onChange={e => setInvoiceDate(new Date(e.target.value))} className="h-9 text-xs bg-white" /></div>
        <div className="space-y-1">
          <Label className="text-[10px] font-bold text-slate-500 uppercase">Payment Terms</Label>
          <Select value={paymentTerms} onValueChange={setPaymentTerms}>
            <SelectTrigger className="h-9 text-xs bg-white"><SelectValue /></SelectTrigger>
            <SelectContent>{['Due on Receipt', 'NET 15', 'NET 30', 'NET 45', 'NET 60', 'NET 90', 'custom'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1"><Label className="text-[10px] font-bold text-slate-500 uppercase">Due Date</Label><Input type="date" value={format(dueDate, 'yyyy-MM-dd')} disabled={paymentTerms !== 'custom'} onChange={e => setDueDate(new Date(e.target.value))} className="h-9 text-xs bg-white disabled:opacity-70" /></div>
      </div>

      {/* ITEMS TABLE */}
      <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
        <table className="w-full text-[11px]">
          <thead className="bg-slate-100 border-b">
            <tr className="text-slate-500 font-bold uppercase tracking-tighter">
              <th className="p-3 text-left w-[35%]">Item (Search Catalog)</th>
              <th className="p-3 text-center w-20">Qty</th>
              <th className="p-3 text-center w-28">Rate ({sym})</th>
              <th className="p-3 text-center w-28">Amount</th>
              {taxApplicable && <><th className="p-3 text-center w-28">Tax Slab</th><th className="p-3 text-center w-24">Tax Amt</th><th className="p-3 text-right w-28">Total</th></>}
              {!taxApplicable && <th className="p-3 text-right w-28"></th>}
              <th className="p-3 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {items.map((item, idx) => (
              <tr key={item.id} className="hover:bg-slate-50/30">
                <td className="p-3 space-y-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" role="combobox" className="w-full h-8 justify-between text-[10px] border-dashed font-semibold bg-slate-50">
                        <Search className="h-3 w-3 mr-2 opacity-50" />Search catalog...<ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search service..." />
                        <CommandList>
                          <CommandEmpty className="p-2 text-center">
                            <p className="text-[10px] mb-2 text-slate-500">No match.</p>
                            <Button size="sm" variant="outline" className="h-7 text-[10px] w-full" onClick={() => setIsAddItemModalOpen(true)}><PackagePlus className="h-3 w-3 mr-1" /> Add to Catalog</Button>
                          </CommandEmpty>
                          <CommandGroup heading="Master Catalog">
                            {itemCatalog.map(cat => (
                              <CommandItem key={cat.id} onSelect={() => updateItem(idx, { title: cat.title, description: cat.description, rate: cat.default_rate, tax_percentage: cat.default_tax_rate })} className="text-[11px] cursor-pointer">
                                <Check className={cn("mr-2 h-3 w-3", item.title === cat.title ? "opacity-100" : "opacity-0")} />
                                <div className="flex flex-col"><span>{cat.title}</span><span className="text-[9px] text-slate-400 truncate w-48">{cat.description}</span></div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <Input value={item.title} onChange={e => updateItem(idx, { title: e.target.value })} placeholder="Item title" className="h-8 font-bold text-xs" />
                  <Textarea value={item.description} onChange={e => updateItem(idx, { description: e.target.value })} placeholder="Description (optional)" rows={1} className="text-[9px] h-9 resize-none" />
                </td>
                <td className="p-3 align-top"><Input value={item.quantity} onChange={e => updateItem(idx, { quantity: e.target.value === '' ? '' : Number(e.target.value) })} className="text-center h-8" /></td>
                <td className="p-3 align-top"><Input value={item.rate} onChange={e => updateItem(idx, { rate: e.target.value === '' ? '' : Number(e.target.value) })} className="text-center h-8" /></td>
                <td className="p-3 align-top text-center font-medium pt-5">{fmt(item.amount)}</td>
                {taxApplicable && (
                  <>
                    <td className="p-3 align-top">
                      <Select value={(item.tax_percentage ?? 18).toString()} onValueChange={v => updateItem(idx, { tax_percentage: Number(v) })}>
                        <SelectTrigger className="h-8 text-[10px]"><SelectValue /></SelectTrigger>
                        <SelectContent>{(taxMode === 'GST' ? taxMaster.gst : taxMaster.igst).map(r => <SelectItem key={r.id} value={r.value.toString()}>{r.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </td>
                    <td className="p-3 align-top text-center text-slate-500 pt-5">{fmt(item.tax_value)}</td>
                    <td className="p-3 align-top text-right font-bold pt-5 text-slate-900">{fmt(item.total_amount)}</td>
                  </>
                )}
                {!taxApplicable && <td className="p-3 align-top text-right font-bold pt-5">{fmt(item.amount)}</td>}
                <td className="p-3 align-top pt-4">
                  <Button variant="ghost" size="icon" onClick={() => setItems(items.filter((_, i) => i !== idx))} className="h-8 w-8 text-red-400 hover:bg-red-50"><Trash2 className="h-4 w-4" /></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="p-3 bg-slate-50 border-t flex justify-between items-center">
          <Button variant="ghost" size="sm" className="text-purple-600 font-bold hover:bg-white" onClick={() => setItems([...items, mkItem()])}><Plus className="h-4 w-4 mr-2" /> Add Row</Button>
          <Button variant="outline" size="sm" className="h-7 text-[10px] text-slate-500" onClick={() => setIsAddItemModalOpen(true)}><PackagePlus className="h-3 w-3 mr-1" /> New Catalog Item</Button>
        </div>
      </div>

      {/* SUMMARY */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div className="space-y-1"><Label className="text-[10px] font-bold text-slate-500 uppercase">Customer Notes</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Payment instructions, thank you note..." /></div>
          <div className="space-y-1"><Label className="text-[10px] font-bold text-slate-500 uppercase">Terms & Conditions</Label><Textarea value={terms} onChange={e => setTerms(e.target.value)} rows={3} placeholder="Late payment policy, refund terms..." /></div>
        </div>
        <div className="bg-white border rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex justify-between text-sm text-slate-600 font-medium"><span>Sub Total</span><span className="font-bold text-slate-900">{fmt(summary.subtotal)}</span></div>
          {taxApplicable && Object.entries(summary.taxBreakdown).map(([rate, value]: any) => (
            <div key={rate} className="space-y-2 border-t pt-2">
              {taxMode === 'GST' ? (<><div className="flex justify-between text-[11px] text-slate-500"><span>CGST ({Number(rate) / 2}%)</span><span>{fmt(value / 2)}</span></div><div className="flex justify-between text-[11px] text-slate-500"><span>SGST ({Number(rate) / 2}%)</span><span>{fmt(value / 2)}</span></div></>) : (<div className="flex justify-between text-[11px] text-slate-500"><span>IGST ({rate}%)</span><span>{fmt(value)}</span></div>)}
            </div>
          ))}
          <div className="border-y py-4 space-y-4 bg-slate-50/50 px-3 rounded-lg">
            <RadioGroup value={adjustmentType} onValueChange={(v: any) => { setAdjustmentType(v); setAdjustmentRateId(''); }} className="flex gap-4">
              {['none', 'TDS', 'TCS'].map(v => <div key={v} className="flex items-center space-x-1"><RadioGroupItem value={v} id={`adj-${v}`} /><Label htmlFor={`adj-${v}`} className="text-[10px] font-bold">{v === 'none' ? 'None' : v}</Label></div>)}
            </RadioGroup>
            {adjustmentType !== 'none' && (
              <div className="flex items-center gap-4">
                <Select value={adjustmentRateId} onValueChange={setAdjustmentRateId}>
                  <SelectTrigger className="h-8 text-[10px] w-full bg-white"><SelectValue placeholder={`Select ${adjustmentType} Rate...`} /></SelectTrigger>
                  <SelectContent>{(adjustmentType === 'TDS' ? taxMaster.tds : taxMaster.tcs).map(r => <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>)}</SelectContent>
                </Select>
                <span className={`text-xs font-bold w-32 text-right ${adjustmentType === 'TDS' ? 'text-red-500' : 'text-green-600'}`}>{adjustmentType === 'TDS' ? '-' : '+'} {fmt(summary.adjustment)}</span>
              </div>
            )}
          </div>
          <div className="flex justify-between items-center pt-2">
            <span className="text-xl font-black text-slate-800 uppercase tracking-tighter">Total ({clientDetails.currency})</span>
            <span className="text-3xl font-black text-purple-700">{fmt(summary.grandTotal)}</span>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <div className="flex justify-end gap-3 pt-6 border-t bg-slate-100 p-4 -mx-1 -mb-1 rounded-b-xl">
        <Button variant="ghost" onClick={onClose} className="px-8 font-bold">Cancel</Button>
        <Button variant="secondary" onClick={() => handleSubmit('Draft')} className="px-8 font-bold">Save as Draft</Button>
        <Button onClick={() => handleSubmit('Unpaid')} className="px-12 font-black bg-purple-600 hover:bg-purple-700 text-white shadow-lg">SAVE AND SEND</Button>
      </div>

      {/* CATALOG MODAL */}
      <Dialog open={isAddItemModalOpen} onOpenChange={setIsAddItemModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><PackagePlus className="h-5 w-5" /> New Catalog Item</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><Label className="text-xs">Title *</Label><Input value={newCatalogItem.title} onChange={e => setNewCatalogItem({ ...newCatalogItem, title: e.target.value })} placeholder="e.g. Software Development" /></div>
            <div className="space-y-2"><Label className="text-xs">Description</Label><Textarea value={newCatalogItem.description} onChange={e => setNewCatalogItem({ ...newCatalogItem, description: e.target.value })} placeholder="Scope of service..." /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label className="text-xs">Default Rate</Label><Input type="number" value={newCatalogItem.rate} onChange={e => setNewCatalogItem({ ...newCatalogItem, rate: e.target.value })} /></div>
              <div className="space-y-2"><Label className="text-xs">Default Tax (%)</Label><Select value={newCatalogItem.tax.toString()} onValueChange={v => setNewCatalogItem({ ...newCatalogItem, tax: Number(v) })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{[0, 5, 12, 18, 28].map(t => <SelectItem key={t} value={t.toString()}>{t}%</SelectItem>)}</SelectContent></Select></div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setIsAddItemModalOpen(false)}>Cancel</Button><Button onClick={handleSaveToCatalog} className="bg-purple-600 text-white">Save Item</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InvoiceForm;