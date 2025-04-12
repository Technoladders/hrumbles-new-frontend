import { useEffect } from "react";
import { Table, Thead, Tbody, Tr, Th, Td, Button, useDisclosure } from "@chakra-ui/react";
import { useSelector, useDispatch } from "react-redux";
import { fetchEmployees, updateEmployeeRole } from "../../Redux/employeeSlice";
import { fetchDepartments, fetchDesignations } from "../../Redux/departmentSlice"; 
import { fetchRoles } from "../../Redux/roleSlice";
import AddEmployeeModal from "./AddEmployeeModal";

const EmployeeList = () => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const dispatch = useDispatch();

  // ✅ Fetch Employees, Departments, and Designations from Redux
  const { employees } = useSelector((state) => state.employees);
  const { departments, designations } = useSelector((state) => state.departments);
  const { organization_id } = useSelector((state) => state.auth);
  const { roles } = useSelector((state) => state.roles);

  useEffect(() => {
    if (organization_id) {
      dispatch(fetchEmployees()); // ✅ Fetch Employees Only for This Organization
      dispatch(fetchDepartments()); // ✅ Fetch Departments
      dispatch(fetchDesignations()); // ✅ Fetch Designations
      dispatch(fetchRoles());
    }
  }, [dispatch, organization_id]);

  // ✅ Function to Get Department Name by ID
  const getDepartmentName = (departmentId) => {
    const dept = departments.find((d) => d.id === departmentId);
    return dept ? dept.name : "Unknown Department";
  };

  // ✅ Function to Get Designation Name by ID
  const getDesignationName = (designationId) => {
    const desig = designations.find((d) => d.id === designationId);
    return desig ? desig.name : "Unknown Designation";
  };

// Function to get Role Name
  const getRoleName = (roleId) => {
    const role = roles.find((r) => r.id === roleId);
    return role ? role.name : "Unknown Role";
  };


  return (
    <>
      <Button colorScheme="blue" onClick={onOpen}>+ Add Employee</Button>
      <AddEmployeeModal isOpen={isOpen} onClose={onClose} />

      <Table mt={4} variant="striped">
        <Thead>
          <Tr>
            <Th>Name</Th>
            <Th>Email</Th>
            <Th>Department</Th>
            <Th>Designation</Th>
            <Th>Phone</Th>
            <Th>Action</Th>
          </Tr>
        </Thead>
        <Tbody>
          {employees.length > 0 ? (
            employees.map((emp) => (
              <Tr key={emp.id}>
                <Td>{emp.first_name} {emp.last_name}</Td>
                <Td>{emp.email}</Td>
                <Td>{getDepartmentName(emp.department_id)}</Td> {/* ✅ Display Department Name */}
                <Td>{getDesignationName(emp.designation_id)}</Td> {/* ✅ Display Designation Name */}
                <Td>{emp.phone}</Td>
                <Td>
                  {getRoleName(emp.role_id) === "employee" && (
                    <>
                      <Button size="sm" colorScheme="green" onClick={() => dispatch(updateEmployeeRole({ id: emp.id, newRole: "admin" }))}>
                        Promote to Admin
                      </Button>
                      <Button size="sm" colorScheme="purple" ml={2} onClick={() => dispatch(updateEmployeeRole({ id: emp.id, newRole: "organization_superadmin" }))}>
                        Promote to Superadmin
                      </Button>
                    </>
                  )}
                </Td>
              </Tr>
            ))
          ) : (
            <Tr>
              <Td colSpan={6} textAlign="center">No Employees Found</Td>
            </Tr>
          )}
        </Tbody>
      </Table>
    </>
  );
};

export default EmployeeList;
