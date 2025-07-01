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
  IndianRupee, AlertTriangle, CheckCircle, Clock, Loader2
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

  const selectedInvoice = selectedInvoiceId
    ? invoices.find((inv) => inv.id === selectedInvoiceId)
    : null;

  // Fetch invoices on mount and when timeFilter changes
  useEffect(() => {
    fetchInvoices(timeFilter);
  }, [fetchInvoices, timeFilter]);

  useEffect(() => {
    if (isAddDialogOpen) {
      console.log('Add Invoice dialog opened, fetching clients...');
      fetchClients().then(() => {
        console.log('Clients fetch completed');
      }).catch((error) => {
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
      .then(() => {
        toast.success(`Invoice #${invoice.invoiceNumber} PDF generated successfully`);
      })
      .catch((error) => {
        console.error('Error generating PDF:', error);
        toast.error('Failed to generate PDF. Please try again.');
      })
      .finally(() => {
        setExportingInvoiceIds((prev) => prev.filter((i) => i !== id));
      });
  };

  const handleBatchExport = () => {
    setIsBatchExporting(true);

    generateBatchInvoicePDF(filteredInvoices)
      .then(() => {
        toast.success(`Exported ${filteredInvoices.length} invoices successfully`);
      })
      .catch((error) => {
        console.error('Error generating batch PDF:', error);
        toast.error('Failed to generate batch PDF. Please try again.');
      })
      .finally(() => {
        setIsBatchExporting(false);
      });
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
        return <CheckCircle className="h-4 w-4 text-success-dark" />;
      case 'unpaid':
        return <Clock className="h-4 w-4 text-warning-dark" />;
      case 'overdue':
        return <AlertTriangle className="h-4 w-4 text-danger-dark" />;
      case 'draft':
        return <FileText className="h-4 w-4 text-gray-500" />;
      default:
        return null;
    }
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
                  <h3 className="text-2xl font-bold financial-amount">{formatINR(stats.totalInvoiced)}</h3>
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
                  <h3 className="text-2xl font-bold financial-amount">{formatINR(stats.totalPaid)}</h3>
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
                  <h3 className="text-2xl font-bold financial-amount">{formatINR(stats.totalOverdue)}</h3>
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
                  <h3 className="text-2xl font-bold financial-amount">{formatINR(stats.totalDraft)}</h3>
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
            <Select value={timeFilter} onValueChange={setTimeFilter}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Time period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">Week</SelectItem>
                <SelectItem value="month">Month</SelectItem>
                <SelectItem value="year">Year</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
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
          onValueChange={setCurrentTab}
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
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice No</TableHead>
                      <TableHead>Invoice Date</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Billed</TableHead>
                      <TableHead>Paid</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInvoices.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                          No invoices found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredInvoices.map((invoice) => (
                        <TableRow key={invoice.id}>
                          <TableCell>{invoice.invoiceNumber}</TableCell>
                          <TableCell>{invoice.invoiceDate}</TableCell>
                          <TableCell>{invoice.clientName}</TableCell>
                          <TableCell className="financial-amount">
                            <div className="flex items-center">
                              <IndianRupee className="h-3 w-3 mr-1" />
                              {invoice.totalAmount.toLocaleString()}
                            </div>
                          </TableCell>
                          <TableCell className="financial-amount">
                            {invoice.status === 'Paid' ? (
                              <div className="flex items-center">
                                <IndianRupee className="h-3 w-3 mr-1" />
                                {(invoice.paidAmount || invoice.totalAmount).toLocaleString()}
                              </div>
                            ) : '-'}
                          </TableCell>
                          <TableCell>{invoice.dueDate}</TableCell>
                          <TableCell>
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
                                <SelectItem value="Paid">
                                  <div className="flex items-center">
                                    <CheckCircle className="h-4 w-4 text-success-dark mr-2" />
                                    Paid
                                  </div>
                                </SelectItem>
                                <SelectItem value="Unpaid">
                                  <div className="flex items-center">
                                    <Clock className="h-4 w-4 text-warning-dark mr-2" />
                                    Unpaid
                                  </div>
                                </SelectItem>
                                <SelectItem value="Overdue">
                                  <div className="flex items-center">
                                    <AlertTriangle className="h-4 w-4 text-danger-dark mr-2" />
                                    Overdue
                                  </div>
                                </SelectItem>
                                <SelectItem value="Draft">
                                  <div className="flex items-center">
                                    <FileText className="h-4 w-4 text-gray-500 mr-2" />
                                    Draft
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleViewInvoice(invoice.id)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditInvoice(invoice.id)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleExportInvoice(invoice.id, 'pdf')}
                                disabled={exportingInvoiceIds.includes(invoice.id)}
                              >
                                {exportingInvoiceIds.includes(invoice.id) ? (
                                  <Loader2 className="h-4 w責任-4 animate-spin" />
                                ) : (
                                  <Download className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteInvoice(invoice.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Invoice</DialogTitle>
          </DialogHeader>
          <InvoiceForm
            onClose={() => setIsAddDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Invoice Details</DialogTitle>
          </DialogHeader>
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
          <DialogHeader>
            <DialogTitle>Edit Invoice</DialogTitle>
          </DialogHeader>
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