// src/components/ProtectedRoute.tsx

import { useEffect, useState } from "react";
import { Navigate, useLocation, Outlet } from "react-router-dom";
import { useSelector } from "react-redux";
// ✅ FIX #1: Change the import to the new, correct function
import { calculateProfileCompletion } from "@/utils/profileCompletion";

const ProtectedRoute = () => {
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [authStatus, setAuthStatus] = useState<{
    isAuthenticated: boolean;
    canProceed: boolean; // Renamed for clarity
    redirectPath: string | null;
  }>({
    isAuthenticated: false,
    canProceed: false,
    redirectPath: null,
  });

  const user = useSelector((state: any) => state.auth.user);

  useEffect(() => {
    const checkAccess = async () => {
      // 1. Check for basic authentication
      if (!user || !user.id) {
        setAuthStatus({
          isAuthenticated: false,
          canProceed: false,
          redirectPath: "/login",
        });
        setLoading(false);
        return;
      }

      const FEATURE_LIVE_DATE = '2025-11-02'; 
      // ------------------------------------------------

      // Make sure your Redux 'user' object includes 'created_at' from the database
      if (user.created_at) {
        const userCreationDate = new Date(user.created_at);
        const featureLiveDate = new Date(FEATURE_LIVE_DATE);

        // If the user was created before the feature went live, they are exempt.
        if (userCreationDate < featureLiveDate) {
          setAuthStatus({
            isAuthenticated: true,
            canProceed: true, // Grant access immediately
            redirectPath: null,
          });
          setLoading(false);
          return; // <-- Important: Stop further checks for existing users
        }
      } else {
          console.warn("ProtectedRoute: `user.created_at` is missing. Cannot determine if user is new or existing. Proceeding with completion check for all users.");
      }

      // 2. Check if the current route should be exempt from profile checks
      const profileRelatedPaths = ["/complete-profile", "/employee/"];
      const isProfilePage = profileRelatedPaths.some((path) =>
        location.pathname.startsWith(path)
      );

      if (isProfilePage) {
        // If they are already on a profile-related page, let them proceed.
        setAuthStatus({
          isAuthenticated: true,
          canProceed: true,
          redirectPath: null,
        });
        setLoading(false);
        return;
      }

      // 3. For all other protected routes, check the profile completion percentage
      try {
        // ✅ FIX #2: Call the new function
        const { completionPercentage } = await calculateProfileCompletion(user.id);

        // ✅ FIX #3: Use the result to set the status
        if (completionPercentage < 40) {
          // If profile is incomplete, block access and redirect
          setAuthStatus({
            isAuthenticated: true,
            canProceed: false,
            redirectPath: "/complete-profile",
          });
        } else {
          // If profile is complete enough, allow access
          setAuthStatus({
            isAuthenticated: true,
            canProceed: true,
            redirectPath: null,
          });
        }
      } catch (error) {
        console.error("Error checking profile access in ProtectedRoute:", error);
        // On any error, it's safest to send the user back to the login page.
        setAuthStatus({
          isAuthenticated: false,
          canProceed: false,
          redirectPath: "/login",
        });
      } finally {
        setLoading(false);
      }
    };

    checkAccess();
  }, [user, location.pathname]); // Re-run this check if the user or URL changes

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verifying access...</p>
        </div>
      </div>
    );
  }

  // If a redirect path was set, navigate the user away.
  if (authStatus.redirectPath) {
    return (
      <Navigate
        to={authStatus.redirectPath}
        state={{ from: location.pathname }} // This tells the next page where the user came from
        replace
      />
    );
  }

  // If authenticated and can proceed, render the child routes (e.g., the Dashboard).
  // Otherwise, render nothing while the redirect happens.
  return authStatus.isAuthenticated && authStatus.canProceed ? <Outlet /> : null;
};

export default ProtectedRoute;