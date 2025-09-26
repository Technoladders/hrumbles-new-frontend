// src/components/global/OrganizationManagement/TrialSubscriptionCard.tsx
import React, { FC } from 'react';
import { Card, CardContent } from '@/components/ui/card'; // Assuming shadcn/ui Card
import { Button } from '@/components/ui/button'; // Assuming shadcn/ui Button
import { AlertCircle, Timer, Award, Rocket, XCircle, Pencil } from 'lucide-react'; // Icons for clarity
import moment from 'moment'; // For date formatting (install: npm install moment)

interface TrialSubscriptionCardProps {
  organizationId: string;
  subscriptionStatus: 'trial' | 'active' | 'inactive' | 'expired' | 'canceled';
  trialStartDate?: string; // ISO string
  trialEndDate?: string; // ISO string
  subscriptionPlan?: string;
  trialExtended?: boolean;
  onUpgradeClick: (orgId: string) => void;
  onExtendTrialClick: (orgId: string) => void;
  onOpenManageSubscription: () => void; 
}

const TrialSubscriptionCard: FC<TrialSubscriptionCardProps> = ({
  organizationId,
  subscriptionStatus,
  trialStartDate,
  trialEndDate,
  subscriptionPlan,
  trialExtended,
  onUpgradeClick,
  onExtendTrialClick,
  onOpenManageSubscription,
}) => {
  const now = moment();
  let daysLeft: number | null = null;
  if (trialEndDate && subscriptionStatus === 'trial') {
    const end = moment(trialEndDate);
    if (end.isAfter(now)) {
      daysLeft = end.diff(now, 'days') + 1; // +1 to count current day fully
    } else {
      daysLeft = 0; // Trial has ended or is today
    }
  }

  const renderStatus = () => {
    switch (subscriptionStatus) {
      case 'trial':
        if (daysLeft === null || daysLeft <= 0) {
          return (
            <div className="flex items-center text-red-600 font-bold gap-2">
              <XCircle size={20} /> Trial Expired!
            </div>
          );
        }
        return (
          <div className="flex items-center text-yellow-600 font-bold gap-2">
            <Timer size={20} /> {daysLeft} Days Left on Trial {trialExtended ? '(Extended)' : ''}
          </div>
        );
      case 'active':
        return (
          <div className="flex items-center text-green-600 font-bold gap-2">
            <Award size={20} /> Active: {subscriptionPlan || 'Premium'}
          </div>
        );
      case 'inactive':
        return (
          <div className="flex items-center text-orange-600 font-bold gap-2">
            <AlertCircle size={20} /> Subscription Inactive
          </div>
        );
      case 'expired': // Specifically for a trial that has fully expired and not active
        return (
          <div className="flex items-center text-red-600 font-bold gap-2">
            <XCircle size={20} /> Trial Expired!
          </div>
        );
      case 'canceled':
        return (
          <div className="flex items-center text-gray-600 font-bold gap-2">
            <XCircle size={20} /> Subscription Canceled
          </div>
        );
      default:
        return (
          <div className="flex items-center text-gray-500 font-bold gap-2">
            <AlertCircle size={20} /> Unknown Status
          </div>
        );
    }
  };

  return (
    <Card className="shadow-lg border-none bg-white transition-all duration-300 hover:shadow-xl col-span-full">
      <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0 md:space-x-6">
        <div className="flex items-center gap-4">
          <Rocket size={40} className="text-purple-600" />
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">Your Organization's Subscription</p>
            <h3 className="text-xl font-bold text-gray-800">{renderStatus()}</h3>
            {trialStartDate && (
              <p className="text-xs text-gray-500 mt-1">
                Trial started: {moment(trialStartDate).format("MMM D, YYYY")}
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-3 mt-4 md:mt-0">
          {/* Show Upgrade if trial expired */}
          {subscriptionStatus === 'trial' && (daysLeft === null || daysLeft <= 0) && (
            <Button variant="destructive" onClick={() => onUpgradeClick(organizationId)}>
              Upgrade Now
            </Button>
          )}
          {/* Show Extend Trial if in trial and not extended yet */}
          {subscriptionStatus === 'trial' && daysLeft && daysLeft > 0 && !trialExtended && (
            <Button variant="outline" onClick={() => onExtendTrialClick(organizationId)}>
              Extend Trial (21 Days)
            </Button>
          )}
          {/* Show Trial Extended if in trial and already extended */}
          {subscriptionStatus === 'trial' && daysLeft && daysLeft > 0 && trialExtended && (
            <Button variant="outline" disabled>
              Trial Extended
            </Button>
          )}
          {/* Show View Plans if not active/trial (e.g., inactive, canceled, expired) */}
          {subscriptionStatus !== 'active' && subscriptionStatus !== 'trial' && (daysLeft === null || daysLeft <= 0) && (
            <Button onClick={() => onUpgradeClick(organizationId)}>
              View Plans
            </Button>
          )}

            {/* --- NEW: Manage Subscription button --- */}
        {/* This button should always be visible to an admin on this card */}
        <Button variant="outline" onClick={onOpenManageSubscription} className="flex items-center gap-1">
          <Pencil className="h-4 w-4" />
          <span className="hidden sm:inline">Manage Subscription</span> {/* Hide text on very small screens */}
        </Button>
        {/* --- END NEW --- */}
        </div>
      </CardContent>
    </Card>
  );
};

export default TrialSubscriptionCard;