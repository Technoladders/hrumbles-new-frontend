import React, { useState, useEffect } from 'react';
import { useAccountsStore } from '@/lib/accounts-data';
import AccountsLayout from '@/components/accounts/AccountsLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow
} from '@/components/ui/table';
import {
  Tabs, TabsContent, TabsList, TabsTrigger
} from '@/components/ui/tabs';
import {
  FileText, Download, Eye, Edit, Trash2, Plus, Search,
  AlertTriangle, CheckCircle, Clock, Loader2,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import InvoiceForm from '@/components/accounts/InvoiceForm';
import InvoiceDetails from '@/components/accounts/InvoiceDetails';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue
} from '@/components/ui/select';
import { generateInvoicePDF, generateBatchInvoicePDF } from '@/utils/pdf-utils';
import { toast } from 'sonner';

const USD_TO_INR_RATE = 84;

const InvoicesPage: React.FC = () => {
  const {
    invoices,
    stats,
    fetchInvoices,
    deleteInvoice,
    updateInvoiceStatus,
    exportInvoice,
    fetchClients,
  } = useAccountsStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [currentTab, setCurrentTab] = useState('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [exportingInvoiceIds, setExportingInvoiceIds] = useState<string[]>([]);
  const [isBatchExporting, setIsBatchExporting] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const selectedInvoice = selectedInvoiceId
    ? invoices.find((inv) => inv.id === selectedInvoiceId)
    : null;

  const convertToINR = (amount: number, currency: string) => {
    return currency === 'USD' ? amount * USD_TO_INR_RATE : amount;
  };

  const formatAmountWithTooltip = (amount: number, currency: string) => {
    const inrAmount = convertToINR(amount, currency);
    return (
      <div className="group relative inline-block cursor-pointer">
        {currency === 'USD' ? (
          <>
            <span>$ {amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:block bg-gray-800 text-white text-xs rounded p-2 z-10 whitespace-nowrap shadow-md">
              ₹ {inrAmount.toLocaleString('en-IN')}
            </div>
          </>
        ) : (
          <span>₹ {amount.toLocaleString('en-IN')}</span>
        )}
      </div>
    );
  };

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  useEffect(() => {
    if (isAddDialogOpen) {
      fetchClients().catch((error) => {
        console.error('Error fetching clients in InvoicesPage:', error);
      });
    }
  }, [isAddDialogOpen, fetchClients]);

  const filteredInvoices = invoices.filter((invoice) => {
    if (currentTab !== 'all' && invoice.status.toLowerCase() !== currentTab) {
      return false;
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        invoice.invoiceNumber.toLowerCase().includes(query) ||
        invoice.clientName.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedInvoices = filteredInvoices.slice(startIndex, startIndex + itemsPerPage);

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(Number(value));
    setCurrentPage(1);
  };

  const handleTabChange = (tab: string) => {
    setCurrentTab(tab);
    setCurrentPage(1);
  };

  const calculateStatsInINR = () => {
    const totalInvoiced = invoices.reduce((sum, inv) => sum + convertToINR(inv.totalAmount, inv.currency), 0);
    const totalPaid = invoices.filter((inv) => inv.status === 'Paid').reduce((sum, inv) => sum + convertToINR(inv.paidAmount || inv.totalAmount, inv.currency), 0);
    const totalOverdue = invoices.filter((inv) => inv.status === 'Overdue').reduce((sum, inv) => sum + convertToINR(inv.totalAmount, inv.currency), 0);
    const totalDraft = invoices.filter((inv) => inv.status === 'Draft').reduce((sum, inv) => sum + convertToINR(inv.totalAmount, inv.currency), 0);
    return { ...stats, totalInvoiced, totalPaid, totalOverdue, totalDraft };
  };

  const inrStats = calculateStatsInINR();

  const handleViewInvoice = (id: string) => {
    setSelectedInvoiceId(id);
    setIsViewDialogOpen(true);
  };

  const handleEditInvoice = (id: string) => {
    setSelectedInvoiceId(id);
    setIsEditDialogOpen(true);
  };

const handleDeleteInvoice = (id: string) => {
    toast.warning("Are you sure you want to delete this invoice?", {
      action: {
        label: "Delete",
        onClick: async () => {
          try {
            await deleteInvoice(id);
            toast.success('Invoice deleted successfully.');
          } catch (error) {
            console.error('Error deleting invoice:', error);
            toast.error('Failed to delete invoice.');
          }
        },
      },
      cancel: {
        label: "Cancel",
      },
    });
  };

  const handleStatusChange = async (id: string, status: 'Paid' | 'Unpaid' | 'Overdue' | 'Draft') => {
    try {
      await updateInvoiceStatus(id, status);
      toast.success('Invoice status updated.');
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status.');
    }
  };

  const handleExportInvoice = (id: string, format: 'pdf' | 'csv') => {
    if (format === 'csv') {
      exportInvoice(id, format);
      return;
    }
    setExportingInvoiceIds((prev) => [...prev, id]);
    const invoice = invoices.find((inv) => inv.id === id);
    if (!invoice) {
      toast.error('Invoice not found');
      setExportingInvoiceIds((prev) => prev.filter((i) => i !== id));
      return;
    }
    generateInvoicePDF(invoice)
      .then(() => toast.success(`Invoice #${invoice.invoiceNumber} PDF generated.`))
      .catch((error) => {
        console.error('Error generating PDF:', error);
        toast.error('Failed to generate PDF.');
      })
      .finally(() => setExportingInvoiceIds((prev) => prev.filter((i) => i !== id)));
  };

  const handleBatchExport = () => {
    setIsBatchExporting(true);
    generateBatchInvoicePDF(filteredInvoices)
      .then(() => toast.success(`Exported ${filteredInvoices.length} invoices successfully.`))
      .catch((error) => {
        console.error('Error generating batch PDF:', error);
        toast.error('Failed to generate batch PDF.');
      })
      .finally(() => setIsBatchExporting(false));
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid': return <CheckCircle className="h-4 w-4 text-success-dark" />;
      case 'unpaid': return <Clock className="h-4 w-4 text-warning-dark" />;
      case 'overdue': return <AlertTriangle className="h-4 w-4 text-danger-dark" />;
      case 'draft': return <FileText className="h-4 w-4 text-gray-500" />;
      default: return null;
    }
  };

  const renderPagination = () => (
    <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-4 px-2 py-2 border-t">
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">Show</span>
        <Select value={itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}>
          <SelectTrigger className="w-[70px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="5">5</SelectItem>
            <SelectItem value="10">10</SelectItem>
            <SelectItem value="20">20</SelectItem>
            <SelectItem value="50">50</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-gray-600">per page</span>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm text-gray-600">Page {currentPage} of {totalPages}</span>
        <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <span className="text-sm text-gray-600">
        Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredInvoices.length)} of {filteredInvoices.length} invoices
      </span>
    </div>
  );

 return (
    <AccountsLayout title="Invoices">
      <div className="space-y-6 animate-fade-in">
        {/* Stats Cards and Filters (No changes needed here) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Invoiced</p>
                  <h3 className="text-2xl font-bold">₹{inrStats.totalInvoiced.toLocaleString('en-IN')}</h3>
                  <p className="text-xs text-muted-foreground mt-1">No. of invoices: {stats.invoiceCount.all}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Paid</p>
                  <h3 className="text-2xl font-bold">₹{inrStats.totalPaid.toLocaleString('en-IN')}</h3>
                  <p className="text-xs text-muted-foreground mt-1">No. of invoices: {stats.invoiceCount.paid}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-success-light flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-success" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Overdue</p>
                  <h3 className="text-2xl font-bold">₹{inrStats.totalOverdue.toLocaleString('en-IN')}</h3>
                  <p className="text-xs text-muted-foreground mt-1">No. of invoices: {stats.invoiceCount.overdue}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-danger-light flex items-center justify-center">
                  <AlertTriangle className="h-6 w-6 text-danger" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Draft</p>
                  <h3 className="text-2xl font-bold">₹{inrStats.totalDraft.toLocaleString('en-IN')}</h3>
                  <p className="text-xs text-muted-foreground mt-1">No. of drafts: {stats.invoiceCount.draft}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center">
                  <FileText className="h-6 w-6 text-gray-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by Invoice No or Client Name"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            {filteredInvoices.length > 0 && (
              <Button variant="outline" onClick={handleBatchExport} disabled={isBatchExporting}>
                {isBatchExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                Export All
              </Button>
            )}
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Add Invoice
            </Button>
          </div>
        </div>

    <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
  {/* The container for the pill-shaped buttons */}
  <TabsList className="inline-flex h-auto items-center justify-center rounded-full bg-gray-100 p-1.5 text-muted-foreground">
    
    {/* All Tab */}
    <TabsTrigger value="all" className="inline-flex items-center justify-center whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-all data-[state=active]:bg-purple-600 data-[state=active]:text-white data-[state=active]:shadow-sm">
      All
      <span className="ml-2 flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold data-[state=inactive]:bg-purple-200 data-[state=inactive]:text-purple-800 data-[state=active]:bg-white data-[state=active]:text-purple-800">
        {stats.invoiceCount.all}
      </span>
    </TabsTrigger>

    {/* Draft Tab */}
    <TabsTrigger value="draft" className="inline-flex items-center justify-center whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-all data-[state=active]:bg-purple-600 data-[state=active]:text-white data-[state=active]:shadow-sm">
      Draft
      <span className="ml-2 flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold data-[state=inactive]:bg-gray-300 data-[state=inactive]:text-gray-800 data-[state=active]:bg-white data-[state=active]:text-purple-800">
        {stats.invoiceCount.draft}
      </span>
    </TabsTrigger>

    {/* Paid Tab */}
    <TabsTrigger value="paid" className="inline-flex items-center justify-center whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-all data-[state=active]:bg-purple-600 data-[state=active]:text-white data-[state=active]:shadow-sm">
      Paid
      <span className="ml-2 flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold data-[state=inactive]:bg-green-200 data-[state=inactive]:text-green-800 data-[state=active]:bg-white data-[state=active]:text-purple-800">
        {stats.invoiceCount.paid}
      </span>
    </TabsTrigger>

    {/* Unpaid Tab */}
    <TabsTrigger value="unpaid" className="inline-flex items-center justify-center whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-all data-[state=active]:bg-purple-600 data-[state=active]:text-white data-[state=active]:shadow-sm">
      Unpaid
      <span className="ml-2 flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold data-[state=inactive]:bg-yellow-200 data-[state=inactive]:text-yellow-800 data-[state=active]:bg-white data-[state=active]:text-purple-800">
        {stats.invoiceCount.unpaid}
      </span>
    </TabsTrigger>

    {/* Overdue Tab */}
    <TabsTrigger value="overdue" className="inline-flex items-center justify-center whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-all data-[state=active]:bg-purple-600 data-[state=active]:text-white data-[state=active]:shadow-sm">
      Overdue
      <span className="ml-2 flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold data-[state=inactive]:bg-red-200 data-[state=inactive]:text-red-800 data-[state=active]:bg-white data-[state=active]:text-purple-800">
        {stats.invoiceCount.overdue}
      </span>
    </TabsTrigger>

  </TabsList>
          <TabsContent value={currentTab} className="mt-6">
            <div className="bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm animate-scale-in">
              {/* DESKTOP HEADER */}
              <div className="hidden lg:grid grid-cols-12 gap-x-4 px-6 py-3 bg-purple-600 border-b border-purple-700">
                <div className="col-span-2 text-xs font-bold text-white uppercase tracking-wider">Invoice No</div>
                <div className="col-span-3 text-xs font-bold text-white uppercase tracking-wider">Customer</div>
                <div className="col-span-2 text-xs font-bold text-white uppercase tracking-wider">Billed</div>
                <div className="col-span-2 text-xs font-bold text-white uppercase tracking-wider">Due Date</div>
                <div className="col-span-1 text-xs font-bold text-white uppercase tracking-wider">Status</div>
                <div className="col-span-2 text-center text-xs font-bold text-white uppercase tracking-wider">Actions</div>
              </div>

              {/* LIST OF INVOICE CARDS */}
              <div className="divide-y divide-gray-200">
                {paginatedInvoices.length === 0 ? (
                   <div className="text-center py-10 text-muted-foreground">
                    No invoices found for this category.
                  </div>
                ) : (
                  paginatedInvoices.map((invoice) => (
                    <div key={invoice.id} className="grid grid-cols-1 lg:grid-cols-12 gap-x-4 gap-y-3 px-6 py-4 items-center transition-all duration-200 ease-in-out hover:shadow-lg hover:-translate-y-px hover:bg-gray-50/50">
                      
                      <div className="col-span-full lg:col-span-2 font-semibold text-gray-800">{invoice.invoiceNumber}</div>
                      
                      <div className="col-span-full lg:col-span-3 text-sm text-gray-700">{invoice.clientName}</div>

                      <div className="col-span-full lg:col-span-2 text-sm font-semibold">{formatAmountWithTooltip(invoice.totalAmount, invoice.currency)}</div>

                      <div className="col-span-full lg:col-span-2 text-sm text-gray-700">{invoice.dueDate}</div>

                      <div className="col-span-full lg:col-span-1">
                        <Select value={invoice.status} onValueChange={(value) => handleStatusChange(invoice.id, value as 'Paid' | 'Unpaid' | 'Overdue' | 'Draft')}>
                          <SelectTrigger className={`w-[120px] h-auto text-xs font-semibold border-none rounded-full px-3 py-1 ${
                            invoice.status.toLowerCase() === 'paid' ? 'bg-green-100 text-green-800' :
                            invoice.status.toLowerCase() === 'unpaid' ? 'bg-yellow-100 text-yellow-800' :
                            invoice.status.toLowerCase() === 'overdue' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-700'
                          }`}>
                            <SelectValue>
                              <div className="flex items-center gap-1.5">
                                {getStatusIcon(invoice.status)}
                                <span>{invoice.status}</span>
                              </div>
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                              <SelectItem value="Paid"><div className="flex items-center"><CheckCircle className="h-4 w-4 text-success-dark mr-2" />Paid</div></SelectItem>
                              <SelectItem value="Unpaid"><div className="flex items-center"><Clock className="h-4 w-4 text-warning-dark mr-2" />Unpaid</div></SelectItem>
                              <SelectItem value="Overdue"><div className="flex items-center"><AlertTriangle className="h-4 w-4 text-danger-dark mr-2" />Overdue</div></SelectItem>
                              <SelectItem value="Draft"><div className="flex items-center"><FileText className="h-4 w-4 text-gray-500 mr-2" />Draft</div></SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="col-span-full lg:col-span-2 flex lg:justify-center">
                        <div className="flex items-center space-x-1 rounded-full bg-slate-100 p-1 shadow-md border border-slate-200">
                          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full text-slate-500 hover:bg-purple-600 hover:text-white transition-colors" onClick={() => handleViewInvoice(invoice.id)}><Eye className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full text-slate-500 hover:bg-purple-600 hover:text-white transition-colors" onClick={() => handleEditInvoice(invoice.id)}><Edit className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full text-slate-500 hover:bg-purple-600 hover:text-white transition-colors" onClick={() => handleExportInvoice(invoice.id, 'pdf')} disabled={exportingInvoiceIds.includes(invoice.id)}>
                            {exportingInvoiceIds.includes(invoice.id) ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full text-slate-500 hover:bg-red-600 hover:text-white transition-colors" onClick={() => handleDeleteInvoice(invoice.id)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              {filteredInvoices.length > 0 && renderPagination()}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialogs */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add New Invoice</DialogTitle></DialogHeader>
          <InvoiceForm onClose={() => setIsAddDialogOpen(false)} />
        </DialogContent>
      </Dialog>
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Invoice Details</DialogTitle></DialogHeader>
          {selectedInvoice && (
            <InvoiceDetails
              invoice={selectedInvoice}
              onStatusChange={handleStatusChange}
              onClose={() => setIsViewDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Edit Invoice</DialogTitle></DialogHeader>
            {selectedInvoice && (
              <InvoiceForm
                invoice={selectedInvoice}
                onClose={() => setIsEditDialogOpen(false)}
              />
            )}
          </DialogContent>
        </Dialog>
    </AccountsLayout>
  );
   
};

export default InvoicesPage;