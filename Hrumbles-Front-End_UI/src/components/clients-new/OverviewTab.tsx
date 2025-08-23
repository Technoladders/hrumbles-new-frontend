// src/components/clients-new/OverviewTab.tsx
import React from 'react';
import { Client, ClientContact, ClientMetrics, MonthlyData, HiresByMonth, RecruiterPerformance, PipelineStage } from './ClientTypes';
import ClientDetails from './ClientDetails';
import ClientFinancials from './ClientFinancials';
import { Skeleton } from '@/components/ui/skeleton';

// --- STEP 1: Update the props interface to accept the handler functions ---
interface OverviewTabProps {
  client: Client | null;
  contacts: ClientContact[];
  metrics: ClientMetrics;
    allCandidatesCount: number;
  recruiterPerformance: RecruiterPerformance[];
  pipelineStages: PipelineStage[];
  monthlyData: MonthlyData[];
  hiresByMonth: HiresByMonth[];
  loading: boolean;
  // Add the function props that will be passed down
  onAddContact: () => void;
  onEditContact: (contact: ClientContact) => void;
  onDeleteContact: (contactId: string) => void;
  onEditAddress: (type: 'billing' | 'shipping') => void;
}

// --- STEP 2: Receive the new props in the component's function signature ---
const OverviewTab: React.FC<OverviewTabProps> = ({ 
  client, 
  contacts, 
  metrics, 
  monthlyData, 
  hiresByMonth, 
  loading,
  // Destructure the new handler functions
  onAddContact,
  onEditContact,
  onDeleteContact,
  onEditAddress,
    allCandidatesCount,
  recruiterPerformance,
  pipelineStages,
}) => {
  if (loading || !client) {
    return (
       <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mt-4">
        <div className="lg:col-span-2 space-y-4"><Skeleton className="h-48 w-full" /><Skeleton className="h-64 w-full" /></div>
        <div className="lg:col-span-3 space-y-4"><Skeleton className="h-32 w-full" /><Skeleton className="h-80 w-full" /></div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 bg-gray-50 p-6 rounded-lg">
      <div className="lg:col-span-2">
        {/* --- STEP 3: Pass the handler functions down to the ClientDetails component --- */}
        <ClientDetails 
            client={client} 
            contacts={contacts} 
            onAddContact={onAddContact}
            onEditContact={onEditContact}
            onDeleteContact={onDeleteContact}
            onEditAddress={onEditAddress}
            
        />
      </div>
      <div className="lg:col-span-3">
        <ClientFinancials 
            metrics={metrics} 
            monthlyData={monthlyData} 
            hiresByMonth={hiresByMonth} 
             allCandidatesCount={allCandidatesCount}
            recruiterPerformance={recruiterPerformance}
            pipelineStages={pipelineStages}
        />
      </div>
    </div>
  );
};

export default OverviewTab;