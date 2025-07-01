// src/pages/ReportsPage.tsx
import React, { useState } from 'react';
import { Building2, Users, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ReportType } from '@/types/reports';
import ClientWiseReport from '@/components/reports/ClientWiseReport';
import IndividualReport from '@/components/reports/IndividualReport';
import RecruiterReportPage from '@/components/reports/RecruiterReportPage';

const ReportsPage: React.FC = () => {
  const [selectedReportType, setSelectedReportType] = useState<ReportType | null>(null);

  const renderReportContent = () => {
    if (!selectedReportType) return null;

    switch (selectedReportType) {
      case 'client':
        return <ClientWiseReport />;
      case 'individual':
        return <IndividualReport />;
      case 'recruiter':
        return <RecruiterReportPage />;
      default:
        return null;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Reports Dashboard</h1>

      {!selectedReportType && (
        <div className="grid md:grid-cols-3 gap-6">
          <Card
            onClick={() => setSelectedReportType('client')}
            className="cursor-pointer hover:shadow-lg transition-shadow"
          >
            <CardHeader>
              <CardTitle className="flex items-center">
                <Building2 className="mr-2" /> Client Wise Report
              </CardTitle>
            </CardHeader>
            <CardContent>
              View candidate status counts and distributions for each client
            </CardContent>
          </Card>

          <Card
            onClick={() => setSelectedReportType('individual')}
            className="cursor-pointer hover:shadow-lg transition-shadow"
          >
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="mr-2" /> Individual Report
              </CardTitle>
            </CardHeader>
            <CardContent>
              View candidate status counts and distributions by individual employees
            </CardContent>
          </Card>

          <Card
            onClick={() => setSelectedReportType('recruiter')}
            className="cursor-pointer hover:shadow-lg transition-shadow"
          >
            <CardHeader>
              <CardTitle className="flex items-center">
                <UserCheck className="mr-2" /> Recruiter Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              Track recruiter performance with detailed metrics and visualizations
            </CardContent>
          </Card>
        </div>
      )}

      {selectedReportType && (
        <div>
          <Button variant="outline" onClick={() => setSelectedReportType(null)} className="mb-4">
            Back to Report Selection
          </Button>
          {renderReportContent()}
        </div>
      )}
    </div>
  );
};

export default ReportsPage;