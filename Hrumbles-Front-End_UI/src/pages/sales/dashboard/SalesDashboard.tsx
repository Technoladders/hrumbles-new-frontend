// Hrumbles-Front-End_UI/src/pages/sales/SalesDashboard.tsx
import React from 'react';
import { useSelector } from 'react-redux';
import { SalesDashboardLayout } from '@/components/sales/sales-dashboard/SalesDashboardLayout';

const SalesDashboard: React.FC = () => {
  const { user, role } = useSelector((state: any) => state.auth);
  const organizationId = useSelector((state: any) => state.auth.organization_id);

  return (
    <SalesDashboardLayout 
      userId={user?.id}
      organizationId={organizationId}
      role={role}
    />
  );
};

export default SalesDashboard;