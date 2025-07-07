
import { useSelector } from "react-redux";
import EnhancedUserManagement from "./EnhancedUserManagement";

const UserManagement = () => {
  const { role } = useSelector((state) => state.auth);

  switch (role) {
    case "organization_superadmin":
      return <EnhancedUserManagement />;
    case "admin":
      return <EnhancedUserManagement />;
    default:
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Unauthorized Access</h2>
            <p className="text-gray-600">You don't have permission to access user management.</p>
          </div>
        </div>
      );
  }
};

export default UserManagement;
