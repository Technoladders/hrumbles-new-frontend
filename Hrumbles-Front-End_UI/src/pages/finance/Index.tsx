
import React from 'react';
import FinancialDashboard from '@/components/financial/FinancialDashboard';
import PageTransition from '@/components/ui-custom/PageTransition';

const Index = () => {
  return (
    <PageTransition>
      <FinancialDashboard />
    </PageTransition>
  );
};

export default Index;
