import { useSelector } from "react-redux";
import EmployeeList from "../components/Employee1/EmployeeList"

const Employee = () => {
  const { role } = useSelector((state) => state.auth);

  switch (role) {
    case "organization_superadmin":
      return <EmployeeList />;
    case "admin":
      return <EmployeeList />;
    default:
      return <div>Unauthorized Access</div>;
  }
};

export default Employee;
