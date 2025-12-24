// src/components/global/OrganizationManagement/TrialSubscriptionCard.tsx
import React, { FC } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Timer, Award, Rocket, XCircle, Pencil, Clock, CalendarDays } from 'lucide-react';
import moment from 'moment';
import { Link } from 'react-router-dom';

interface TrialSubscriptionCardProps {
  organizationId: string;
  subscriptionStatus: 'trial' | 'active' | 'inactive' | 'expired' | 'canceled';
  startDate?: string | null; // Generic start
  endDate?: string | null;   // Generic end (expiry)
  subscriptionPlan?: string | null;
  trialExtended?: boolean;
  onUpgradeClick: (orgId: string) => void;
  onExtendTrialClick: (orgId: string) => void;
  onOpenManageSubscription: () => void;
  pendingInvoice?: any;
}

const TrialSubscriptionCard: FC<TrialSubscriptionCardProps> = ({
  organizationId,
  subscriptionStatus,
  startDate,
  endDate,
  subscriptionPlan,
  trialExtended,
  onExtendTrialClick,
  onOpenManageSubscription,
  pendingInvoice
}) => {
  const now = moment();
  let daysLeft: number | null = null;
  
  if (endDate) {
    const end = moment(endDate);
    if (end.isAfter(now)) {
      daysLeft = end.diff(now, 'days') + 1;
    } else {
      daysLeft = 0;
    }
  }

  const renderStatusHeader = () => {
    switch (subscriptionStatus) {
      case 'trial':
        if (daysLeft === null || daysLeft <= 0) {
          return <span className="text-red-600 flex items-center gap-2"><XCircle size={20} /> Trial Expired</span>;
        }
        return <span className="text-yellow-600 flex items-center gap-2"><Timer size={20} /> Trial Period ({daysLeft} Days Left)</span>;
      case 'active':
        // Check if active but expiring soon (e.g., < 7 days)
        if (daysLeft !== null && daysLeft <= 7) {
             return <span className="text-orange-600 flex items-center gap-2"><AlertCircle size={20} /> Active - Expiring Soon ({daysLeft} Days)</span>;
        }
        return <span className="text-green-600 flex items-center gap-2"><Award size={20} /> Active Subscription</span>;
      case 'expired':
        return <span className="text-red-600 flex items-center gap-2"><XCircle size={20} /> Subscription Expired</span>;
      default:
        return <span className="text-gray-500 flex items-center gap-2"><AlertCircle size={20} /> {subscriptionStatus}</span>;
    }
  };

  const planName = subscriptionPlan || (subscriptionStatus === 'trial' ? 'Free Trial' : 'Unknown Plan');

  return (
    <Card className="shadow-sm border-0 bg-white relative overflow-hidden group hover:shadow-md transition-shadow">
      {/* Pending Banner */}
      {pendingInvoice && (
        <div className="absolute top-0 left-0 right-0 bg-orange-50 border-b border-orange-100 px-4 py-2 flex justify-between items-center text-xs z-10">
           <span className="flex items-center gap-2 text-orange-800 font-medium">
             <Clock className="h-3 w-3 animate-pulse" />
             Pending Activation: {pendingInvoice.subscription_config?.plan_name}
           </span>
           <Link to="/organization/invoices" className="underline text-orange-600 hover:text-orange-800 font-medium">
             View & Pay Invoice
           </Link>
        </div>
      )}

      <CardContent className={`p-6 flex flex-col md:flex-row items-center justify-between gap-6 ${pendingInvoice ? 'mt-8' : ''}`}>
        
        {/* Left: Icon & Main Info */}
        <div className="flex items-start gap-5 w-full md:w-auto">
          <div className={`h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm
            ${subscriptionStatus === 'active' ? 'bg-green-50 text-green-600' : 'bg-purple-50 text-purple-600'}
          `}>
             {subscriptionStatus === 'active' ? <Award size={28} /> : <Rocket size={28} />}
          </div>
          
          <div className="space-y-1">
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-3">
              {renderStatusHeader()}
            </h3>
            <p className="text-sm text-gray-600 font-medium">
                Current Plan: <span className="text-gray-900">{planName}</span>
                {trialExtended && subscriptionStatus === 'trial' && <Badge variant="outline" className="ml-2 text-[10px] border-yellow-300 bg-yellow-50 text-yellow-700">Extended</Badge>}
            </p>
          </div>
        </div>

        {/* Middle: Dates */}
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-8 border-t sm:border-t-0 sm:border-l border-gray-100 pt-4 sm:pt-0 sm:pl-8 w-full md:w-auto">
             <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold flex items-center gap-1">
                    <CalendarDays className="h-3 w-3" /> Started On
                </p>
                <p className="text-sm font-medium text-gray-700">
                    {startDate ? moment(startDate).format("D MMM, YYYY") : 'N/A'}
                </p>
             </div>
             <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Expires On
                </p>
                <p className={`text-sm font-medium ${daysLeft !== null && daysLeft <= 7 ? 'text-red-600' : 'text-gray-700'}`}>
                    {endDate ? moment(endDate).format("D MMM, YYYY") : 'Lifetime / N/A'}
                </p>
             </div>
        </div>

        {/* Right: Actions */}
        <div className="flex gap-3 w-full md:w-auto justify-end mt-2 md:mt-0">
          {subscriptionStatus === 'trial' && daysLeft !== null && daysLeft > 0 && !trialExtended && (
            <Button variant="outline" size="sm" onClick={() => onExtendTrialClick(organizationId)} className="border-purple-200 text-purple-700 hover:bg-purple-50">
              Extend Trial
            </Button>
          )}

          <Button 
            variant="default" 
            size="sm"
            onClick={onOpenManageSubscription} 
            className="flex items-center gap-2 bg-gray-900 hover:bg-black text-white shadow-md transition-all hover:translate-y-[-1px]"
          >
            <Pencil className="h-3.5 w-3.5" />
            {subscriptionStatus === 'active' ? 'Modify Subscription' : 'Upgrade Plan'}
          </Button>
        </div>

      </CardContent>
    </Card>
  );
};

export default TrialSubscriptionCard;