import { useSelector } from "react-redux";
import GlobalSuperadminDashboard from "../components/dashboard/GlobalSuperadminDashboard";
import OrganizationSuperadminDashboard from "../components/dashboard/OrganizationSuperadminDashboard";
import AdminDashboard from "../components/dashboard/AdminDashboard";
import EmployeeDashboard from "../components/dashboard/EmployeeDashboard";

const Dashboard = () => {
  const { role } = useSelector((state) => state.auth);

  switch (role) {
    case "global_superadmin":
      return <GlobalSuperadminDashboard />;
    case "organization_superadmin":
      return <OrganizationSuperadminDashboard />;
    case "admin":
      return <AdminDashboard />;
    case "employee":
      return <EmployeeDashboard />;
    default:
      return <div>Unauthorized Access</div>;
  }
};

export default Dashboard;
