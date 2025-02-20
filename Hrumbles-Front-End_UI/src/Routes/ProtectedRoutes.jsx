import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { getUserSession, getUserRole } from "../utils/api";
import { Spinner, Flex } from "@chakra-ui/react";

const ProtectedRoute = ({ allowedRoles, children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const session = await getUserSession();
        if (!session || !session.user) {
          console.log("🔴 No user session found");
          setLoading(false);
          return;
        }

        console.log("✅ User session:", session.user);
        const userRole = await getUserRole(session.user.id);
        console.log("✅ User role:", userRole);

        setUser(session.user);
        setRole(userRole);
      } catch (error) {
        console.error("Error fetching user session:", error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  if (loading)
    return (
      <Flex height="100vh" align="center" justify="center">
        <Spinner size="lg" />
      </Flex>
    );

  if (!user || !allowedRoles.includes(role)) {
    console.warn(`🔴 Unauthorized access. User role: ${role}, Allowed roles: ${allowedRoles}`);
    return <Navigate to="/" />;
  }

  console.log("✅ Authorized: Rendering protected content");
  return children;
};

export default ProtectedRoute;
