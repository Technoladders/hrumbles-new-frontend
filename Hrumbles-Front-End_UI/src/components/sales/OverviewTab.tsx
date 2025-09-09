import React from 'react';
import { CompanyDetail as CompanyDetailType } from "@/types/company";
import CompanyPrimaryDetails from './CompanyPrimaryDetails';
import CompanyFinancials from './CompanyFinancials';

interface OverviewTabProps {
  company: CompanyDetailType;
}

const OverviewTab: React.FC<OverviewTabProps> = ({ company }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 bg-gray-50 p-6 rounded-lg">
      <div className="lg:col-span-2">
        <CompanyPrimaryDetails company={company} />
      </div>
      <div className="lg:col-span-3">
        <CompanyFinancials company={company} />
      </div>
    </div>
  );
};

export default OverviewTab;