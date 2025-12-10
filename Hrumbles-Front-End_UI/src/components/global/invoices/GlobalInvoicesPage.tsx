import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { supabase } from "@/integrations/supabase/client";
import { Plus, Search, FileText, Download, Edit, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import OrganizationInvoiceForm from './OrganizationInvoiceForm';
import OrganizationInvoiceDetail from './OrganizationInvoiceDetail'; // Import the new component
import { format } from 'date-fns';

const GlobalInvoicesPage = () => {
  const organizationId = useSelector((state: any) => state.auth.organization_id);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  
  // --- NEW STATE FOR VIEW MODAL ---
  const [viewInvoiceId, setViewInvoiceId] = useState<string | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');

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
    } else {
      setInvoices(data || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (organizationId) fetchInvoices();
  }, [organizationId]);

  const filteredInvoices = invoices.filter(inv => 
    inv.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    inv.client_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'Paid': return 'bg-green-100 text-green-800';
      case 'Unpaid': return 'bg-red-100 text-red-800';
      case 'Draft': return 'bg-gray-100 text-gray-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Organization Invoices</h1>
          <p className="text-gray-500">Manage billing for all organizations on the platform.</p>
        </div>
        <Button onClick={() => { setSelectedInvoice(null); setIsCreateOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Create Invoice
        </Button>
      </div>

      <div className="flex items-center gap-2 bg-white p-2 rounded-md border w-full md:w-96">
        <Search className="h-4 w-4 text-gray-400" />
        <Input 
          placeholder="Search by Invoice # or Organization..." 
          className="border-none focus-visible:ring-0"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="text-center py-10">Loading invoices...</div>
      ) : filteredInvoices.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10 text-gray-500">
            <FileText className="h-12 w-12 mb-4 text-gray-300" />
            <p>No invoices found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-700 font-medium border-b">
              <tr>
                <th className="p-4">Invoice #</th>
                <th className="p-4">Organization</th>
                <th className="p-4">Date</th>
                <th className="p-4">Due Date</th>
                <th className="p-4">Amount</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredInvoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-gray-50">
                  <td className="p-4 font-medium">{inv.invoice_number}</td>
                  <td className="p-4">{inv.client_name}</td>
                  <td className="p-4">{inv.invoice_date ? format(new Date(inv.invoice_date), 'dd MMM yyyy') : '-'}</td>
                  <td className="p-4">{inv.due_date ? format(new Date(inv.due_date), 'dd MMM yyyy') : '-'}</td>
                  <td className="p-4 font-bold">
                    {inv.currency === 'USD' ? '$' : '₹'}{inv.total_amount?.toLocaleString()}
                  </td>
                  <td className="p-4">
                    <Badge className={getStatusColor(inv.status)} variant="secondary">{inv.status}</Badge>
                  </td>
                  <td className="p-4 text-right flex justify-end gap-2">
                    {/* VIEW BUTTON - Sets State for Modal */}
                    <Button variant="ghost" size="icon" onClick={() => setViewInvoiceId(inv.id)}>
                      <Eye className="h-4 w-4 text-gray-500" />
                    </Button>

                    <Button variant="ghost" size="icon" onClick={() => { setSelectedInvoice(inv); setIsCreateOpen(true); }}>
                      <Edit className="h-4 w-4 text-gray-500" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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

      {/* VIEW INVOICE MODAL */}
      <Dialog open={!!viewInvoiceId} onOpenChange={(open) => !open && setViewInvoiceId(null)}>
        <DialogContent className="max-w-4xl h-[90vh] p-0 overflow-hidden bg-gray-50">
           {/* No Header needed here as the invoice itself has headers, or add a simple close */}
           <OrganizationInvoiceDetail invoiceId={viewInvoiceId} />
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default GlobalInvoicesPage;