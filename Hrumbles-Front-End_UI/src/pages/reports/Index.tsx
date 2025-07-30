// src/pages/ReportsPage.tsx
import React, { useState } from 'react';
import { Building2, Users, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ReportType } from '@/types/reports';
import ClientWiseReport from '@/components/reports/ClientWiseReport';
import IndividualReport from '@/components/reports/IndividualReport';
import RecruiterReportPage from '@/components/reports/RecruiterReportPage';
import TalentProfileReport from '@/components/reports/TalentProfileReport';
import TalentTrendsReport from '@/components/reports/TalentTrendsReport';
import VerificationReportPage from '@/components/reports/VerificationReportPage';
import ConsolidatedStatusReport from '@/components/reports/ConsolidatedStatusReport';
import ContactsReport from '@/components/reports/ContactsReport'; // New import
import CompaniesReport from '@/components/reports/CompaniesReport'; 
import ContactsTrendsReport from '@/components/reports/ContactsTrendsReport'; // New import
import CompaniesTrendsReport from '@/components/reports/CompaniesTrendsReport';

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
         case 'talent':
        return <TalentProfileReport />; 
        case 'talent_trends':
        return <TalentTrendsReport />;
        case 'verification':
        return <VerificationReportPage />;
        case 'consolidated_status':
        return <ConsolidatedStatusReport />;
        case 'contacts':
        return <ContactsReport />;
        case 'companies':
        return <CompaniesReport />;
        case 'contacts_trends':
        return <ContactsTrendsReport />;
        case 'companies_trends':
        return <CompaniesTrendsReport />;
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
          <Card
            onClick={() => setSelectedReportType('talent')}
            className="cursor-pointer hover:shadow-lg transition-shadow"
          >
            <CardHeader>
              <CardTitle className="flex items-center">
                <UserCheck className="mr-2" /> Talent Profile Report
              </CardTitle>
            </CardHeader>
            <CardContent>
              View candidate status counts and distributions by individual employees
            </CardContent>
          </Card>
          <Card
            onClick={() => setSelectedReportType('talent_trends')}
            className="cursor-pointer hover:shadow-lg transition-shadow"
          >
            <CardHeader>
              <CardTitle className="flex items-center">
                <UserCheck className="mr-2" /> Talent Trends Report
              </CardTitle>
            </CardHeader>
            <CardContent>
              View candidate status counts and distributions by individual employees
            </CardContent>
          </Card>
          <Card
            onClick={() => setSelectedReportType('verification')}
            className="cursor-pointer hover:shadow-lg transition-shadow"
          >
            <CardHeader>
              <CardTitle className="flex items-center">
                <UserCheck className="mr-2" /> Verification Report
              </CardTitle>
            </CardHeader>
            <CardContent>
              View candidate status counts and distributions by individual employees
            </CardContent>
          </Card>
          <Card
            onClick={() => setSelectedReportType('consolidated_status')}
            className="cursor-pointer hover:shadow-lg transition-shadow"
          >
            <CardHeader>
              <CardTitle className="flex items-center">
                <UserCheck className="mr-2" /> Consolidated Status Report
              </CardTitle>
            </CardHeader>
            <CardContent>
              View candidate status counts and distributions by individual employees
            </CardContent>
          </Card>
          <Card
            onClick={() => setSelectedReportType('contacts')}
            className="cursor-pointer hover:shadow-lg transition-shadow"
          >
            <CardHeader>
              <CardTitle className="flex items-center">
                <UserCheck className="mr-2" /> Contacts Report
              </CardTitle>
            </CardHeader>
            <CardContent>
              View candidate status counts and distributions by individual employees
            </CardContent>
          </Card>
          <Card
            onClick={() => setSelectedReportType('companies')}
            className="cursor-pointer hover:shadow-lg transition-shadow"
          >
            <CardHeader>
              <CardTitle className="flex items-center">
                <UserCheck className="mr-2" /> Companies Report
              </CardTitle>
            </CardHeader>
            <CardContent>
              View candidate status counts and distributions by individual employees
            </CardContent>
          </Card>
          <Card
            onClick={() => setSelectedReportType('contacts_trends')}
            className="cursor-pointer hover:shadow-lg transition-shadow"
          >
            <CardHeader>
              <CardTitle className="flex items-center">
                <UserCheck className="mr-2" /> Contacts Trends Report
              </CardTitle>
            </CardHeader>
            <CardContent>
              View candidate status counts and distributions by individual employees
            </CardContent>
          </Card>
          <Card
            onClick={() => setSelectedReportType('companies_trends')}
            className="cursor-pointer hover:shadow-lg transition-shadow"
          >
            <CardHeader>
              <CardTitle className="flex items-center">
                <UserCheck className="mr-2" /> Companies Trends Report
              </CardTitle>
            </CardHeader>
            <CardContent>
              View candidate status counts and distributions by individual employees
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
