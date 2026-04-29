// src/components/clients-new/OverviewTab.tsx
import React from 'react';
import { Client, ClientContact, ClientMetrics, MonthlyData, HiresByMonth, RecruiterPerformance, PipelineStage } from './ClientTypes';
import ClientDetails from './ClientDetails';
import ClientFinancials from './ClientFinancials';

interface OverviewTabProps {
  client: Client | null; contacts: ClientContact[]; metrics: ClientMetrics;
  allCandidatesCount: number; recruiterPerformance: RecruiterPerformance[];
  pipelineStages: PipelineStage[]; monthlyData: MonthlyData[];
  hiresByMonth: HiresByMonth[]; loading: boolean;
  onAddContact: () => void; onEditContact: (contact: ClientContact) => void;
  onDeleteContact: (contactId: string) => void;
  onEditAddress: (type: 'billing_address' | 'shipping_address') => void;
}

const Skel = ({ className = '' }: { className?: string }) => (
  <div className={`rounded-xl bg-gray-100 animate-pulse ${className}`} />
);

const OverviewTab: React.FC<OverviewTabProps> = ({
  client, contacts, metrics, monthlyData, hiresByMonth, loading,
  onAddContact, onEditContact, onDeleteContact, onEditAddress,
  allCandidatesCount, recruiterPerformance, pipelineStages,
}) => {
  if (loading || !client) return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
      <div className="lg:col-span-2 space-y-4"><Skel className="h-48" /><Skel className="h-64" /></div>
      <div className="lg:col-span-3 space-y-4"><Skel className="h-32" /><Skel className="h-80" /></div>
    </div>
  );
  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
      <div className="lg:col-span-2">
        <ClientDetails client={client} contacts={contacts} onAddContact={onAddContact} onEditContact={onEditContact} onDeleteContact={onDeleteContact} onEditAddress={onEditAddress} />
      </div>
      <div className="lg:col-span-3">
        <ClientFinancials metrics={metrics} monthlyData={monthlyData} hiresByMonth={hiresByMonth} allCandidatesCount={allCandidatesCount} recruiterPerformance={recruiterPerformance} pipelineStages={pipelineStages} />
      </div>
    </div>
  );
};

export default OverviewTab;