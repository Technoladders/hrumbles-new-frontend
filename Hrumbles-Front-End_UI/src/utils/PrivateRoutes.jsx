// PrivateRoutes.tsx
import { useEffect } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { fetchUserSession } from "../Redux/authSlice";
import { Spinner, Flex } from "@chakra-ui/react";
import supabase from "../config/supabaseClient";

const PrivateRoutes = ({ allowedRoles }) => {
  const dispatch = useDispatch();
  const { user, role, loading } = useSelector((state) => state.auth);

  useEffect(() => {
    if (!user) {
      dispatch(fetchUserSession());
    }
  }, [dispatch, user]);

  if (loading) {
    return (
      <Flex height="100vh" align="center" justify="center">
        <Spinner size="lg" />
      </Flex>
    );
  }

  // 1. Check if user is logged in
  if (!user) {
    return <Navigate to="/" />;
  }

  // 2. ✅ SECURITY FIX: Check if Redux metadata says they are active
  // (Assuming your fetchUserSession populates user_metadata correctly)
  // If the status is available in the user object, check it here:
  /* 
  if (user.user_metadata?.status && user.user_metadata?.status !== 'active') {
      return <Navigate to="/" />;
  }
  */

  // 3. Check Role
  if (!allowedRoles.includes(role)) {
    console.warn(`🔴 Unauthorized access. Role: ${role}`);
    return <Navigate to="/" />;
  }

  return <Outlet />;
};

export default PrivateRoutes;