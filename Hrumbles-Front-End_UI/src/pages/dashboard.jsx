import { useEffect, useRef } from "react"; // 1. Re-import useRef
import { useSelector } from "react-redux";
import { toast } from "sonner";
import GlobalSuperadminDashboard from "../components/dashboard/GlobalSuperadminDashboard";
import OrganizationSuperadminDashboard from "../components/dashboard/OrganizationSuperadminDashboard";
import AdminDashboard from "../components/dashboard/AdminDashboard";
import EmployeeDashboard from "../components/dashboard/EmployeeDashboard";
import { calculateProfileCompletion } from "@/utils/profileCompletion";

const Dashboard = () => {
  const { role } = useSelector((state) => state.auth);
  const user = useSelector((state) => state.auth.user);

  // 2. Create a ref. This acts as a memory flag that survives re-renders.
  // It will ensure our async function is only ever CALLED once.
  const toastCheckInitiated = useRef(false);

  useEffect(() => {
    const showProfileToast = async () => {
      try {
        const { completionPercentage } = await calculateProfileCompletion(user.id);

        if (completionPercentage < 100) {
          toast.info(
            `Your profile is ${completionPercentage}% complete.`,
            {
              description: 'Finish completing it to unlock all features and benefits.',
              duration: 8000,
            }
          );
        }
      } catch (error) {
        console.error("Failed to check profile completion for toast:", error);
      } finally {
        // We still set sessionStorage to prevent the check on a full page reload,
        // but the useRef flag handles the quick re-renders.
        sessionStorage.setItem('profileToastShown', 'true');
      }
    };

    // --- This is the robust check ---
    // We check all three conditions before proceeding:
    // 1. Is the user object available?
    // 2. Has the toast already been shown in this session? (for page reloads)
    // 3. Have we already started the check? (for component re-renders)
    if (user && user.id && !sessionStorage.getItem('profileToastShown') && !toastCheckInitiated.current) {
      
      // 3. Set the flag to true IMMEDIATELY and SYNCHRONOUSLY.
      // Now, even if the component re-renders a millisecond later, this block will not run again.
      toastCheckInitiated.current = true;
      
      // 4. Now it's safe to call our async function.
      showProfileToast();
    }
  }, [user]);

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
      return <div>Loading dashboard...</div>;
  }
};

export default Dashboard;