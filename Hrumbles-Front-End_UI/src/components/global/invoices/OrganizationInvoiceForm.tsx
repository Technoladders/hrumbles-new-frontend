import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, IndianRupee, DollarSign, Calendar as CalendarIcon } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { supabase } from "@/integrations/supabase/client";

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

interface OrganizationInvoiceFormProps {
  invoice?: any;
  onClose: () => void;
  onSuccess: () => void;
}

const generateInvoiceNumber = () => {
  const prefix = 'GINV';
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  const timestamp = Date.now().toString().slice(-4);
  return `${prefix}-${randomNum}${timestamp}`;
};

const OrganizationInvoiceForm: React.FC<OrganizationInvoiceFormProps> = ({ invoice, onClose, onSuccess }) => {
  // This is the ID of the person CREATING the invoice (Hrumbles / Global Superadmin)
  const creatorOrganizationId = useSelector((state: any) => state.auth.organization_id);
  const creatorUserId = useSelector((state: any) => state.auth.user?.id);
  
  // --- STATE MANAGEMENT ---
  const [organizations, setOrganizations] = useState<any[]>([]);
  
  const [invoiceNumber, setInvoiceNumber] = useState(invoice?.invoice_number || generateInvoiceNumber());
  // This is the ID of the Organization RECEIVING the invoice
  const [targetOrgId, setTargetOrgId] = useState(invoice?.organization_client_id || ''); 
  const [targetOrgName, setTargetOrgName] = useState(invoice?.client_name || '');
  const [targetOrgAddress, setTargetOrgAddress] = useState(''); 
  const [currency, setCurrency] = useState<'USD' | 'INR'>(invoice?.currency || 'INR');
  
  const initialItems = invoice?.items 
    ? (typeof invoice.items === 'string' ? JSON.parse(invoice.items) : invoice.items) 
    : [{ id: '1', description: '', quantity: 1, rate: 0, amount: 0 }];

  const [items, setItems] = useState<InvoiceItem[]>(initialItems);
  const [notes, setNotes] = useState(invoice?.notes || '');
  const [terms, setTerms] = useState(invoice?.terms || '');
  const [taxRate, setTaxRate] = useState(invoice?.tax_rate || 18);
  const [subtotal, setSubtotal] = useState(0);
  const [taxAmount, setTaxAmount] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  
  const [invoiceDate, setInvoiceDate] = useState<Date | undefined>(invoice?.invoice_date ? new Date(invoice.invoice_date) : new Date());
  const [dueDate, setDueDate] = useState<Date | undefined>(invoice?.due_date ? new Date(invoice.due_date) : undefined);
  const [dueDateOption, setDueDateOption] = useState<string>('');
  
  const [errors, setErrors] = useState<any>({});

  // --- FETCH ORGANIZATIONS ---
  useEffect(() => {
    const fetchOrganizations = async () => {
      const { data, error } = await supabase
        .from('hr_organizations')
        .select('*')
        .neq('id', creatorOrganizationId); 

      if (error) {
        console.error('Error fetching organizations:', error);
        toast.error('Failed to load organizations');
      } else {
        setOrganizations(data || []);
      }
    };
    fetchOrganizations();
  }, [creatorOrganizationId]);

  // --- HANDLE ORGANIZATION CHANGE ---
  useEffect(() => {
    if (!targetOrgId) {
      setTargetOrgName('');
      setTargetOrgAddress('');
      return;
    }

    const fetchAndSet = async () => {
      const selectedOrg = organizations.find(org => org.id === targetOrgId);
      if (!selectedOrg) return;

      const { data: profileData } = await supabase
        .from('hr_organization_profile')
        .select('*')
        .eq('organization_id', targetOrgId)
        .single();

      let details = '';
      let orgName = selectedOrg.name;

      if (profileData) {
        orgName = profileData.company_name || selectedOrg.name;
        const addressParts = [
          profileData.address_line1,
          profileData.address_line2,
          profileData.city,
          profileData.state ? `${profileData.state}, ${profileData.zip_code}` : profileData.zip_code,
          profileData.country
        ].filter(Boolean);
        details = addressParts.length > 0 ? addressParts.join(', ') : 'No address available';
      } else {
        details = `Subdomain: ${selectedOrg.subdomain}, Plan: ${selectedOrg.subscription_plan || 'N/A'}`;
      }

      setTargetOrgName(orgName);
      setTargetOrgAddress(details);
      setCurrency('INR'); 
      setDueDateOption('net30');
    };

    fetchAndSet();
  }, [targetOrgId, organizations]);

  // --- CALCULATIONS ---
  useEffect(() => {
    const calculatedSubtotal = items.reduce((sum, item) => sum + item.amount, 0);
    const calculatedTaxAmount = currency === 'INR' ? calculatedSubtotal * (taxRate / 100) : 0;
    const calculatedTotal = calculatedSubtotal + calculatedTaxAmount;
    
    setSubtotal(calculatedSubtotal);
    setTaxAmount(calculatedTaxAmount);
    setTotalAmount(calculatedTotal);
  }, [items, taxRate, currency]);

  // --- DUE DATE LOGIC ---
  useEffect(() => {
    if (!invoiceDate || dueDateOption === 'custom') return;
    const newDueDate = new Date(invoiceDate);
    let daysToAdd = 30;
    switch (dueDateOption) {
      case 'on_receipt': daysToAdd = 0; break;
      case 'net15': daysToAdd = 15; break;
      case 'net30': daysToAdd = 30; break;
      case 'net45': daysToAdd = 45; break;
      case 'net60': daysToAdd = 60; break;
    }
    newDueDate.setDate(invoiceDate.getDate() + daysToAdd);
    setDueDate(newDueDate);
  }, [invoiceDate, dueDateOption]);

  // --- VALIDATION ---
  const validateForm = () => {
    const newErrors: any = {};
    if (!targetOrgId) newErrors.targetOrgId = 'Organization selection is required';
    if (!invoiceNumber.trim()) newErrors.invoiceNumber = 'Invoice number is required';
    if (!invoiceDate) newErrors.invoiceDate = 'Invoice date is required';
    if (!dueDate) newErrors.dueDate = 'Due date is required';
    
    if (items.length === 0) {
      newErrors.items = 'At least one item is required';
    } else {
      const itemErrors = items.map(item => {
        const error: any = {};
        if (!item.description.trim()) error.description = 'Required';
        if (item.quantity <= 0) error.quantity = '> 0';
        if (item.rate <= 0) error.rate = '> 0';
        return error;
      });
      if (itemErrors.some(err => Object.keys(err).length > 0)) newErrors.itemErrors = itemErrors;
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // --- CRUD HANDLERS ---
  const handleAddItem = () => {
    setItems([...items, { id: `item-${Date.now()}`, description: '', quantity: 1, rate: 0, amount: 0 }]);
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
    const newItems = [...items];
    const item = newItems[index];
    (item as any)[field] = value;
    if (field === 'quantity' || field === 'rate') {
        item.amount = item.quantity * item.rate;
    }
    setItems(newItems);
  };

  const handleRemoveItem = (index: number) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
  };

  const handleSubmit = async (status: 'Draft' | 'Unpaid') => {
    if (!validateForm()) {
      toast.error('Please fix errors');
      return;
    }

    const payload = {
      invoice_number: invoiceNumber,
      // FIX: Use the new column for Organization FK, and set client_id to null
      organization_client_id: targetOrgId, 
      client_id: null, 
      client_name: targetOrgName,
      organization_id: creatorOrganizationId, // This is Hrumbles (Biller)
      created_by: creatorUserId,
      invoice_date: invoiceDate ? format(invoiceDate, 'yyyy-MM-dd') : null,
      due_date: dueDate ? format(dueDate, 'yyyy-MM-dd') : null,
      status: status,
      currency: currency,
      notes: notes,
      terms: terms,
      items: items, 
      subtotal: subtotal,
      tax_rate: taxRate,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      type: 'Organization' // Explicitly marking this invoice type
    };

    console.log("Submitting Payload to hr_invoices:", payload);

    try {
      let error;
      if (invoice?.id) {
        // FIX: Table name is 'hr_invoices'
        const { error: updateError } = await supabase
          .from('hr_invoices') 
          .update(payload)
          .eq('id', invoice.id);
        error = updateError;
      } else {
        // FIX: Table name is 'hr_invoices'
        const { error: insertError } = await supabase
          .from('hr_invoices')
          .insert([payload]);
        error = insertError;
      }

      if (error) throw error;
      
      toast.success(invoice ? 'Invoice updated successfully' : 'Invoice created successfully');
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error saving invoice:', err);
      toast.error('Failed to save invoice: ' + err.message);
    }
  };

  const getCurrencySymbol = () => (currency === 'USD' ? <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /> : <IndianRupee className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />);
  const formatAmount = (amount: number) => (currency === 'USD' ? `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : `₹${amount.toLocaleString('en-IN')}`);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: Organization Selection */}
        <div className="space-y-4">
          <div>
            <Label>Organization (Customer)</Label>
            <Select value={targetOrgId} onValueChange={setTargetOrgId}>
              <SelectTrigger><SelectValue placeholder="Select Organization" /></SelectTrigger>
              <SelectContent>
                {organizations.map(org => (
                  <SelectItem key={org.id} value={org.id}>{org.name} ({org.subdomain})</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.targetOrgId && <p className="text-red-500 text-sm">{errors.targetOrgId}</p>}
          </div>
          <div>
            <Label>Details</Label>
            <div className="text-xs text-gray-500 leading-relaxed max-w-[250px]">
              {targetOrgAddress}
            </div>
          </div>
        </div>

        {/* Right: Invoice Meta */}
        <div className="space-y-4">
          <div>
            <Label>Invoice Number</Label>
            <Input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} />
            {errors.invoiceNumber && <p className="text-red-500 text-sm">{errors.invoiceNumber}</p>}
          </div>
          <div>
            <Label>Invoice Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {invoiceDate ? format(invoiceDate, 'PPP') : <span>Pick date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={invoiceDate} onSelect={setInvoiceDate} /></PopoverContent>
            </Popover>
          </div>
          {targetOrgId && (
             <>
                <div>
                    <Label htmlFor="dueDateOption">Payment Terms</Label>
                    <Select value={dueDateOption} onValueChange={setDueDateOption}>
                        <SelectTrigger id="dueDateOption"><SelectValue placeholder="Select payment terms..." /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="on_receipt">Due on Receipt</SelectItem>
                            <SelectItem value="net15">Net 15 (15 days)</SelectItem>
                            <SelectItem value="net30">Net 30 (30 days)</SelectItem>
                            <SelectItem value="net60">Net 60 (60 days)</SelectItem>
                            <SelectItem value="custom">Custom Date</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                {dueDateOption === 'custom' ? (
                    <div>
                        <Label>Due Date</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="w-full justify-start text-left font-normal">
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {dueDate ? format(dueDate, 'PPP') : <span>Pick date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={dueDate} onSelect={setDueDate} fromDate={invoiceDate} /></PopoverContent>
                        </Popover>
                    </div>
                ) : (
                    <div>
                        <Label>Due Date</Label>
                        <Input value={dueDate ? format(dueDate, 'PPP') : ''} readOnly disabled />
                    </div>
                )}
             </>
          )}
        </div>
      </div>

      {/* Items Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">Subscription / Services</h3>
          <Button size="sm" onClick={handleAddItem}><Plus className="h-4 w-4 mr-2" /> Add Item</Button>
        </div>
        <div className="border rounded-md">
          <div className="grid grid-cols-12 gap-4 p-4 bg-muted/30 border-b font-medium">
            <div className="col-span-4">Description</div>
            <div className="col-span-2">Quantity</div>
            <div className="col-span-2">Rate</div>
            <div className="col-span-2">Amount</div>
            <div className="col-span-2 text-right">Action</div>
          </div>
          <div className="divide-y">
            {items.map((item, index) => (
              <div key={item.id} className="grid grid-cols-12 gap-4 p-4 items-center">
                <div className="col-span-4">
                  <Input value={item.description} onChange={(e) => updateItem(index, 'description', e.target.value)} placeholder="e.g. Monthly Subscription" />
                  {errors.itemErrors?.[index]?.description && <p className="text-red-500 text-xs">{errors.itemErrors[index].description}</p>}
                </div>
                <div className="col-span-2">
                  <Input type="number" min="1" value={item.quantity} onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))} />
                </div>
                <div className="col-span-2 relative">
                  {getCurrencySymbol()}
                  <Input type="number" className="pl-10" value={item.rate} onChange={(e) => updateItem(index, 'rate', Number(e.target.value))} />
                </div>
                <div className="col-span-2 font-semibold">{formatAmount(item.amount)}</div>
                <div className="col-span-2 text-right">
                  <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(index)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                </div>
              </div>
            ))}
          </div>
        </div>
        {errors.items && <p className="text-red-500 text-sm mt-2">{errors.items}</p>}
      </div>

      {/* Footer / Totals */}
      <div className="grid grid-cols-2 gap-8">
        <div className="space-y-4">
          <div><Label>Notes</Label><Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
          <div><Label>Terms</Label><Textarea rows={3} value={terms} onChange={(e) => setTerms(e.target.value)} /></div>
        </div>
        <div className="space-y-4">
          <div className="flex justify-between p-4 bg-muted/30 rounded-md"><span>Subtotal:</span><span>{formatAmount(subtotal)}</span></div>
          <div className="flex items-center gap-4">
            <Label>Tax Rate</Label>
            <Select value={taxRate.toString()} onValueChange={(v) => setTaxRate(Number(v))}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
       <SelectItem value="0">0%</SelectItem>
                    <SelectItem value="5">5%</SelectItem>
                    <SelectItem value="12">12%</SelectItem>
                    <SelectItem value="18">18%</SelectItem>
                    <SelectItem value="28">28%</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex-1 text-right">{formatAmount(taxAmount)}</div>
          </div>
          <div className="flex justify-between p-4 bg-blue-50 rounded-md font-bold text-lg"><span>Total:</span><span>{formatAmount(totalAmount)}</span></div>
        </div>
      </div>

      <div className="flex justify-end gap-2 mt-8">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button variant="secondary" onClick={() => handleSubmit('Draft')}>Save Draft</Button>
        <Button onClick={() => handleSubmit('Unpaid')}>{invoice ? 'Update Invoice' : 'Create Invoice'}</Button>
      </div>
    </div>
  );
};

export default OrganizationInvoiceForm;