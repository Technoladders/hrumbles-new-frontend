import React, { useState, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, Search, PackagePlus, Check, ChevronsUpDown } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { toast } from 'sonner';
import { format, addDays } from 'date-fns';
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

// --- HELPERS (FY Logic) ---
const getFinancialYear = () => {
  const today = new Date();
  const month = today.getMonth() + 1;
  const year = today.getFullYear();
  const startYear = month <= 3 ? year - 1 : year;
  const endYear = (startYear + 1).toString().slice(-2);
  return `${startYear.toString().slice(-2)}-${endYear}`;
};

const generateNextInvoiceNumber = async (orgId: string) => {
  const fy = getFinancialYear();
  const { count, error } = await supabase
    .from('hr_invoices')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', orgId)
    .like('invoice_number', `x.ai/${fy}/%`);
  
  if (error) {
    console.error('Error fetching invoice count:', error);
    return `x.ai/${fy}/001`; // Fallback
  }
  
  const nextNum = (count || 0) + 1;
  return `x.ai/${fy}/${nextNum.toString().padStart(3, '0')}`;
};

const defaultItem = { id: '1', title: '', description: '', quantity: 1, rate: "", amount: 0, tax_percentage: 18, tax_value: 0, total_amount: 0 };

const OrganizationInvoiceForm: React.FC<any> = ({ invoice, onClose, onSuccess }) => {
  const creatorOrgId = useSelector((state: any) => state.auth.organization_id);
  const creatorUserId = useSelector((state: any) => state.auth.user?.id);

  // --- STATE ---
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [itemCatalog, setItemCatalog] = useState<any[]>([]);
  const [taxMaster, setTaxMaster] = useState<{ gst: any[], igst: any[], tds: any[], tcs: any[] }>({ gst: [], igst: [], tds: [], tcs: [] });
  const [billerProfile, setBillerProfile] = useState<any>(null);
  const [clientProfile, setClientProfile] = useState<any>(null);

  const [invoiceNumber, setInvoiceNumber] = useState(invoice?.invoice_number || '');
  // --- 2. Robust Setting Parsing ---
  const [targetOrgId, setTargetOrgId] = useState(invoice?.organization_client_id || '');
  
  // Logic: if tax_applicable column is null, check if tax_amount was > 0 in old record
  const [taxApplicable, setTaxApplicable] = useState<boolean>(
    invoice?.tax_applicable ?? (Number(invoice?.tax_amount || 0) > 0)
  );

  const [taxMode, setTaxMode] = useState<'GST' | 'IGST' | null>(invoice?.tax_mode || 'GST');
  const [paymentTerms, setPaymentTerms] = useState<string>(invoice?.payment_terms || 'NET 30');
  
  const [adjustmentType, setAdjustmentType] = useState<'none' | 'TDS' | 'TCS'>(
    Number(invoice?.tds_amount || 0) > 0 ? 'TDS' : Number(invoice?.tcs_amount || 0) > 0 ? 'TCS' : 'none'
  );
  const [adjustmentRateId, setAdjustmentRateId] = useState<string>(
    invoice?.tds_rate_id || invoice?.tcs_rate_id || ''
  );
  
  // --- 1. Robust Item Parsing for Legacy Data ---
  const initialItems = useMemo(() => {
    if (!invoice?.items) return [defaultItem];
    try {
      const parsed = typeof invoice.items === 'string' ? JSON.parse(invoice.items) : invoice.items;
      if (!Array.isArray(parsed)) return [defaultItem];
      
      return parsed.map((item: any) => ({
        ...item,
        // Fallback title to description if title is missing
        title: item.title || item.description || 'Service',
        // Fallback tax to the old invoice-level tax_rate or 18%
        tax_percentage: item.tax_percentage ?? (Number(invoice.tax_rate) > 0 ? Number(invoice.tax_rate) : 18),
        tax_value: item.tax_value ?? 0,
        total_amount: item.total_amount ?? item.amount ?? 0
      }));
    } catch (e) {
      console.error("Failed to parse legacy items:", e);
      return [defaultItem];
    }
  }, [invoice]);

  const [items, setItems] = useState<any[]>(initialItems);
  


  const [invoiceDate, setInvoiceDate] = useState<Date>(invoice?.invoice_date ? new Date(invoice.invoice_date) : new Date());
  const [dueDate, setDueDate] = useState<Date>(invoice?.due_date ? new Date(invoice.due_date) : addDays(new Date(), 30));

  const [notes, setNotes] = useState(invoice?.notes || '');
  const [terms, setTerms] = useState(invoice?.terms || '');

  // Catalog Creation Modal
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [newCatalogItem, setNewCatalogItem] = useState({ title: '', description: '', rate: '', tax: 18 });

  // --- FETCHING DATA ---
  const fetchCatalog = async () => {
    const { data } = await supabase.from('hr_invoice_items_master').select('*').eq('organization_id', creatorOrgId);
    setItemCatalog(data || []);
  };

  useEffect(() => {
    const init = async () => {
if (!invoice) {
      const nextNumber = await generateNextInvoiceNumber(creatorOrgId);
      setInvoiceNumber(nextNumber);
    }
      const { data: bProf } = await supabase.from('hr_organization_profile').select('*').eq('organization_id', creatorOrgId).single();
      setBillerProfile(bProf);
      
      const { data: taxes } = await supabase.from('hr_tax_master').select('*').eq('is_active', true);
      if (taxes) {
        setTaxMaster({
          gst: taxes.filter(t => t.type === 'GST'),
          igst: taxes.filter(t => t.type === 'IGST'),
          tds: taxes.filter(t => t.type === 'TDS'),
          tcs: taxes.filter(t => t.type === 'TCS'),
        });
      }
      
      const { data: orgs } = await supabase.from('hr_organizations').select('*').neq('id', creatorOrgId);
      setOrganizations(orgs || []);
      fetchCatalog();
    };
    init();
  }, [creatorOrgId, invoice]);

  // Tax Mode & State detection - Only auto-detect if no saved value
  useEffect(() => {
    if (!targetOrgId || !billerProfile) return;
    const fetchClient = async () => {
      const { data: cProf } = await supabase.from('hr_organization_profile').select('*').eq('organization_id', targetOrgId).single();
      setClientProfile(cProf);
      // Only set taxMode if not already set from invoice data
      if (cProf && !invoice?.tax_mode) {
        setTaxMode(cProf.state?.toLowerCase() === billerProfile.state?.toLowerCase() ? 'GST' : 'IGST');
      }
    };
    fetchClient();
  }, [targetOrgId, billerProfile, invoice?.tax_mode]);

  // Due Date Logic
  useEffect(() => {
    if (paymentTerms === 'custom') return;
    
    if (paymentTerms === 'Due on Receipt') {
      setDueDate(invoiceDate);
      return;
    }

    const days = parseInt(paymentTerms.replace('NET ', '')) || 0;
    setDueDate(addDays(invoiceDate, days));
  }, [paymentTerms, invoiceDate]);

  // Recalculate items when taxApplicable changes
  useEffect(() => {
    setItems(prevItems => 
      prevItems.map(item => ({
        ...item,
        tax_value: taxApplicable ? (item.amount * (item.tax_percentage ?? 18)) / 100 : 0,
        total_amount: item.amount + (taxApplicable ? (item.amount * (item.tax_percentage ?? 18)) / 100 : 0)
      }))
    );
  }, [taxApplicable]);

  // --- HANDLERS ---
  const updateItem = (index: number, updates: any) => {
    const newItems = [...items];
    const item = { ...newItems[index], ...updates };
    const qty = item.quantity === "" ? 0 : Number(item.quantity);
    const rate = item.rate === "" ? 0 : Number(item.rate);
    item.amount = qty * rate;
    item.tax_value = taxApplicable ? (item.amount * (item.tax_percentage ?? 18)) / 100 : 0;
    item.total_amount = item.amount + item.tax_value;
    newItems[index] = item;
    setItems(newItems);
  };

  const handleSaveToCatalog = async () => {
    if (!newCatalogItem.title) return toast.error("Title is required");
    const { error } = await supabase.from('hr_invoice_items_master').insert([{
      organization_id: creatorOrgId,
      title: newCatalogItem.title,
      description: newCatalogItem.description,
      default_rate: Number(newCatalogItem.rate),
      default_tax_rate: newCatalogItem.tax
    }]);

    if (!error) {
      toast.success("Added to Master Catalog");
      fetchCatalog();
      setIsAddItemModalOpen(false);
      setNewCatalogItem({ title: '', description: '', rate: '', tax: 18 });
    }
  };

  const handleSubmit = async (status: string) => {
    const payload = {
      invoice_number: invoiceNumber,
      client_name: clientProfile?.company_name || '',
      organization_client_id: targetOrgId,
      organization_id: creatorOrgId,
      created_by: creatorUserId,
      invoice_date: format(invoiceDate, 'yyyy-MM-dd'),
      due_date: format(dueDate, 'yyyy-MM-dd'),
      payment_terms: paymentTerms,
      status,
      items,
      subtotal: summary.subtotal,
      tax_amount: summary.totalTax,
      total_amount: summary.grandTotal,
      tax_applicable: taxApplicable,
      tax_mode: taxMode,
      tds_amount: adjustmentType === 'TDS' ? summary.adjustment : 0,
      tcs_amount: adjustmentType === 'TCS' ? summary.adjustment : 0,
      tds_rate_id: adjustmentType === 'TDS' ? adjustmentRateId : null,
      tcs_rate_id: adjustmentType === 'TCS' ? adjustmentRateId : null,
      notes,
      terms,
      type: 'Organization'
    };

    const { error } = invoice?.id 
      ? await supabase.from('hr_invoices').update(payload).eq('id', invoice.id)
      : await supabase.from('hr_invoices').insert([payload]);

    if (error) toast.error(error.message);
    else { toast.success("Invoice Saved"); onSuccess(); onClose(); }
  };

  const summary = useMemo(() => {
    const subtotal = items.reduce((acc, curr) => acc + curr.amount, 0);
    const totalTax = taxApplicable ? items.reduce((acc, curr) => acc + curr.tax_value, 0) : 0;
    const taxBreakdown = taxApplicable ? items.reduce((acc: any, curr) => {
        const rate = curr.tax_percentage ?? 18;
        if (!acc[rate]) acc[rate] = 0;
        acc[rate] += curr.tax_value;
        return acc;
    }, {}) : {};
    const adjRate = [...taxMaster.tds, ...taxMaster.tcs].find(t => t.id === adjustmentRateId)?.value || 0;
    const adjValue = (subtotal * adjRate) / 100;

    return {
      subtotal,
      totalTax,
      taxBreakdown,
      adjustment: adjValue,
      grandTotal: subtotal + totalTax + (adjustmentType === 'TCS' ? adjValue : adjustmentType === 'TDS' ? -adjValue : 0)
    };
  }, [items, adjustmentType, adjustmentRateId, taxMaster, taxApplicable]);

  // Rest of the component remains the same...
  return (
    <div className="space-y-6 p-1 pb-10 max-h-[90vh] overflow-y-auto custom-scrollbar">
      {/* HEADER: CUSTOMER & TAX */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 bg-white p-6 rounded-xl border border-slate-200">
        <div className="space-y-4">
          <Label className="text-xs font-bold text-slate-500 uppercase">Customer Information</Label>
          <Select value={targetOrgId} onValueChange={setTargetOrgId}>
            <SelectTrigger className="h-10 shadow-sm"><SelectValue placeholder="Select Customer" /></SelectTrigger>
            <SelectContent>
              {organizations.map(org => <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>)}
            </SelectContent>
          </Select>
          {clientProfile && (
            <div className="text-[11px] text-slate-500 bg-slate-50 p-3 rounded-lg border border-dashed border-slate-300">
               <p className="font-bold text-slate-700">{clientProfile.company_name}</p>
               <p>{clientProfile.address_line1}, {clientProfile.city}, {clientProfile.state}</p>
               <p className="mt-2">GSTIN: <span className="text-purple-600 font-bold uppercase">{clientProfile.tax_id || 'N/A'}</span></p>
            </div>
          )}
        </div>

        <div className="space-y-4 border-l pl-6">
           <Label className="text-xs font-bold text-slate-500 uppercase">Tax Configuration</Label>
           <div className="grid grid-cols-2 gap-6 items-center">
              <div className="space-y-2">
                 <span className="text-[10px] text-slate-400 font-bold uppercase">Tax Applicability</span>
                 <RadioGroup value={taxApplicable ? "yes" : "no"} onValueChange={(v) => setTaxApplicable(v === 'yes')} className="flex gap-4">
                    <div className="flex items-center space-x-1"><RadioGroupItem value="yes" id="y" /><Label htmlFor="y" className="text-xs">Yes</Label></div>
                    <div className="flex items-center space-x-1"><RadioGroupItem value="no" id="n" /><Label htmlFor="n" className="text-xs">No</Label></div>
                 </RadioGroup>
              </div>
              {taxApplicable && (
                <div className="space-y-2">
                   <span className="text-[10px] text-slate-400 font-bold uppercase">Place of Supply</span>
                   <Select value={taxMode || ''} onValueChange={(v: any) => setTaxMode(v)}>
                      <SelectTrigger className="h-9 text-xs font-bold bg-white"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="GST">Intra State (GST)</SelectItem>
                        <SelectItem value="IGST">Inter State (IGST)</SelectItem>
                      </SelectContent>
                   </Select>
                </div>
              )}
           </div>
        </div>
      </div>

      {/* TIMELINE */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border">
          <div className="space-y-1">
            <Label className="text-[10px] font-bold text-slate-500 uppercase">Invoice Number</Label>
            <Input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} className="h-9 text-xs font-bold bg-white" />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] font-bold text-slate-500 uppercase">Invoice Date</Label>
            <Input type="date" value={format(invoiceDate, 'yyyy-MM-dd')} onChange={(e) => setInvoiceDate(new Date(e.target.value))} className="h-9 text-xs bg-white" />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] font-bold text-slate-500 uppercase">Payment Terms</Label>
            <Select value={paymentTerms} onValueChange={setPaymentTerms}>
                <SelectTrigger className="h-9 text-xs bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                    {['Due on Receipt', 'NET 15', 'NET 30', 'NET 45', 'NET 60', 'NET 90', 'custom'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] font-bold text-slate-500 uppercase">Due Date</Label>
            <Input type="date" value={format(dueDate, 'yyyy-MM-dd')} disabled={paymentTerms !== 'custom'} onChange={(e) => setDueDate(new Date(e.target.value))} className="h-9 text-xs bg-white disabled:opacity-70" />
          </div>
      </div>

      {/* ITEMS TABLE */}
      <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
        <table className="w-full text-[11px]">
          <thead className="bg-slate-100 border-b">
            <tr className="text-slate-500 font-bold uppercase tracking-tighter">
              <th className="p-3 text-left w-[35%]">Item Details (Search Catalog)</th>
              <th className="p-3 text-center w-20">Qty</th>
              <th className="p-3 text-center w-28">Rate</th>
              <th className="p-3 text-center w-28">Amount</th>
              {taxApplicable && (
                <>
                  <th className="p-3 text-center w-28">Tax Slab</th>
                  <th className="p-3 text-center w-28">Tax Amount</th>
                  <th className="p-3 text-right w-32">Total</th>
                </>
              )}
              {!taxApplicable && <th className="p-3 text-right w-[60%]"></th>}
              <th className="p-3 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {items.map((item, idx) => (
              <tr key={item.id} className="hover:bg-slate-50/30">
                <td className="p-3 space-y-2">
                  {/* Searchable Combobox for Items */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" role="combobox" className="w-full h-8 justify-between text-[10px] border-dashed font-semibold bg-slate-50">
                        <Search className="h-3 w-3 mr-2 opacity-50" />
                        Search Items Catalog...
                        <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search service title..." />
                        <CommandList>
                          <CommandEmpty className="p-2 text-center">
                            <p className="text-[10px] mb-2 text-slate-500">No matching item found.</p>
                            <Button size="sm" variant="outline" className="h-7 text-[10px] w-full" onClick={() => setIsAddItemModalOpen(true)}>
                               <PackagePlus className="h-3 w-3 mr-1" /> Add New to Catalog
                            </Button>
                          </CommandEmpty>
                          <CommandGroup heading="Master Catalog">
                            {itemCatalog.map((cat) => (
                              <CommandItem
                                key={cat.id}
                                onSelect={() => {
                                  updateItem(idx, { 
                                    title: cat.title, 
                                    description: cat.description, 
                                    rate: cat.default_rate, 
                                    tax_percentage: cat.default_tax_rate 
                                  });
                                }}
                                className="text-[11px] cursor-pointer"
                              >
                                <Check className={cn("mr-2 h-3 w-3", item.title === cat.title ? "opacity-100" : "opacity-0")} />
                                <div className="flex flex-col">
                                  <span>{cat.title}</span>
                                  <span className="text-[9px] text-slate-400 truncate w-48">{cat.description}</span>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>

                  <Input value={item.title} onChange={(e) => updateItem(idx, { title: e.target.value })} placeholder="Item Title" className="h-8 font-bold text-xs" />
                  <Textarea value={item.description} onChange={(e) => updateItem(idx, { description: e.target.value })} placeholder="Detailed description..." rows={1} className="text-[9px] h-9 resize-none leading-tight" />
                </td>
                <td className="p-3 align-top"><Input value={item.quantity} onChange={(e) => updateItem(idx, { quantity: e.target.value === "" ? "" : Number(e.target.value) })} className="text-center h-8" /></td>
                <td className="p-3 align-top"><Input value={item.rate} onChange={(e) => updateItem(idx, { rate: e.target.value === "" ? "" : Number(e.target.value) })} className="text-center h-8" /></td>
                <td className="p-3 align-top text-center font-medium pt-5">₹{item.amount.toLocaleString()}</td>
                {taxApplicable && (
                  <>
                    <td className="p-3 align-top">
                      <Select value={(item.tax_percentage ?? 18).toString()} onValueChange={(v) => updateItem(idx, { tax_percentage: Number(v) })}>
                        <SelectTrigger className="h-8 text-[10px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {(taxMode === 'GST' ? taxMaster.gst : taxMaster.igst).map(r => <SelectItem key={r.id} value={r.value.toString()}>{r.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-3 align-top text-center text-slate-500 pt-5">₹{item.tax_value.toLocaleString()}</td>
                    <td className="p-3 align-top text-right font-bold pt-5 text-slate-900">₹{item.total_amount.toLocaleString()}</td>
                  </>
                )}
                {!taxApplicable && <td className="p-3 align-top text-right font-bold pt-5 text-slate-900">₹{item.amount.toLocaleString()}</td>}
                <td className="p-3 align-top pt-4">
                  <Button variant="ghost" size="icon" onClick={() => setItems(items.filter((_, i) => i !== idx))} className="h-8 w-8 text-red-400 hover:bg-red-50"><Trash2 className="h-4 w-4" /></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="p-3 bg-slate-50 border-t flex justify-between items-center">
            <Button variant="ghost" size="sm" className="text-purple-600 font-bold hover:bg-white" onClick={() => setItems([...items, { id: Date.now().toString(), title: '', description: '', quantity: 1, rate: "", amount: 0, tax_percentage: 18, tax_value: 0, total_amount: 0 }])}>
              <Plus className="h-4 w-4 mr-2" /> Add New Row
            </Button>
            <Button variant="outline" size="sm" className="h-7 text-[10px] text-slate-500" onClick={() => setIsAddItemModalOpen(true)}>
              <PackagePlus className="h-3 w-3 mr-1" /> New Catalog Item
            </Button>
        </div>
      </div>

      {/* SUMMARY SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div className="space-y-1"><Label className="text-[10px] font-bold text-slate-500 uppercase">Customer Notes</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} /></div>
          <div className="space-y-1"><Label className="text-[10px] font-bold text-slate-500 uppercase">Terms & Conditions</Label><Textarea value={terms} onChange={(e) => setTerms(e.target.value)} rows={3} /></div>
        </div>

        <div className="bg-white border rounded-xl p-6 shadow-sm space-y-4">
            <div className="flex justify-between text-sm text-slate-600 font-medium">
              <span>Sub Total</span>
              <span className="font-bold text-slate-900">₹{summary.subtotal.toLocaleString()}</span>
            </div>

            {taxApplicable && Object.entries(summary.taxBreakdown).map(([rate, value]: any) => (
              <div key={rate} className="space-y-2 border-t pt-2 mt-2">
                {taxMode === 'GST' ? (
                  <>
                    <div className="flex justify-between text-[11px] text-slate-500">
                      <span>CGST ({Number(rate)/2}%)</span>
                      <span>₹{(value/2).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-500">
                      <span>SGST ({Number(rate)/2}%)</span>
                      <span>₹{(value/2).toLocaleString()}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>IGST ({rate}%)</span>
                    <span>₹{value.toLocaleString()}</span>
                  </div>
                )}
              </div>
            ))}

            <div className="border-y py-4 space-y-4 bg-slate-50/50 px-3 rounded-lg">
                <RadioGroup value={adjustmentType} onValueChange={(v: any) => { setAdjustmentType(v); setAdjustmentRateId(''); }} className="flex gap-4">
                  <div className="flex items-center space-x-1"><RadioGroupItem value="none" id="adj0" /><Label htmlFor="adj0" className="text-[10px] font-bold">None</Label></div>
                  <div className="flex items-center space-x-1"><RadioGroupItem value="TDS" id="adj1" /><Label htmlFor="adj1" className="text-[10px] font-bold">TDS</Label></div>
                  <div className="flex items-center space-x-1"><RadioGroupItem value="TCS" id="adj2" /><Label htmlFor="adj2" className="text-[10px] font-bold">TCS</Label></div>
                </RadioGroup>

                {adjustmentType !== 'none' && (
                  <div className="flex items-center gap-4">
                    <Select value={adjustmentRateId} onValueChange={setAdjustmentRateId}>
                      <SelectTrigger className="h-8 text-[10px] w-full bg-white"><SelectValue placeholder={`Select ${adjustmentType} Rate...`} /></SelectTrigger>
                      <SelectContent>
                        {(adjustmentType === 'TDS' ? taxMaster.tds : taxMaster.tcs).map(r => (
                          <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span className={`text-xs font-bold w-32 text-right ${adjustmentType === 'TDS' ? 'text-red-500' : 'text-green-600'}`}>
                      {adjustmentType === 'TDS' ? '-' : '+'} ₹{summary.adjustment.toLocaleString()}
                    </span>
                  </div>
                )}
            </div>

            <div className="flex justify-between items-center pt-2">
              <span className="text-xl font-black text-slate-800 uppercase tracking-tighter">Total ( ₹ )</span>
              <span className="text-3xl font-black text-purple-700">₹{summary.grandTotal.toLocaleString()}</span>
            </div>
        </div>
      </div>

      {/* ACTION FOOTER */}
      <div className="flex justify-end gap-3 pt-6 border-t bg-slate-100 p-4 -mx-1 -mb-1 rounded-b-xl">
        <Button variant="ghost" onClick={onClose} className="px-8 font-bold">Cancel</Button>
        <Button variant="secondary" onClick={() => handleSubmit('Draft')} className="px-8 font-bold">Save as Draft</Button>
        <Button onClick={() => handleSubmit('Unpaid')} className="px-12 font-black bg-purple-600 hover:bg-purple-700 text-white shadow-lg">
          SAVE AND SEND
        </Button>
      </div>

      {/* MASTER CATALOG ADD MODAL */}
      <Dialog open={isAddItemModalOpen} onOpenChange={setIsAddItemModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><PackagePlus className="h-5 w-5" /> New Master Catalog Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-xs">Service Title</Label>
              <Input value={newCatalogItem.title} onChange={(e) => setNewCatalogItem({...newCatalogItem, title: e.target.value})} placeholder="e.g. Software Development" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Detailed Description</Label>
              <Textarea value={newCatalogItem.description} onChange={(e) => setNewCatalogItem({...newCatalogItem, description: e.target.value})} placeholder="Describe the scope of service..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">Default Rate (₹)</Label>
                <Input type="number" value={newCatalogItem.rate} onChange={(e) => setNewCatalogItem({...newCatalogItem, rate: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Default Tax Rate (%)</Label>
                <Select value={newCatalogItem.tax.toString()} onValueChange={(v) => setNewCatalogItem({...newCatalogItem, tax: Number(v)})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">0%</SelectItem>
                    <SelectItem value="5">5%</SelectItem>
                    <SelectItem value="12">12%</SelectItem>
                    <SelectItem value="18">18%</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddItemModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveToCatalog} className="bg-purple-600 text-white">Save Item</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OrganizationInvoiceForm;