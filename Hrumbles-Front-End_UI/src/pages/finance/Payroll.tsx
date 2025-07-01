
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import PageTransition from '@/components/ui-custom/PageTransition';
import { useFinancialStore } from '@/lib/financial-data';
import PayslipUploader from '@/components/financial/PayslipUploader';
import PayslipViewer from '@/components/financial/PayslipViewer';
import { ArrowLeft, Upload } from 'lucide-react';
import { toast } from 'sonner';

const Payroll = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { payments } = useFinancialStore();
  const [payment, setPayment] = useState(payments.find(p => p.id === id));
  const [uploaderOpen, setUploaderOpen] = useState(false);
  
  useEffect(() => {
    // Find the payment
    const paymentData = payments.find(p => p.id === id);
    if (!paymentData) {
      toast.error('Payment not found');
      navigate('/');
      return;
    }
    
    setPayment(paymentData);
  }, [id, payments, navigate]);
  
  if (!payment) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse">Loading payment details...</div>
      </div>
    );
  }
  
  return (
    <PageTransition className="max-w-[1200px] mx-auto p-6">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
        
        <h1 className="text-3xl font-bold mb-2">Payment Details</h1>
        <p className="text-muted-foreground">
          View and manage payment for {payment.employeeName}
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          {payment.payslipData ? (
            <PayslipViewer 
              paymentId={payment.id} 
              payslipData={payment.payslipData} 
            />
          ) : (
            <div className="flex items-center justify-center h-64 border rounded-lg bg-gray-50 flex-col gap-4">
              <p className="text-muted-foreground">
                No payslip data available. Please upload a payslip.
              </p>
              <Button onClick={() => setUploaderOpen(true)}>
                <Upload className="mr-2 h-4 w-4" />
                Upload Payslip
              </Button>
            </div>
          )}
        </div>
        
        <div>
          <PayslipUploader 
            paymentId={payment.id}
            open={uploaderOpen}
            onOpenChange={setUploaderOpen}
          />
        </div>
      </div>
    </PageTransition>
  );
};

export default Payroll;
