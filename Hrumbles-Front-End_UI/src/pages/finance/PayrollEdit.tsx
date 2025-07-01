
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PageTransition from '@/components/ui-custom/PageTransition';
import PayrollForm from '@/components/financial/PayrollForm';
import { useFinancialStore } from '@/lib/financial-data';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const PayrollEdit = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { payments, updatePayment } = useFinancialStore();
  const payment = payments.find(p => p.id === id);
  
  if (!payment) {
    toast.error('Payment not found');
    navigate('/');
    return null;
  }
  
  return (
    <PageTransition className="max-w-[1200px] mx-auto p-6">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate(`/payroll/${id}`)}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Payslip
        </Button>
        
        <h1 className="text-3xl font-bold mb-2">Edit Payment</h1>
        <p className="text-muted-foreground">
          Update payment details for {payment.employeeName}
        </p>
      </div>
      
      <PayrollForm payment={payment} />
    </PageTransition>
  );
};

export default PayrollEdit;
