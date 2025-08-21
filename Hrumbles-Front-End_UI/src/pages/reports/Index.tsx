import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSelector } from "react-redux";
import { Building2, Users, UserCheck, Clock, Contact, Building, BarChart2, FileText, Users2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ReportType } from '@/types/reports';
import ClientWiseReport from '@/components/reports/ClientWiseReport';
import IndividualReport from '@/components/reports/IndividualReport';
import RecruiterReportPage from '@/components/reports/RecruiterReportPage';
import TalentProfileReport from '@/components/reports/TalentProfileReport';
import TalentTrendsReport from '@/components/reports/TalentTrendsReport';
import VerificationReportPage from '@/components/reports/VerificationReportPage';
import ConsolidatedStatusReport from '@/components/reports/ConsolidatedStatusReport';
import ContactsReport from '@/components/reports/ContactsReport';
import CompaniesReport from '@/components/reports/CompaniesReport';
import ContactsTrendsReport from '@/components/reports/ContactsTrendsReport';
import CompaniesTrendsReport from '@/components/reports/CompaniesTrendsReport';
import AttendanceReportsPage from '@/components/reports/attendance/AttendanceReportsPage';
import ContactStatusReport from '@/components/reports/ContactsStatusReport';
import CompaniesStatusReport from '@/components/reports/CompaniesStatusReport';

const ITECH_ORGANIZATION_ID = "1961d419-1272-4371-8dc7-63a4ec71be83";

const ReportIndex: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Initialize state directly from the URL's 'type' parameter.
  const [selectedReportType, setSelectedReportType] = useState<ReportType | null>(
    () => searchParams.get('type') as ReportType | null
  );

  const organizationId = useSelector((state: any) => state.auth.organization_id);

    useEffect(() => {
    setSelectedReportType(searchParams.get('type') as ReportType | null);
  }, [searchParams]);

   const handleSelectReport = (reportType: ReportType) => {
    setSelectedReportType(reportType);
    setSearchParams({ type: reportType });
  };

  const handleGoBack = () => {
    setSelectedReportType(null);
    setSearchParams({}); // This clears the URL search parameters
  };

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
      case 'attendance':
        return <AttendanceReportsPage />;
      case 'contact_status':
        return <ContactStatusReport />;
      case 'companies_status':
        return <CompaniesStatusReport />;
      default:
        return null;
    }
  };

  return (
    <div className="p-6 space-y-6 min-h-screen bg-gray-50">
      <h1 className="text-3xl font-bold text-gray-800 animate-fade-in">Reports Dashboard</h1>

      {!selectedReportType && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {organizationId === ITECH_ORGANIZATION_ID ? (
            // Show only Consolidated Status Report card for ITECH users
            <Card
              onClick={() => handleSelectReport('consolidated_status')}
              className="cursor-pointer hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 animate-scale-up"
            >
              <CardHeader className="bg-red-50">
                <CardTitle className="flex items-center text-red-700">
                  <Users2 className="mr-2 h-6 w-6" /> Consolidated Status Report
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 text-gray-600">
                Consolidated status across all candidates.
              </CardContent>
            </Card>
          ) : (
            // Show all report cards for non-ITECH users
            <>
              <Card
                onClick={() => setSelectedReportType('client')}
                className="cursor-pointer hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 animate-scale-up"
              >
                <CardHeader className="bg-indigo-50">
                  <CardTitle className="flex items-center text-indigo-700">
                    <Building2 className="mr-2 h-6 w-6" /> Client Wise Report
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 text-gray-600">
                  View candidate status counts and distributions for each client.
                </CardContent>
              </Card>

              <Card
                onClick={() => setSelectedReportType('individual')}
                className="cursor-pointer hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 animate-scale-up"
              >
                <CardHeader className="bg-blue-50">
                  <CardTitle className="flex items-center text-blue-700">
                    <Users className="mr-2 h-6 w-6" /> Individual Report
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 text-gray-600">
                  View candidate status counts by individual employees.
                </CardContent>
              </Card>

              <Card
                onClick={() => setSelectedReportType('recruiter')}
                className="cursor-pointer hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 animate-scale-up"
              >
                <CardHeader className="bg-green-50">
                  <CardTitle className="flex items-center text-green-700">
                    <UserCheck className="mr-2 h-6 w-6" /> Recruiter Performance
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 text-gray-600">
                  Track recruiter performance with detailed metrics.
                </CardContent>
              </Card>

              <Card
                onClick={() => setSelectedReportType('talent')}
                className="cursor-pointer hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 animate-scale-up"
              >
                <CardHeader className="bg-purple-50">
                  <CardTitle className="flex items-center text-purple-700">
                    <UserCheck className="mr-2 h-6 w-6" /> Talent Profile Report
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 text-gray-600">
                  View talent profile status distributions.
                </CardContent>
              </Card>

              <Card
                onClick={() => setSelectedReportType('talent_trends')}
                className="cursor-pointer hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 animate-scale-up"
              >
                <CardHeader className="bg-teal-50">
                  <CardTitle className="flex items-center text-teal-700">
                    <BarChart2 className="mr-2 h-6 w-6" /> Talent Trends Report
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 text-gray-600">
                  Analyze trends in talent data.
                </CardContent>
              </Card>

              <Card
                onClick={() => setSelectedReportType('verification')}
                className="cursor-pointer hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 animate-scale-up"
              >
                <CardHeader className="bg-yellow-50">
                  <CardTitle className="flex items-center text-yellow-700">
                    <FileText className="mr-2 h-6 w-6" /> Verification Report
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 text-gray-600">
                  View verification status details.
                </CardContent>
              </Card>

              <Card
                 onClick={() => handleSelectReport('consolidated_status')}
                className="cursor-pointer hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 animate-scale-up"
              >
                <CardHeader className="bg-red-50">
                  <CardTitle className="flex items-center text-red-700">
                    <Users2 className="mr-2 h-6 w-6" /> Consolidated Status Report
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 text-gray-600">
                  Consolidated status across all candidates.
                </CardContent>
              </Card>

              <Card
                onClick={() => setSelectedReportType('contacts')}
                className="cursor-pointer hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 animate-scale-up"
              >
                <CardHeader className="bg-indigo-50">
                  <CardTitle className="flex items-center text-indigo-700">
                    <Contact className="mr-2 h-6 w-6" /> Contacts Report
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 text-gray-600">
                  View contact status details.
                </CardContent>
              </Card>

              <Card
                onClick={() => setSelectedReportType('companies')}
                className="cursor-pointer hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 animate-scale-up"
              >
                <CardHeader className="bg-blue-50">
                  <CardTitle className="flex items-center text-blue-700">
                    <Building className="mr-2 h-6 w-6" /> Companies Report
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 text-gray-600">
                  View company status details.
                </CardContent>
              </Card>

              <Card
                onClick={() => setSelectedReportType('contacts_trends')}
                className="cursor-pointer hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 animate-scale-up"
              >
                <CardHeader className="bg-teal-50">
                  <CardTitle className="flex items-center text-teal-700">
                    <BarChart2 className="mr-2 h-6 w-6" /> Contacts Trends Report
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 text-gray-600">
                  Analyze trends in contact data.
                </CardContent>
              </Card>

              <Card
                onClick={() => setSelectedReportType('companies_trends')}
                className="cursor-pointer hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 animate-scale-up"
              >
                <CardHeader className="bg-purple-50">
                  <CardTitle className="flex items-center text-purple-700">
                    <BarChart2 className="mr-2 h-6 w-6" /> Companies Trends Report
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 text-gray-600">
                  Analyze trends in company data.
                </CardContent>
              </Card>

              <Card
                onClick={() => setSelectedReportType('attendance')}
                className="cursor-pointer hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 animate-scale-up"
              >
                <CardHeader className="bg-green-50">
                  <CardTitle className="flex items-center text-green-700">
                    <Clock className="mr-2 h-6 w-6" /> Attendance Report
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 text-gray-600">
                  View attendance records and details.
                </CardContent>
              </Card>

              <Card
                onClick={() => setSelectedReportType('contact_status')}
                className="cursor-pointer hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 animate-scale-up"
              >
                <CardHeader className="bg-yellow-50">
                  <CardTitle className="flex items-center text-yellow-700">
                    <Contact className="mr-2 h-6 w-6" /> Contact Status Report
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 text-gray-600">
                  View current status of contacts.
                </CardContent>
              </Card>

              <Card
                onClick={() => setSelectedReportType('companies_status')}
                className="cursor-pointer hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 animate-scale-up"
              >
                <CardHeader className="bg-red-50">
                  <CardTitle className="flex items-center text-red-700">
                    <Building className="mr-2 h-6 w-6" /> Companies Status Report
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 text-gray-600">
                  View current status of companies.
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}

      {selectedReportType && (
        <div className="animate-fade-in">
          <Button variant="outline" onClick={() => setSelectedReportType(null)} className="mb-4">
            Back to Report Selection
          </Button>
          {renderReportContent()}
        </div>
      )}
    </div>
  );
};

export default ReportIndex;