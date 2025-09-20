import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSelector } from "react-redux";
import { supabase } from '@/integrations/supabase/client'; // NEW: Import Supabase client
import { Building2, Users, UserCheck, Clock, Contact, Building, BarChart2, FileText, Users2, FileUp } from 'lucide-react';
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
import { LoadingSpinner } from '@/components/ui/loading-spinner'; // NEW: Import a loading spinner

const ITECH_ORGANIZATION_ID = [
  "1961d419-1272-4371-8dc7-63a4ec71be83",
  "4d57d118-d3a2-493c-8c3f-2cf1f3113fe9",
  "22068cb4-88fb-49e4-9fb8-4fa7ae9c23e5"
];

const RECRUITMENT_FIRM_ID = "87fd4bb2-dbaf-4775-954a-eb82f70ac961";


// NEW: A reusable component for the Consolidated Report Card to avoid duplication
const ConsolidatedReportCard = ({ onSelect }: { onSelect: () => void }) => (
  <Card
    onClick={onSelect}
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
);


const ReportIndex: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedReportType, setSelectedReportType] = useState<ReportType | null>(
    () => searchParams.get('type') as ReportType | null
  );

  // MODIFIED: Get full auth state
  const { organization_id: organizationId, user, role } = useSelector((state: any) => state.auth);
    const { details: organizationDetails, status: firmOrgStatus } = useSelector((state: any) => state.firmOrganization);
    

  // NEW: State for department fetching
  const [departmentName, setDepartmentName] = useState<string | null>(null);
  const [isDepartmentLoading, setIsDepartmentLoading] = useState(true);
  
  // NEW: useEffect to fetch department name for the current user
  useEffect(() => {
    const fetchDepartmentName = async () => {
      if (!user?.id) {
        setIsDepartmentLoading(false);
        return;
      }
      setIsDepartmentLoading(true);
      try {
        const { data: employeeData, error: employeeError } = await supabase
          .from("hr_employees")
          .select("department_id")
          .eq("id", user.id)
          .single();
        if (employeeError || !employeeData?.department_id) {
          throw new Error(employeeError?.message || "No department found");
        }
        const { data: departmentData, error: departmentError } = await supabase
          .from("hr_departments")
          .select("name")
          .eq("id", employeeData.department_id)
          .single();
        if (departmentError) throw departmentError;
        setDepartmentName(departmentData.name || null);
      } catch (error: any) {
        console.error("Error fetching department:", error.message);
        setDepartmentName(null);
      } finally {
        setIsDepartmentLoading(false);
      }
    };
    fetchDepartmentName();
  }, [user?.id]);

  useEffect(() => {
    setSelectedReportType(searchParams.get('type') as ReportType | null);
  }, [searchParams]);

  const handleSelectReport = (reportType: ReportType) => {
    setSelectedReportType(reportType);
    setSearchParams({ type: reportType });
  };

  const handleGoBack = () => { // MODIFIED: Renamed for clarity as it's not used in the provided snippet but good practice
    setSelectedReportType(null);
    setSearchParams({});
  };

  const renderReportContent = () => {
    if (!selectedReportType) return null;
    switch (selectedReportType) {
      case 'client': return <ClientWiseReport />;
      case 'individual': return <IndividualReport />;
      case 'recruiter': return <RecruiterReportPage />;
      case 'talent': return <TalentProfileReport />;
      case 'talent_trends': return <TalentTrendsReport />;
      case 'verification': return <VerificationReportPage />;
      case 'consolidated_status': return <ConsolidatedStatusReport />;
      case 'contacts': return <ContactsReport />;
      case 'companies': return <CompaniesReport />;
      case 'contacts_trends': return <ContactsTrendsReport />;
      case 'companies_trends': return <CompaniesTrendsReport />;
      case 'attendance': return <AttendanceReportsPage />;
      case 'contact_status': return <ContactStatusReport />;
      case 'companies_status': return <CompaniesStatusReport />;
      default: return null;
    }
  };
  
  // NEW: Conditional flag to determine which view to show
  const showOnlyConsolidated = 
    (ITECH_ORGANIZATION_ID.includes(organizationId)) || 
    (role === 'employee' && departmentName === 'Human Resource');

 const showRecruitmentFirmReports = organizationDetails?.is_recruitment_firm;

  return (
    <div className="p-6 space-y-6 min-h-screen bg-gray-50">
      <h1 className="text-3xl font-bold text-gray-800 animate-fade-in">Reports Dashboard</h1>

      {isDepartmentLoading ? ( // NEW: Loading state
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner size={48} />
        </div>
      ) : !selectedReportType ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {showOnlyConsolidated ? (
            // MODIFIED: View for ITECH and HR Employees
            <ConsolidatedReportCard onSelect={() => handleSelectReport('consolidated_status')} />
          ) : showRecruitmentFirmReports ? (
            <>
              {/* --- Reports for Recruitment Firms --- */}
              <Card onClick={() => handleSelectReport('client')} className="cursor-pointer ...">
                 <CardHeader className="bg-indigo-50"><CardTitle className="flex items-center text-indigo-700"><Building2 className="mr-2 h-6 w-6" /> Client Performance</CardTitle></CardHeader>
                 <CardContent className="p-4 text-gray-600">View candidate status counts and distributions for each client.</CardContent>
              </Card>
              <Card onClick={() => handleSelectReport('individual')} className="cursor-pointer ...">
                <CardHeader className="bg-blue-50"><CardTitle className="flex items-center text-blue-700"><Users className="mr-2 h-6 w-6" /> Individual Report</CardTitle></CardHeader>
                <CardContent className="p-4 text-gray-600">View candidate status counts by individual employees.</CardContent>
              </Card>
              <Card onClick={() => handleSelectReport('recruiter')} className="cursor-pointer ...">
                <CardHeader className="bg-green-50"><CardTitle className="flex items-center text-green-700"><UserCheck className="mr-2 h-6 w-6" /> Recruiter Performance</CardTitle></CardHeader>
                <CardContent className="p-4 text-gray-600">Track recruiter performance with detailed metrics.</CardContent>
              </Card>
              <Card onClick={() => handleSelectReport('recruitment_firm_submission')} className="cursor-pointer hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 animate-scale-up">
                <CardHeader className="bg-cyan-50"><CardTitle className="flex items-center text-cyan-700"><FileUp className="mr-2 h-6 w-6" /> Submission Report</CardTitle></CardHeader>
                <CardContent className="p-4 text-gray-600">Track and analyze all candidate submissions.</CardContent>
              </Card>
              <Card onClick={() => handleSelectReport('client')} className="cursor-pointer hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 animate-scale-up">
                 <CardHeader className="bg-indigo-50"><CardTitle className="flex items-center text-indigo-700"><Building2 className="mr-2 h-6 w-6" /> Client Performance</CardTitle></CardHeader>
                 <CardContent className="p-4 text-gray-600">View candidate status counts for each client.</CardContent>
              </Card>
              <Card onClick={() => handleSelectReport('recruiter')} className="cursor-pointer hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 animate-scale-up">
                <CardHeader className="bg-green-50"><CardTitle className="flex items-center text-green-700"><UserCheck className="mr-2 h-6 w-6" /> Recruiter Performance</CardTitle></CardHeader>
                <CardContent className="p-4 text-gray-600">Track recruiter performance with detailed metrics.</CardContent>
              </Card>
              <ConsolidatedReportCard onSelect={() => handleSelectReport('consolidated_status')} />
                <Card onClick={() => handleSelectReport('attendance')} className="cursor-pointer ...">
                <CardHeader className="bg-green-50"><CardTitle className="flex items-center text-green-700"><Clock className="mr-2 h-6 w-6" /> Attendance Report</CardTitle></CardHeader>
                <CardContent className="p-4 text-gray-600">View attendance records and details.</CardContent>
              </Card>
            </>
          ) : (
            // MODIFIED: View for all other users
            <>
              <Card onClick={() => handleSelectReport('client')} className="cursor-pointer ...">
                 <CardHeader className="bg-indigo-50"><CardTitle className="flex items-center text-indigo-700"><Building2 className="mr-2 h-6 w-6" /> Client Performance</CardTitle></CardHeader>
                 <CardContent className="p-4 text-gray-600">View candidate status counts and distributions for each client.</CardContent>
              </Card>
              <Card onClick={() => handleSelectReport('individual')} className="cursor-pointer ...">
                <CardHeader className="bg-blue-50"><CardTitle className="flex items-center text-blue-700"><Users className="mr-2 h-6 w-6" /> Individual Report</CardTitle></CardHeader>
                <CardContent className="p-4 text-gray-600">View candidate status counts by individual employees.</CardContent>
              </Card>
              <Card onClick={() => handleSelectReport('recruiter')} className="cursor-pointer ...">
                <CardHeader className="bg-green-50"><CardTitle className="flex items-center text-green-700"><UserCheck className="mr-2 h-6 w-6" /> Recruiter Performance</CardTitle></CardHeader>
                <CardContent className="p-4 text-gray-600">Track recruiter performance with detailed metrics.</CardContent>
              </Card>
              {/* ... Other report cards ... */}
              <Card onClick={() => handleSelectReport('talent')} className="cursor-pointer ...">
                <CardHeader className="bg-purple-50"><CardTitle className="flex items-center text-purple-700"><UserCheck className="mr-2 h-6 w-6" /> Talent Profile Report</CardTitle></CardHeader>
                <CardContent className="p-4 text-gray-600">View talent profile status distributions.</CardContent>
              </Card>
              <Card onClick={() => handleSelectReport('talent_trends')} className="cursor-pointer ...">
                <CardHeader className="bg-teal-50"><CardTitle className="flex items-center text-teal-700"><BarChart2 className="mr-2 h-6 w-6" /> Talent Trends Report</CardTitle></CardHeader>
                <CardContent className="p-4 text-gray-600">Analyze trends in talent data.</CardContent>
              </Card>
              <Card onClick={() => handleSelectReport('verification')} className="cursor-pointer ...">
                <CardHeader className="bg-yellow-50"><CardTitle className="flex items-center text-yellow-700"><FileText className="mr-2 h-6 w-6" /> Verification Report</CardTitle></CardHeader>
                <CardContent className="p-4 text-gray-600">View verification status details.</CardContent>
              </Card>
              <ConsolidatedReportCard onSelect={() => handleSelectReport('consolidated_status')} />
              <Card onClick={() => handleSelectReport('contacts')} className="cursor-pointer ...">
                <CardHeader className="bg-indigo-50"><CardTitle className="flex items-center text-indigo-700"><Contact className="mr-2 h-6 w-6" /> Contacts Report</CardTitle></CardHeader>
                <CardContent className="p-4 text-gray-600">View contact status details.</CardContent>
              </Card>
              <Card onClick={() => handleSelectReport('companies')} className="cursor-pointer ...">
                <CardHeader className="bg-blue-50"><CardTitle className="flex items-center text-blue-700"><Building className="mr-2 h-6 w-6" /> Companies Report</CardTitle></CardHeader>
                <CardContent className="p-4 text-gray-600">View company status details.</CardContent>
              </Card>
              <Card onClick={() => handleSelectReport('contacts_trends')} className="cursor-pointer ...">
                <CardHeader className="bg-teal-50"><CardTitle className="flex items-center text-teal-700"><BarChart2 className="mr-2 h-6 w-6" /> Contacts Trends Report</CardTitle></CardHeader>
                <CardContent className="p-4 text-gray-600">Analyze trends in contact data.</CardContent>
              </Card>
              <Card onClick={() => handleSelectReport('companies_trends')} className="cursor-pointer ...">
                <CardHeader className="bg-purple-50"><CardTitle className="flex items-center text-purple-700"><BarChart2 className="mr-2 h-6 w-6" /> Companies Trends Report</CardTitle></CardHeader>
                <CardContent className="p-4 text-gray-600">Analyze trends in company data.</CardContent>
              </Card>
              <Card onClick={() => handleSelectReport('attendance')} className="cursor-pointer ...">
                <CardHeader className="bg-green-50"><CardTitle className="flex items-center text-green-700"><Clock className="mr-2 h-6 w-6" /> Attendance Report</CardTitle></CardHeader>
                <CardContent className="p-4 text-gray-600">View attendance records and details.</CardContent>
              </Card>
              <Card onClick={() => handleSelectReport('contact_status')} className="cursor-pointer ...">
                 <CardHeader className="bg-yellow-50"><CardTitle className="flex items-center text-yellow-700"><Contact className="mr-2 h-6 w-6" /> Contact Status Report</CardTitle></CardHeader>
                 <CardContent className="p-4 text-gray-600">View current status of contacts.</CardContent>
              </Card>
              <Card onClick={() => handleSelectReport('companies_status')} className="cursor-pointer ...">
                 <CardHeader className="bg-red-50"><CardTitle className="flex items-center text-red-700"><Building className="mr-2 h-6 w-6" /> Companies Status Report</CardTitle></CardHeader>
                 <CardContent className="p-4 text-gray-600">View current status of companies.</CardContent>
              </Card>
            </>
          )}
        </div>
      ) : null}

      {selectedReportType && (
        <div className="animate-fade-in">
          <Button variant="outline" onClick={handleGoBack} className="mb-4">
            Back to Report Selection
          </Button>
          {renderReportContent()}
        </div>
      )}
    </div>
  );
};

export default ReportIndex;