import React, { useState, useEffect } from 'react';
import { useAccountsStore, Invoice, InvoiceItem } from '@/lib/accounts-data';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, Plus, Trash2, IndianRupee, DollarSign } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface InvoiceFormProps {
  invoice?: Invoice;
  onClose: () => void;
}

const generateInvoiceNumber = () => {
  const prefix = 'INV';
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  const timestamp = Date.now().toString().slice(-4);
  return `${prefix}-${randomNum}${timestamp}`;
};

// Convert DD-MM-YYYY to YYYY-MM-DD for HTML date input
const formatToHTMLDate = (dateStr: string): string => {
  if (!dateStr) return '';
  const [day, month, year] = dateStr.split('-');
  return `${year}-${month}-${day}`;
};

// Convert YYYY-MM-DD to DD-MM-YYYY for display and storage
const formatToDisplayDate = (dateStr: string): string => {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  return `${day}-${month}-${year}`;
};

const formatDateString = (date: Date): string => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
};

// Compare dates in DD-MM-YYYY format
const isDateBefore = (date1: string, date2: string): boolean => {
  if (!date1 || !date2) return false;
  const [day1, month1, year1] = date1.split('-').map(Number);
  const [day2, month2, year2] = date2.split('-').map(Number);
  const d1 = new Date(year1, month1 - 1, day1);
  const d2 = new Date(year2, month2 - 1, day2);
  return d1 < d2;
};

const InvoiceForm: React.FC<InvoiceFormProps> = ({ invoice, onClose }) => {
  const { addInvoice, updateInvoice, clients, fetchClients } = useAccountsStore();
  
  // Form state
  const [invoiceNumber, setInvoiceNumber] = useState(invoice?.invoiceNumber || generateInvoiceNumber());
  const [clientId, setClientId] = useState(invoice?.clientId || '');
  const [clientName, setClientName] = useState(invoice?.clientName || '');
  const [currency, setCurrency] = useState<'USD' | 'INR'>(invoice?.clientId 
    ? clients.find(c => c.id === invoice.clientId)?.currency || 'INR' 
    : 'INR');
  const [invoiceDate, setInvoiceDate] = useState(invoice?.invoiceDate || formatDateString(new Date()));
  const [dueDate, setDueDate] = useState(invoice?.dueDate || '');
  const [items, setItems] = useState<InvoiceItem[]>(invoice?.items || [{ id: '1', description: '', quantity: 1, rate: 0, amount: 0 }]);
  const [notes, setNotes] = useState(invoice?.notes || '');
  const [terms, setTerms] = useState(invoice?.terms || '');
  const [taxRate, setTaxRate] = useState(invoice?.taxRate || 18);
  
  // Calculated values
  const [subtotal, setSubtotal] = useState(0);
  const [taxAmount, setTaxAmount] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);

  // Validation errors state
  const [errors, setErrors] = useState<{
    clientId?: string;
    invoiceNumber?: string;
    invoiceDate?: string;
    dueDate?: string;
    items?: string;
    itemErrors?: { description?: string; quantity?: string; rate?: string }[];
  }>({});

  // Fetch clients on component mount
  useEffect(() => {
    console.log('InvoiceForm mounted, fetching clients...');
    fetchClients().then(() => {
      console.log('Clients fetched:', clients);
    }).catch(error => {
      console.error('Error fetching clients:', error);
    });
  }, [fetchClients]);

  // Log clients whenever they change
  useEffect(() => {
    console.log('Clients state updated:', clients);
  }, [clients]);

  // Update currency and clientName when client changes
  useEffect(() => {
    const selectedClient = clients.find(client => client.id === clientId);
    if (selectedClient) {
      setCurrency(selectedClient.currency);
      setClientName(selectedClient.client_name);
    }
  }, [clientId, clients]);

  // Update calculations when items or tax rate changes
  useEffect(() => {
    const calculatedSubtotal = items.reduce((sum, item) => sum + item.amount, 0);
    const calculatedTaxAmount = calculatedSubtotal * (taxRate / 100);
    const calculatedTotal = calculatedSubtotal + calculatedTaxAmount;
    
    setSubtotal(calculatedSubtotal);
    setTaxAmount(calculatedTaxAmount);
    setTotalAmount(calculatedTotal);
  }, [items, taxRate]);

  // Validate form fields
  const validateForm = () => {
    const newErrors: typeof errors = {};

    // Validate top-level fields
    if (!clientId) newErrors.clientId = 'Client selection is required';
    if (!invoiceNumber.trim()) newErrors.invoiceNumber = 'Invoice number is required';
    if (!invoiceDate.trim()) newErrors.invoiceDate = 'Invoice date is required';
    if (!dueDate.trim()) newErrors.dueDate = 'Due date is required';
    else if (isDateBefore(dueDate, invoiceDate)) {
      newErrors.dueDate = 'Due date must be on or after the invoice date';
    }

    // Validate items
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

  // Run validation on mount and when fields change
  useEffect(() => {
    validateForm();
  }, [clientId, invoiceNumber, invoiceDate, dueDate, items]);

  // Handle changes to invoice date and adjust due date if necessary
  const handleInvoiceDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = formatToDisplayDate(e.target.value);
    setInvoiceDate(newDate);

    // If due date is before the new invoice date, reset it
    if (dueDate && isDateBefore(dueDate, newDate)) {
      setDueDate(newDate);
    }
  };

  // Handle client selection
  const handleClientChange = (value: string) => {
    setClientId(value);
    // Client name and currency are updated via useEffect
  };

  // Handle item amount calculation
  const updateItemAmount = (index: number, quantity: number, rate: number) => {
    const newItems = [...items];
    newItems[index].quantity = quantity;
    newItems[index].rate = rate;
    newItems[index].amount = quantity * rate;
    setItems(newItems);
  };
  
  // Add a new item
  const handleAddItem = () => {
    const newId = `item-${Date.now()}`;
    setItems([...items, { id: newId, description: '', quantity: 1, rate: 0, amount: 0 }]);
  };
  
  // Remove an item
  const handleRemoveItem = (index: number) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
  };
  
  // Handle form submission
  const handleSubmit = (status: 'Draft' | 'Unpaid') => {
    if (!validateForm()) {
      toast.error('Please fill in all required fields and add at least one valid invoice item.');
      return;
    }

    const invoiceData: Omit<Invoice, 'id'> = {
      invoiceNumber,
      clientId,
      clientName,
      invoiceDate,
      dueDate,
      items,
      status,
      totalAmount,
      notes,
      terms,
      taxRate,
      taxAmount,
      subtotal,
    };
    
    if (invoice) {
      updateInvoice(invoice.id, invoiceData);
    } else {
      addInvoice(invoiceData);
    }
    
    onClose();
  };

  // Helper to get currency symbol
  const getCurrencySymbol = () => {
    return currency === 'USD' ? (
      <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
    ) : (
      <IndianRupee className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
    );
  };

  // Helper to format amount with currency
  const formatAmount = (amount: number) => {
    return currency === 'USD' 
      ? `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : `₹${amount.toLocaleString('en-IN')}`;
  };
  
  const hasErrors = Object.keys(errors).length > 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="clientId">Customer</Label>
            <Select value={clientId} onValueChange={handleClientChange}>
              <SelectTrigger id="clientId">
                <SelectValue placeholder="Select a client" />
              </SelectTrigger>
              <SelectContent>
                {clients.map(client => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.display_name || client.client_name} ({client.currency})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.clientId && <p className="text-red-500 text-sm mt-1">{errors.clientId}</p>}
          </div>
          
          <div>
            <Label htmlFor="invoiceNumber">Invoice Number</Label>
            <Input 
              id="invoiceNumber" 
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
            />
          </div>
        </div>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="invoiceDate">Invoice Date</Label>
            <div className="relative">
              <Input 
                id="invoiceDate" 
                type="date" 
                value={formatToHTMLDate(invoiceDate)}
                onChange={handleInvoiceDateChange}
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="dueDate">Due Date</Label>
            <div className="relative">
              <Input 
                id="dueDate" 
                type="date" 
                value={formatToHTMLDate(dueDate)}
                onChange={(e) => setDueDate(formatToDisplayDate(e.target.value))}
                min={formatToHTMLDate(invoiceDate)}
              />
            </div>
          </div>
        </div>
      </div>
      
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
                  {errors.itemErrors?.[index]?.description && (
                    <p className="text-red-500 text-sm mt-1">{errors.itemErrors[index].description}</p>
                  )}
                </div>
                <div className="col-span-2">
                  <Input 
                    type="number" 
                    min="1" 
                    value={item.quantity}
                    onChange={(e) => {
                      const quantity = Number(e.target.value);
                      updateItemAmount(index, quantity, item.rate);
                    }}
                    className={errors.itemErrors?.[index]?.quantity ? 'border-red-500' : ''}
                  />
                  {errors.itemErrors?.[index]?.quantity && (
                    <p className="text-red-500 text-sm mt-1">{errors.itemErrors[index].quantity}</p>
                  )}
                </div>
                <div className="col-span-2">
                  <div className="relative">
                    {getCurrencySymbol()}
                    <Input 
                      type="number" 
                      className={`pl-10 ${errors.itemErrors?.[index]?.rate ? 'border-red-500' : ''}`}
                      value={item.rate}
                      onChange={(e) => {
                        const rate = Number(e.target.value);
                        updateItemAmount(index, item.quantity, rate);
                      }}
                    />
                  </div>
                  {errors.itemErrors?.[index]?.rate && (
                    <p className="text-red-500 text-sm mt-1">{errors.itemErrors[index].rate}</p>
                  )}
                </div>
                <div className="col-span-2 flex items-center">
                  <div className="financial-amount">
                    {formatAmount(item.amount)}
                  </div>
                </div>
                <div className="col-span-2 text-right">
                  {items.length > 1 && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleRemoveItem(index)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  )}
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
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Add any additional notes to the customer"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="terms">Terms & Conditions</Label>
              <Textarea
                id="terms"
                placeholder="Add terms and conditions"
                rows={3}
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
              />
            </div>
          </div>
        </div>
        
        <div className="space-y-4">
          <div className="flex justify-between p-4 bg-muted/30 rounded-md">
            <span>Subtotal:</span>
            <span className="financial-amount">{formatAmount(subtotal)}</span>
          </div>
          
          <div className="flex items-center gap-4">
            <Label htmlFor="taxRate">Tax Rate:</Label>
            <div className="w-32">
              <Select value={taxRate.toString()} onValueChange={(value) => setTaxRate(Number(value))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select tax rate" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">0%</SelectItem>
                  <SelectItem value="5">5%</SelectItem>
                  <SelectItem value="12">12%</SelectItem>
                  <SelectItem value="18">18%</SelectItem>
                  <SelectItem value="28">28%</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 flex justify-between">
              <span>Tax:</span>
              <span className="financial-amount">{formatAmount(taxAmount)}</span>
            </div>
          </div>
          
          <div className="flex justify-between p-4 bg-blue-50 rounded-md font-semibold">
            <span>Total Amount:</span>
            <span className="financial-amount text-lg">{formatAmount(totalAmount)}</span>
          </div>
        </div>
      </div>
      
      <div className="flex justify-end gap-2 mt-8">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button 
          variant="secondary" 
          onClick={() => handleSubmit('Draft')}
          disabled={hasErrors || items.length === 0}
        >
          Save as Draft
        </Button>
        <Button 
          onClick={() => handleSubmit('Unpaid')}
          disabled={hasErrors || items.length === 0}
        >
          {invoice ? 'Update Invoice' : 'Create Invoice'}
        </Button>
      </div>
    </div>
  );
};

export default InvoiceForm;