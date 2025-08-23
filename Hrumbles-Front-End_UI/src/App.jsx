
// App.jsx (Modified for Redux)

import { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useDispatch } from "react-redux";

// Import the Redux action and the utility
import { setOrganization } from "./Redux/organizationSlice";
import { getOrganizationSubdomain } from "./utils/subdomain";

// Import your pages
import DomainVerificationPage from "./pages/DomainVerificationPage";

import Login from "./pages/LoginPage";
import SignUp from "./pages/GlobalSuperAdmin";
import PrivateRoutes from "./utils/PrivateRoutes";

// Global Superadmin
import GlobalSuperadminDashboard from "./pages/Global_Dashboard";
import VerificationHubPage from "./pages/verifications/VerificationHubPage";
import VerificationTypeDashboardPage from "./pages/verifications/VerificationTypeDashboardPage";
import OrganizationVerificationReportPage from "./pages/verifications/OrganizationVerificationReportPage";


import MainLayout from "./layouts/MainLayout";
import HomePage from "./pages/HomePage";
import Dashboard from "./pages/dashboard";
import Employee from "./pages/Employee";
import UserManagement from "./pages/UserManagement";
import Clients from "./pages/Client";
import ClientDashboard from "./components/Client/ClientDashboard";
import ProjectDashboard from "./components/Client/ProjectDashboard";
import ProjectManagement from "./pages/clients/ProjectManagement";
import Index from "./pages/Index";

// Password change
import PasswordChange from "./pages/ChangeEmployeePassword";
import SetPassword from "./pages/SetPassword"
import ForgotPasswordPage from "./pages/ForgotPasswordPage";

// import EmployeeProfile from "./pages/EmployeeProfile";
import ProfilePageEmployee from "./pages/ProfilePageEmployee";
import EmployeeList from "./pages/EmployeeList";
import EmployeeForm from "./pages/EmployeeForm";
import EmployeeProfile from "./pages/EmployeeProfile";
import GoalPage from "./pages/goals/Index";
import GoalView from "./pages/goals/EmployeeView";
import GoalDetail from "./pages/goals/GoalDetail";
import EmployeeGoalView from "./components/goals/employee/EmployeeGoalDashboard"
import GoalDetailView from "./components/goals/dashboard/GoalDetailView";

// New CLients
import ClientNew from "./pages/ClientNew/page";

// Jobs
import Jobs from "./pages/jobs/Jobs";
import JobView from "./pages/jobs/JobView";
import JobDescription from "./pages/jobs/JobDescription";
import Career from "./pages/careerPage/Index";
import CareerJobDetail from "./pages/careerPage/JobDetail";
import CareerJobApplication from "./pages/careerPage/JobApplication";
import StatusSettings from "./pages/jobs/StatusSettings";
import ResumeAnalysisDetailView from "./pages/jobs/ResumeAnalysisDetailView";
import SharedProfile from "./pages/jobs/SharedProfile"
import ReportsPage from "./pages/reports/Index";
import EmployeeProfilePage from "./components/MagicLinkView/EmployeeProfileDrawer";
import CandidateConsentPage from './components/MagicLinkView/CandidateConsentPage';

// Job Route Handler
import JobRouteHandler from "./components/jobs/JobRouteHandler";
import JobViewRouteHandler from "./components/jobs/JobViewRouteHandler";
import CandidateBgvProfilePage from "./pages/bg-verification/CandidateBgvProfilePage";
import AllCandidatesPage from "./pages/bg-verification/AllCandidatesPage";

// Candidates
import TalentPoolPage from "./pages/candidates/TalentPoolPage"; // Create this new page
import CandidateProfilePage from "./pages/candidates/CandidateProfilePage"; 

import MigratedTalentPoolPage from "./pages/candidates/MigratedTalentPoolPage";
import MigratedCandidateProfilePage from "./pages/candidates/MigratedCandidateProfilePage";

// Zive-X
import ZiveXSearchPage from "./pages/candidates/ZiveXSearchPage";
import ZiveXResultsPage from "./pages/candidates/ZiveXResultsPage";

// Finance & Accounts
import FinanceIndex from "./pages/finance/Index";
import PayrollEdit from "./pages/finance/PayrollEdit";
import InvoicesPage from "./pages/finance/accounts/InvoicesPage";
import ExpensesPage from "./pages/finance/accounts/ExpensesPage";
import Payroll from "./pages/payroll/index";
import AccountsOverview from "./pages/finance/accounts/AccountsOverview";
import PayrollRun from '././pages/payroll/index';
import PayrollDetails from './pages/payroll/PayrollDetails';
import PayrollHistoryDetails from './pages/payroll/PayrollHistoryDetails';
import TerminatedEmployeesPayroll from './pages/payroll/TerminatedEmployeesPayroll';

// Sales Companies and Contacts
import CompaniesPage from "./pages/sales/CompaniesPage";
import CompanyDetail from "./pages/sales/CompanyDetail";
import CompanyEdit from "./pages/sales/CompanyEdit";
import ContactsPage from "./pages/sales/ContactsPage";
import EditableContactsPage from './pages/sales/EditableContactsPage';
import TanstackContactsPage from './pages/sales/TanstackContactsPage';
import KanbanView from './pages/sales/KanbanBoard';
import ListsPage from './pages/sales/ListsPage';

// Clients
import ClientPage from "./pages/clients/ClientDashboard";
import ClientManagementDashboard from "./pages/client-dashboard/ClientManagementDashboard";
import ClientCandidatesView from "./pages/client-dashboard/ClientCandidatesView";
import ClientMetricsDashboard from "./pages/client-dashboard/ClientMetricsDashboard";

// TimeTracker, Timesheet, Attendance and Leave
// Employee routes
import TimeTracker from "./pages/TimeManagement/employee/TimeTracker";
import Timesheet from "./pages/TimeManagement/employee/Timesheet";
import Leave from "./pages/TimeManagement/employee/Leave";
import Attendance from "./pages/TimeManagement/employee/Attendance";
import Calendar from "./pages/TimeManagement/employee/Calendar";
import EmployeeRegularization from "./pages/TimeManagement/employee/Regularization";

// Approval routes
import TimesheetApproval from "./pages/TimeManagement/approvals/TimesheetApproval";
import LeaveApproval from "./pages/TimeManagement/approvals/LeaveApproval";
import AutoTerminated from "./pages/TimeManagement/approvals/AutoTerminated";
import RegularizationApproval from "./pages/TimeManagement/approvals/RegularizationApproval";

// Admin routes
import LeavePolicies from "./pages/TimeManagement/admin/LeavePolicies";
import Holidays from "./pages/TimeManagement/admin/Holidays";
import Projects from "./pages/TimeManagement/admin/Projects";

function App() {

  const organizationSubdomain = getOrganizationSubdomain();
  const dispatch = useDispatch();

  useEffect(() => {
    // If a subdomain is found, dispatch it to the Redux store.
    // This makes it available globally to any component connected to Redux.
    if (organizationSubdomain) {
      dispatch(setOrganization(organizationSubdomain));
    }
  }, [organizationSubdomain, dispatch]);

    // If no subdomain is detected, show ONLY the verification page.
  if (!organizationSubdomain) {
    return (
      <Router>
        <Routes>
          <Route path="*" element={<DomainVerificationPage />} />
        </Routes>
      </Router>
    ); 
  }

  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
                 <Route path="/set-password" element={<SetPassword />} />
                  <Route path="/forgot-password" element={<ForgotPasswordPage />} />

               


        {/* career page */}
        <Route path="/careers" element={<Career />} />
          <Route path="/job/:jobId" element={<CareerJobDetail />} />
          <Route path="/job/:jobId/apply" element={<CareerJobApplication />} />

          {/* Candidate Profile Magic Link */}
          <Route path="/share/:shareId" element={<SharedProfile />} />
            <Route path="/consent/:consentId" element={<CandidateConsentPage />} />



        {/* Protected Routes */}
        <Route
          element={
            <PrivateRoutes
              allowedRoles={[
                "global_superadmin",
                "organization_superadmin",
                "admin",
                "employee",
              ]}
            />
          }
        >
          <Route element={<MainLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />

            {/* Password Change */}
            <Route path="/password" element={<PasswordChange />} />

              {/* Global Super Admin */}
                 <Route path="/verifications" element={<VerificationHubPage />} />
            <Route path="/verifications/:verificationType" element={<VerificationTypeDashboardPage />} />
            <Route path="/verifications/:verificationType/:organizationId" element={<OrganizationVerificationReportPage />} />
            
            {/* <Route path="/employees" element={<Employee/>} /> */}
            <Route path="/projects" element={<ProjectManagement />} />
            <Route path="/client/:id" element={<ClientDashboard />} />
            <Route path="/project/:id" element={<ProjectDashboard />} />

{/* User management */}

            <Route path="/user-management" element={<UserManagement />} />
            <Route
              path="/organization"
              element={<GlobalSuperadminDashboard />}
            />

            {/* Employee */}

            <Route path="employee" element={<EmployeeList />} />
            <Route path="employee/new" element={<EmployeeForm />} />
            <Route path="employee/:id" element={<EmployeeForm />} />
            <Route path="employee/profile/:id" element={<EmployeeProfile />} />

            {/* Employee Dashboard Routes */}
            <Route path="/profile" element={<ProfilePageEmployee />} />

            {/* Clients */}
            {/* <Route path="/clients" element={<ClientPage />} /> */}

                        {/* Client Dashboard (New) */}
                        <Route path="/clients" element={<ClientManagementDashboard />} />
            <Route path="/client-dashboard/:clientName/candidates" element={<ClientNew />} />
            <Route path="/client-metrics" element={<ClientMetricsDashboard />} />

            {/* Goals */}
            <Route path="/goals" element={<GoalPage />} />
            <Route path="/goals/:goalId" element={<GoalDetail />} />
            <Route path="/goalsview" element={<GoalView />} />
            <Route path="goalview" element={<EmployeeGoalView/>} />
            <Route path="/goals/:goalId/:goalType?" element={<GoalDetailView />} />

            {/* Jobs */}
            <Route path="/jobs" element={<JobRouteHandler />} />
            <Route path="/jobs/:id" element={<JobViewRouteHandler />} />
            <Route path="/resume-analysis/:candidateId" element={<ResumeAnalysisDetailView />} />
            <Route path="/jobs/:id/description" element={<JobDescription />} />
            <Route path="/jobs/edit/:id" element={<JobDescription />} />
            <Route path="/jobstatuses" element={<StatusSettings />} />
            <Route path="/employee/:candidateId/:jobId" element={<EmployeeProfilePage />} />

            <Route path="/jobs/:jobId/candidate/:candidateId/bgv" element={<CandidateBgvProfilePage />} />
            <Route path="/all-candidates" element={<AllCandidatesPage />} /> 

            {/* Candidates */}
            <Route path="/talent-pool" element={<TalentPoolPage />} />
            <Route path="/talent-pool/:candidateId" element={<CandidateProfilePage />} />

             <Route path="/migrated-talent-pool" element={<MigratedTalentPoolPage />} />
          <Route path="/migrated-talent-pool/:candidateId" element={<MigratedCandidateProfilePage />} />

{/* Zive-X */}
<Route path="/zive-x" element={<ZiveXSearchPage />} />
<Route path="/zive-x-search/results" element={<ZiveXResultsPage />} />

                        {/* Reports */}
        <Route path="/reports" element={<ReportsPage />} />

        {/* Finance & Accounts */}
        <Route path="/finance" element={<FinanceIndex />} />
          <Route path="/payroll/:id/edit" element={<PayrollEdit />} />
          <Route path="/accounts/invoices" element={<InvoicesPage />} />
          <Route path="/accounts/expenses" element={<ExpensesPage />} />
          <Route path="/payroll" element={<Payroll />} />
          <Route path="/accounts/overall" element={<AccountsOverview />} />
          <Route path="/payrollrun" element={<PayrollRun />} />
          <Route path="/payroll/:year/:month" element={<PayrollDetails />} />
          <Route path="/payroll/history/:year/:month" element={<PayrollHistoryDetails />} />
          <Route path="/payroll/terminated/:year/:month/:employeeId" element={<TerminatedEmployeesPayroll />} />


          {/* Sales Companies and Contacts */}
          <Route path="/companies" element={<CompaniesPage />} />
           <Route path="/companies/file/:fileId" element={<CompaniesPage />} />
          <Route path="/contacts" element={<TanstackContactsPage />} />
          <Route path="/contacts/kanban" element={<KanbanView />} />
          <Route path="/companies/:id" element={<CompanyDetail />} />
          <Route path="/companies/:id/edit" element={<CompanyEdit />} />
          <Route path="/lists" element={<ListsPage />} />
          <Route path="/contacts/file/:fileId" element={<TanstackContactsPage />} />

          {/* TimeTracker, Timesheet, Attendance and Leave */}
            {/* Employee routes */}
              <Route path="/employee/time-tracker" element={<TimeTracker />} />
              <Route path="/employee/timesheet" element={<Timesheet />} />
              <Route path="/employee/regularization" element={<EmployeeRegularization />} />
              <Route path="/employee/leave" element={<Leave />} />
              <Route path="/employee/attendance" element={<Attendance />} />
              <Route path="/employee/calendar" element={<Calendar />} />
              
              {/* Approval routes */}
              <Route path="/approvals/timesheet" element={<TimesheetApproval />} />
              <Route path="/approvals/regularization" element={<RegularizationApproval />} />
              <Route path="/approvals/leave" element={<LeaveApproval />} />
              <Route path="/approvals/auto-terminated" element={<AutoTerminated />} />
              
              {/* Admin routes */}
              <Route path="/admin/leave-policies" element={<LeavePolicies />} />
              <Route path="/admin/holidays" element={<Holidays />} />
              <Route path="/admin/projects" element={<Projects />} />
          
          </Route>
        </Route>
      </Routes>
    </Router>
  );
}

export default App;