import React from "react";
import { useSelector } from "react-redux";
import { DashboardHeroCarousel } from "./DashboardHeroCarousel";
import VerificationDashboard from './analytics/VerificationDashboard';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent 
} from '@/components/ui/card';
import { ShieldCheck, Activity } from 'lucide-react';

const VerificationSuite = () => {
  const { user, role } = useSelector((state: any) => state.auth);
  const organizationId = useSelector((state: any) => state.auth.organization_id);

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 md:p-8">
      <div className="max-w-9xl mx-auto space-y-8"> 
        
        {/* Header Section */}
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
            Verification Suite
          </h1>
          <p className="text-gray-500">
            Monitor verification schedules and organizational insights.
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <div className="xl:col-span-8">
            <DashboardHeroCarousel 
              organizationId={organizationId} 
              user={user} 
            />
          </div>

          <div className="xl:col-span-4 space-y-6">
            <Card className="shadow-md border-none bg-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-indigo-600" />
                  Verification Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-indigo-600">Active</div>
                <p className="text-xs text-gray-500 mt-1">
                  System is monitoring activity for {new Date().getFullYear()}.
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-md border-none bg-gradient-to-br from-purple-50 to-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-gray-700">
                  Quick Stats
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-xs text-gray-500">Available Types</p>
                  <p className="text-lg font-bold text-purple-600">7 Verifications</p>
                </div>
                <div className="flex justify-between items-center">
                  {/* CHANGED: Price Range -> Credit Range */}
                  <p className="text-xs text-gray-500">Credit Range</p>
                  <p className="text-lg font-bold text-purple-600">5 - 100 Credits</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* --- Analytics Section --- */}
        <div className="space-y-6">
          <div className="border-t pt-8">
            {/* CHANGED: Simplified Title */}
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
              Verification Analytics
            </h2>
          </div>
          {/* CalendarCard removed from here as per Goal 1 */}
          <VerificationDashboard organizationId={organizationId} />
        </div>

      </div>
    </div>
  );
};

export default VerificationSuite;