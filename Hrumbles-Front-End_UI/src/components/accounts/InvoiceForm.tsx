import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useAccountsStore, Invoice, InvoiceItem } from '@/lib/accounts-data';
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

interface InvoiceFormProps {
  invoice?: Invoice;
  onClose: () => void;
}

const USD_TO_INR_RATE = 84;

// --- YOUR EXISTING HELPER FUNCTIONS (PRESERVED) ---

const generateInvoiceNumber = () => {
  const prefix = 'INV';
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  const timestamp = Date.now().toString().slice(-4);
  return `${prefix}-${randomNum}${timestamp}`;
};

const parseDisplayDate = (dateStr: string): Date | null => {
    if (!dateStr || dateStr.split('-').length !== 3) return null;
    const [day, month, year] = dateStr.split('-').map(Number);
    // Month is 0-indexed in JS Date
    return new Date(year, month - 1, day);
};

const formatToDisplayDate = (date: Date): string => {
  if (!date) return '';
  return format(date, 'dd-MM-yyyy');
};

const isDateBefore = (date1: string, date2: string): boolean => {
  const d1 = parseDisplayDate(date1);
  const d2 = parseDisplayDate(date2);
  return d1 && d2 ? d1 < d2 : false;
};

// --- COMPONENT START ---

const InvoiceForm: React.FC<InvoiceFormProps> = ({ invoice, onClose }) => {
  const { addInvoice, updateInvoice, clients, fetchClients } = useAccountsStore();
  const organizationId = useSelector((state: any) => state.auth.organization_id);
  
  // --- STATE MANAGEMENT ---
  const [invoiceNumber, setInvoiceNumber] = useState(invoice?.invoiceNumber || generateInvoiceNumber());
  const [clientId, setClientId] = useState(invoice?.clientId || '');
  const [clientName, setClientName] = useState(invoice?.clientName || '');
  // --- MODIFICATION: Added state for the client's address ---
  const [clientAddress, setClientAddress] = useState(''); 
  const [currency, setCurrency] = useState<'USD' | 'INR'>(invoice?.currency || 'INR');
  const [items, setItems] = useState<InvoiceItem[]>(invoice?.items || [{ id: '1', description: '', quantity: 1, rate: 0, amount: 0, organizationId }]);
  const [notes, setNotes] = useState(invoice?.notes || '');
  const [terms, setTerms] = useState(invoice?.terms || '');
  const [taxRate, setTaxRate] = useState(invoice?.taxRate || 18);
  const [subtotal, setSubtotal] = useState(0);
  const [taxAmount, setTaxAmount] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [invoiceDate, setInvoiceDate] = useState<Date | undefined>(invoice?.invoiceDate ? parseDisplayDate(invoice.invoiceDate) : new Date());
  const [dueDate, setDueDate] = useState<Date | undefined>(invoice?.dueDate ? parseDisplayDate(invoice.dueDate) : undefined);
  const [dueDateOption, setDueDateOption] = useState<string>('');
  const [errors, setErrors] = useState<{
    clientId?: string;
    invoiceNumber?: string;
    invoiceDate?: string;
    dueDate?: string;
    items?: string;
    itemErrors?: { description?: string; quantity?: string; rate?: string }[];
  }>({});

  // --- EFFECT HOOKS ---

  // This effect populates the form's state when the 'invoice' prop is provided for editing.
  useEffect(() => {
    if (invoice) {
      setInvoiceNumber(invoice.invoiceNumber);
      setClientId(invoice.clientId);
      setClientName(invoice.clientName);
      setCurrency(invoice.currency);
      setItems(invoice.items || [{ id: '1', description: '', quantity: 1, rate: 0, amount: 0, organizationId }]);
      setNotes(invoice.notes || '');
      setTerms(invoice.terms || '');
      setTaxRate(invoice.taxRate !== undefined ? invoice.taxRate : (invoice.currency === 'INR' ? 18 : 0));
      setInvoiceDate(invoice.invoiceDate ? parseDisplayDate(invoice.invoiceDate) : undefined);
      setDueDate(invoice.dueDate ? parseDisplayDate(invoice.dueDate) : undefined);
      setDueDateOption('custom');
      
      // --- MODIFICATION: Find and set the client's address when editing ---
      const selectedClient = clients.find(c => c.id === invoice.clientId);
      if (selectedClient) {
          setClientAddress(selectedClient.address || 'No address on file.');
      }
    }
  }, [invoice, clients]);

  useEffect(() => {
    fetchClients().catch(error => console.error('Error fetching clients:', error));
  }, [fetchClients]);

  // Effect to update client details (including address) when clientId changes
  useEffect(() => {
    const selectedClient = clients.find(client => client.id === clientId);
    if (selectedClient) {
      setCurrency(selectedClient.currency);
      setClientName(selectedClient.client_name);
      setTaxRate(selectedClient.currency === 'INR' ? 18 : 0);
      setDueDateOption('net30');
      // --- MODIFICATION: Set the address from the selected client ---
      setClientAddress(selectedClient.address || 'No address on file.');
    } else {
      setDueDateOption('');
      setDueDate(undefined);
      // --- MODIFICATION: Clear the address if no client is selected ---
      setClientAddress('');
    }
  }, [clientId, clients]);

  useEffect(() => {
    const calculatedSubtotal = items.reduce((sum, item) => sum + item.amount, 0);
    const calculatedTaxAmount = currency === 'INR' ? calculatedSubtotal * (taxRate / 100) : 0;
    const calculatedTotal = calculatedSubtotal + calculatedTaxAmount;
    
    setSubtotal(calculatedSubtotal);
    setTaxAmount(calculatedTaxAmount);
    setTotalAmount(calculatedTotal);
  }, [items, taxRate, currency]);

  // Effect for automatic due date calculation
  useEffect(() => {
    if (!invoiceDate || dueDateOption === 'custom') {
      return;
    }
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

  // --- YOUR EXISTING VALIDATION & HANDLERS (PRESERVED) ---
  const validateForm = () => {
    const newErrors: typeof errors = {};
    const invoiceDateStr = invoiceDate ? formatToDisplayDate(invoiceDate) : '';
    const dueDateStr = dueDate ? formatToDisplayDate(dueDate) : '';

    if (!clientId) newErrors.clientId = 'Client selection is required';
    if (!invoiceNumber.trim()) newErrors.invoiceNumber = 'Invoice number is required';
    if (!invoiceDateStr) newErrors.invoiceDate = 'Invoice date is required';
    if (!dueDateStr) newErrors.dueDate = 'Due date is required';
    else if (isDateBefore(dueDateStr, invoiceDateStr)) {
      newErrors.dueDate = 'Due date must be on or after the invoice date';
    }

    if (items.length === 0) {
      newErrors.items = 'At least one invoice item is required';
    } else {
      const itemErrors = items.map(item => {
        const error: { description?: string; quantity?: string; rate?: string } = {};
        if (!item.description.trim()) error.description = 'Description is required';
        if (item.quantity <= 0) error.quantity = 'Quantity must be greater than 0';
        if (item.rate <= 0) error.rate = 'Rate must be greater than 0';
        return error;
      });
      if (itemErrors.some(err => Object.keys(err).length > 0)) {
        newErrors.itemErrors = itemErrors;
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  useEffect(() => {
    validateForm();
  }, [clientId, invoiceNumber, invoiceDate, dueDate, items]);

  const handleClientChange = (value: string) => {
    setClientId(value);
  };

  const updateItemAmount = (index: number, quantity: number, rate: number) => {
    const newItems = [...items];
    newItems[index].quantity = quantity;
    newItems[index].rate = rate;
    newItems[index].amount = quantity * rate;
    newItems[index].organizationId = organizationId;
    setItems(newItems);
  };
  
  const handleAddItem = () => {
    const newId = `item-${Date.now()}`;
    setItems([...items, { id: newId, description: '', quantity: 1, rate: 0, amount: 0, organizationId }]);
  };
  
  const handleRemoveItem = (index: number) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
  };
  
  const handleSubmit = (status: 'Draft' | 'Unpaid') => {
    if (!validateForm()) {
      toast.error('Please fix the errors before submitting.');
      return;
    }
    const invoiceData: Omit<Invoice, 'id'> = {
      invoiceNumber, clientId, clientName, currency,
      invoiceDate: invoiceDate ? format(invoiceDate, 'yyyy-MM-dd') : '',
      dueDate: dueDate ? format(dueDate, 'yyyy-MM-dd') : '',
      items, status, totalAmount, notes, terms,
      taxRate: currency === 'INR' ? taxRate : undefined,
      taxAmount: currency === 'INR' ? taxAmount : undefined,
      subtotal, organizationId
    };
    
    if (invoice) {
      updateInvoice(invoice.id, invoiceData);
    } else {
      addInvoice(invoiceData);
    }
    onClose();
  };

  const getCurrencySymbol = () => (currency === 'USD' ? <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /> : <IndianRupee className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />);
  const formatAmount = (amount: number) => (currency === 'USD' ? `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : `₹${amount.toLocaleString('en-IN')}`);
  const hasErrors = Object.keys(errors).length > 0;

  // --- JSX WITH REVISED LAYOUT ---

  return (
    <div className="space-y-6">
      {/* --- MODIFICATION: The entire top grid layout is restructured --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* --- Left Column: Customer and Address --- */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="clientId">Customer</Label>
            <Select value={clientId} onValueChange={handleClientChange}>
              <SelectTrigger id="clientId"><SelectValue placeholder="Select a client" /></SelectTrigger>
              <SelectContent>
                {clients.map(client => (
                  <SelectItem key={client.id} value={client.id}>{client.display_name || client.client_name} ({client.currency})</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.clientId && <p className="text-red-500 text-sm mt-1">{errors.clientId}</p>}
          </div>
          <div>
            <Label htmlFor="clientAddress">Address</Label>
            <Textarea id="clientAddress" value={clientAddress} readOnly disabled rows={3} placeholder="Client's address will appear here..."/>
          </div>
        </div>
        
        {/* --- Right Column: Invoice Number, Dates, and Terms --- */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="invoiceNumber">Invoice Number</Label>
            <Input id="invoiceNumber" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} />
            {errors.invoiceNumber && <p className="text-red-500 text-sm mt-1">{errors.invoiceNumber}</p>}
          </div>
          <div>
            <Label htmlFor="invoiceDate">Invoice Date</Label>
            <Popover>
                <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {invoiceDate ? format(invoiceDate, 'PPP') : <span>Pick a date</span>}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={invoiceDate} onSelect={setInvoiceDate} initialFocus/></PopoverContent>
            </Popover>
             {errors.invoiceDate && <p className="text-red-500 text-sm mt-1">{errors.invoiceDate}</p>}
          </div>
          
          {/* Show payment terms only if a client is selected */}
          {clientId && (
            <>
              <div>
                  <Label htmlFor="dueDateOption">Payment Terms</Label>
                  <Select value={dueDateOption} onValueChange={setDueDateOption}>
                      <SelectTrigger id="dueDateOption"><SelectValue placeholder="Select payment terms..." /></SelectTrigger>
                      <SelectContent>
                          <SelectItem value="on_receipt">Due on Receipt</SelectItem>
                          <SelectItem value="net15">Net 15 (15 days)</SelectItem>
                          <SelectItem value="net30">Net 30 (30 days)</SelectItem>
                          <SelectItem value="net45">Net 45 (45 days)</SelectItem>
                          <SelectItem value="net60">Net 60 (60 days)</SelectItem>
                          <SelectItem value="custom">Custom Date</SelectItem>
                      </SelectContent>
                  </Select>
              </div>

              {/* --- MODIFICATION: This is now the ONLY due date block --- */}
              {dueDateOption === 'custom' ? (
                  <div>
                      <Label>Custom Due Date</Label>
                      <Popover>
                          <PopoverTrigger asChild>
                              <Button variant="outline" className="w-full justify-start text-left font-normal">
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {dueDate ? format(dueDate, 'PPP') : <span>Pick a due date</span>}
                              </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                              <Calendar mode="single" selected={dueDate} onSelect={setDueDate} initialFocus fromDate={invoiceDate} />
                          </PopoverContent>
                      </Popover>
                      {errors.dueDate && <p className="text-red-500 text-sm mt-1">{errors.dueDate}</p>}
                  </div>
              ) : (
                  <div>
                      <Label>Due Date</Label>
                      <Input value={dueDate ? format(dueDate, 'PPP') : ''} readOnly disabled />
                      {errors.dueDate && <p className="text-red-500 text-sm mt-1">{errors.dueDate}</p>}
                  </div>
              )}
            </>
          )}
        </div>
      </div>
      
      {/* --- The rest of your JSX is preserved without changes --- */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">Invoice Items</h3>
          <Button type="button" size="sm" onClick={handleAddItem}>
            <Plus className="h-4 w-4 mr-2" /> Add Item
          </Button>
        </div>
        <div className="border rounded-md">
          <div className="grid grid-cols-12 gap-4 p-4 bg-muted/30 border-b">
            <div className="col-span-4 font-medium">Description</div>
            <div className="col-span-2 font-medium">Quantity</div>
            <div className="col-span-2 font-medium">Rate ({currency})</div>
            <div className="col-span-2 font-medium">Amount ({currency})</div>
            <div className="col-span-2 font-medium text-right">Action</div>
          </div>
          <div className="divide-y">
            {items.map((item, index) => (
              <div key={item.id} className="grid grid-cols-12 gap-4 p-4">
                <div className="col-span-4">
                  <Input 
                    placeholder="Item description" 
                    value={item.description}
                    onChange={(e) => {
                      const newItems = [...items];
                      newItems[index].description = e.target.value;
                      setItems(newItems);
                    }}
                    className={errors.itemErrors?.[index]?.description ? 'border-red-500' : ''}
                  />
                  {errors.itemErrors?.[index]?.description && <p className="text-red-500 text-sm mt-1">{errors.itemErrors[index].description}</p>}
                </div>
                <div className="col-span-2">
                  <Input 
                    type="number" min="1" value={item.quantity}
                    onChange={(e) => updateItemAmount(index, Number(e.target.value), item.rate)}
                    className={errors.itemErrors?.[index]?.quantity ? 'border-red-500' : ''}
                  />
                  {errors.itemErrors?.[index]?.quantity && <p className="text-red-500 text-sm mt-1">{errors.itemErrors[index].quantity}</p>}
                </div>
                <div className="col-span-2">
                  <div className="relative">
                    {getCurrencySymbol()}
                    <Input 
                      type="number" className={`pl-10 ${errors.itemErrors?.[index]?.rate ? 'border-red-500' : ''}`}
                      value={item.rate}
                      onChange={(e) => updateItemAmount(index, item.quantity, Number(e.target.value))}
                    />
                  </div>
                  {errors.itemErrors?.[index]?.rate && <p className="text-red-500 text-sm mt-1">{errors.itemErrors[index].rate}</p>}
                </div>
                <div className="col-span-2 flex items-center"><div className="financial-amount">{formatAmount(item.amount)}</div></div>
                <div className="col-span-2 text-right">
                  {items.length > 1 && (<Button variant="ghost" size="icon" onClick={() => handleRemoveItem(index)}><Trash2 className="h-4 w-4 text-red-500" /></Button>)}
                </div>
              </div>
            ))}
          </div>
        </div>
        {errors.items && <p className="text-red-500 text-sm mt-2">{errors.items}</p>}
      </div>
      
      <div className="grid grid-cols-2 gap-8">
        <div>
          <div className="space-y-4">
            <div><Label htmlFor="notes">Notes</Label><Textarea id="notes" placeholder="Add any additional notes to the customer" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)}/></div>
            <div><Label htmlFor="terms">Terms & Conditions</Label><Textarea id="terms" placeholder="Add terms and conditions" rows={3} value={terms} onChange={(e) => setTerms(e.target.value)}/></div>
          </div>
        </div>
        <div className="space-y-4">
          <div className="flex justify-between p-4 bg-muted/30 rounded-md"><span>Subtotal:</span><span className="financial-amount">{formatAmount(subtotal)}</span></div>
          {currency === 'INR' && (
            <div className="flex items-center gap-4">
              <Label htmlFor="taxRate">Tax Rate:</Label>
              <div className="w-32">
                <Select value={taxRate.toString()} onValueChange={(value) => setTaxRate(Number(value))}>
                  <SelectTrigger><SelectValue placeholder="Select tax rate" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">0%</SelectItem><SelectItem value="5">5%</SelectItem><SelectItem value="12">12%</SelectItem><SelectItem value="18">18%</SelectItem><SelectItem value="28">28%</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 flex justify-between"><span>Tax:</span><span className="financial-amount">{formatAmount(taxAmount)}</span></div>
            </div>
          )}
          <div className="flex justify-between p-4 bg-blue-50 rounded-md font-semibold"><span>Total Amount:</span><span className="financial-amount text-lg">{formatAmount(totalAmount)}</span></div>
        </div>
      </div>
      
      <div className="flex justify-end gap-2 mt-8">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button variant="secondary" onClick={() => handleSubmit('Draft')} disabled={hasErrors || items.length === 0}>Save as Draft</Button>
        <Button onClick={() => handleSubmit('Unpaid')} disabled={hasErrors || items.length === 0}>{invoice ? 'Update Invoice' : 'Create Invoice'}</Button>
      </div>
    </div>
  );
};

export default InvoiceForm;