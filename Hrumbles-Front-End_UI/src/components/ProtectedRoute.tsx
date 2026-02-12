// src/components/ProtectedRoute.tsx

import { useEffect, useState } from "react";
import { Navigate, useLocation, Outlet } from "react-router-dom";
import { useSelector } from "react-redux";
import { calculateProfileCompletion } from "@/utils/profileCompletion";
import { supabase } from "@/integrations/supabase/client";  // Adjust path if your supabase client is elsewhere

const ProtectedRoute = () => {
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [authStatus, setAuthStatus] = useState<{
    isAuthenticated: boolean;
    canProceed: boolean;
    redirectPath: string | null;
  }>({
    isAuthenticated: false,
    canProceed: false,
    redirectPath: null,
  });

  const user = useSelector((state: any) => state.auth.user);
  const role = useSelector((state: any) => state.auth.role);
  const organizationId = useSelector((state: any) => state.auth.organization_id);

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

      // Old users exemption (created before feature live date)
      if (user.created_at) {
        const userCreationDate = new Date(user.created_at);
        const featureLiveDate = new Date(FEATURE_LIVE_DATE);

        if (userCreationDate < featureLiveDate) {
          setAuthStatus({
            isAuthenticated: true,
            canProceed: true,
            redirectPath: null,
          });
          setLoading(false);
          return;
        }
      } else {
        console.warn(
          "ProtectedRoute: `user.created_at` is missing. Cannot determine if user is new or existing. Proceeding with completion check."
        );
      }

      // Organization superadmin exemption
      if (role === 'organization_superadmin') {
        setAuthStatus({
          isAuthenticated: true,
          canProceed: true,
          redirectPath: null,
        });
        setLoading(false);
        return;
      }

      // ────────────────────────────────────────────────────────────────
      // NEW: Organization-level toggle for mandatory profile completion
      // ────────────────────────────────────────────────────────────────
      let enforceProfileCompletion = true;

      if (organizationId) {
        try {
          const { data, error } = await supabase
            .from('hr_organizations')
            .select('complete_profile')
            .eq('id', organizationId)
            .single();

          if (error) {
            console.error("Failed to fetch complete_profile flag:", error.message);
            // Fail-safe: keep enforcement enabled if we cannot read the flag
          } else if (data && data.complete_profile === false) {
            enforceProfileCompletion = false;
          }
        } catch (err) {
          console.error("Exception checking organization complete_profile:", err);
          // Fail-safe: enforcement remains ON
        }
      }

      // If organization disabled the requirement → allow full access
      if (!enforceProfileCompletion) {
        setAuthStatus({
          isAuthenticated: true,
          canProceed: true,
          redirectPath: null,
        });
        setLoading(false);
        return;
      }

      // 2. Check if current route is exempt from profile completion requirement
      const profileRelatedPaths = ["/complete-profile", "/employee/"];
      const isProfilePage = profileRelatedPaths.some((path) =>
        location.pathname.startsWith(path)
      );

      if (isProfilePage) {
        setAuthStatus({
          isAuthenticated: true,
          canProceed: true,
          redirectPath: null,
        });
        setLoading(false);
        return;
      }

      // 3. For all other protected routes: enforce profile completion percentage
      try {
        const { completionPercentage } = await calculateProfileCompletion(user.id);

        if (completionPercentage < 40) {
          // Profile incomplete → redirect to completion page
          setAuthStatus({
            isAuthenticated: true,
            canProceed: false,
            redirectPath: "/complete-profile",
          });
        } else {
          // Profile complete enough → allow access
          setAuthStatus({
            isAuthenticated: true,
            canProceed: true,
            redirectPath: null,
          });
        }
      } catch (error) {
        console.error("Error checking profile access in ProtectedRoute:", error);
        // Safety fallback: redirect to login on unexpected error
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
  }, [user, role, organizationId, location.pathname]);

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

  // Perform redirect if needed
  if (authStatus.redirectPath) {
    return (
      <Navigate
        to={authStatus.redirectPath}
        state={{ from: location.pathname }}
        replace
      />
    );
  }

  // Render child routes only if authenticated and allowed
  return authStatus.isAuthenticated && authStatus.canProceed ? <Outlet /> : null;
};

export default ProtectedRoute;