import { useSelector } from "react-redux";
import UserManagement from "../components/UserManagement/index"

const Employee = () => {
  const { role } = useSelector((state) => state.auth);

  switch (role) {
    case "organization_superadmin":
      return <UserManagement />;
    case "admin":
      return <UserManagement />;
    default:
      return <div>Unauthorized Access</div>;
  }
};

export default Employee;
