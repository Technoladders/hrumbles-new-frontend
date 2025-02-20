import { useEffect } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { fetchUserSession } from "../Redux/authSlice";
import { Spinner, Flex } from "@chakra-ui/react";

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

  if (!user || !allowedRoles.includes(role)) {
    console.warn(`🔴 Unauthorized access. User role: ${role}, Allowed roles: ${allowedRoles}`);
    return <Navigate to="/" />;
  }

  console.log("✅ Authorized: Rendering protected content");
  return <Outlet />;
};

export default PrivateRoutes;
