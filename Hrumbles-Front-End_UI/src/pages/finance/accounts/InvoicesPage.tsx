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
  IndianRupee, AlertTriangle, CheckCircle, Clock, Loader2,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { formatINR } from '@/utils/currency';
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
  const [timeFilter, setTimeFilter] = useState('all');
  const [exportingInvoiceIds, setExportingInvoiceIds] = useState<string[]>([]);
  const [isBatchExporting, setIsBatchExporting] = useState(false);
  
  // Pagination State
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
    fetchInvoices(timeFilter);
  }, [fetchInvoices, timeFilter]);

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
  
  // Pagination Logic
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

  const handleDeleteInvoice = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this invoice?')) {
      try {
        await deleteInvoice(id);
      } catch (error) {
        console.error('Error deleting invoice:', error);
      }
    }
  };

  const handleStatusChange = async (id: string, status: 'Paid' | 'Unpaid' | 'Overdue' | 'Draft') => {
    try {
      await updateInvoiceStatus(id, status);
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status. Please try again.');
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
      .then(() => toast.success(`Invoice #${invoice.invoiceNumber} PDF generated successfully`))
      .catch((error) => {
        console.error('Error generating PDF:', error);
        toast.error('Failed to generate PDF. Please try again.');
      })
      .finally(() => setExportingInvoiceIds((prev) => prev.filter((i) => i !== id)));
  };

  const handleBatchExport = () => {
    setIsBatchExporting(true);
    generateBatchInvoicePDF(filteredInvoices)
      .then(() => toast.success(`Exported ${filteredInvoices.length} invoices successfully`))
      .catch((error) => {
        console.error('Error generating batch PDF:', error);
        toast.error('Failed to generate batch PDF. Please try again.');
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
  
  const renderPagination = () => {
    return (
      <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-4 px-2 py-2 border-t">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Show</span>
          <Select
            value={itemsPerPage.toString()}
            onValueChange={handleItemsPerPageChange}
          >
            <SelectTrigger className="w-[70px]">
              <SelectValue />
            </SelectTrigger>
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
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
  
        <span className="text-sm text-gray-600">
          Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredInvoices.length)} of {filteredInvoices.length} invoices
        </span>
      </div>
    );
  };

  return (
    <AccountsLayout title="Invoices">
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Invoices</p>
                  <h3 className="text-2xl font-bold financial-amount">₹{inrStats.totalInvoiced.toLocaleString('en-IN')}</h3>
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
                  <h3 className="text-2xl font-bold financial-amount">₹{inrStats.totalPaid.toLocaleString('en-IN')}</h3>
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
                  <h3 className="text-2xl font-bold financial-amount">₹{inrStats.totalOverdue.toLocaleString('en-IN')}</h3>
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
                  <h3 className="text-2xl font-bold financial-amount">₹{inrStats.totalDraft.toLocaleString('en-IN')}</h3>
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
              placeholder="Search Invoice No/ Client Name"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            {filteredInvoices.length > 0 && (
              <Button
                variant="outline"
                onClick={handleBatchExport}
                disabled={isBatchExporting}
              >
                {isBatchExporting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                Export All
              </Button>
            )}
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Add Invoice
            </Button>
          </div>
        </div>

        <Tabs
          defaultValue="all"
          value={currentTab}
          onValueChange={handleTabChange}
          className="w-full"
        >
          <TabsList className="grid grid-cols-5 w-full max-w-md">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="draft">Draft</TabsTrigger>
            <TabsTrigger value="paid">Paid</TabsTrigger>
            <TabsTrigger value="unpaid">Unpaid</TabsTrigger>
            <TabsTrigger value="overdue">Overdue</TabsTrigger>
          </TabsList>

          <TabsContent value={currentTab} className="mt-6">
          <div className="bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm">
                <div className="overflow-x-auto">
                <Table className="min-w-full divide-y divide-gray-200">
                  <TableHeader className="bg-gray-50">
                    <TableRow>
                      <TableHead className="table-header-cell">Invoice No</TableHead>
                      <TableHead className="table-header-cell">Invoice Date</TableHead>
                      <TableHead className="table-header-cell">Customer</TableHead>
                      <TableHead className="table-header-cell">Billed</TableHead>
                      <TableHead className="table-header-cell">Paid</TableHead>
                      <TableHead className="table-header-cell">Due Date</TableHead>
                      <TableHead className="table-header-cell">Status</TableHead>
                      <TableHead className="table-header-cell">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="bg-white divide-y divide-gray-200">
                    {paginatedInvoices.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                          No invoices found
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedInvoices.map((invoice) => (
                        <TableRow key={invoice.id} className="hover:bg-gray-50 transition">
                          <TableCell className="table-cell">{invoice.invoiceNumber}</TableCell>
                          <TableCell className="table-cell">{invoice.invoiceDate}</TableCell>
                          <TableCell className="table-cell">{invoice.clientName}</TableCell>
                          <TableCell className="table-cell financial-amount">
                            {formatAmountWithTooltip(invoice.totalAmount, invoice.currency)}
                          </TableCell>
                          <TableCell className="table-cell financial-amount">
                            {invoice.status === 'Paid' ? formatAmountWithTooltip(invoice.paidAmount || invoice.totalAmount, invoice.currency) : '-'}
                          </TableCell>
                          <TableCell className="table-cell">{invoice.dueDate}</TableCell>
                          <TableCell className="table-cell">
                            <Select
                              value={invoice.status}
                              onValueChange={(value) => handleStatusChange(invoice.id, value as 'Paid' | 'Unpaid' | 'Overdue' | 'Draft')}
                            >
                              <SelectTrigger className={`w-[120px] text-sm border-none ${
                                invoice.status.toLowerCase() === 'paid' ? 'bg-success-light text-success-dark' :
                                invoice.status.toLowerCase() === 'unpaid' ? 'bg-warning-light text-warning-dark' :
                                invoice.status.toLowerCase() === 'overdue' ? 'bg-danger-light text-danger-dark' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                <SelectValue>
                                  <div className="flex items-center">
                                    {getStatusIcon(invoice.status)}
                                    <span className="ml-1">{invoice.status}</span>
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
                          </TableCell>
                          <TableCell className="table-cell">
                            <div className="flex items-center space-x-1">
                              <Button variant="ghost" size="icon" onClick={() => handleViewInvoice(invoice.id)}><Eye className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => handleEditInvoice(invoice.id)}><Edit className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => handleExportInvoice(invoice.id, 'pdf')} disabled={exportingInvoiceIds.includes(invoice.id)}>
                                {exportingInvoiceIds.includes(invoice.id) ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDeleteInvoice(invoice.id)} className="text-red-500 hover:text-red-700"><Trash2 className="h-4 w-4" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
                </div>
                {filteredInvoices.length > 0 && renderPagination()}
            </div>
          </TabsContent>
        </Tabs>
      </div>

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