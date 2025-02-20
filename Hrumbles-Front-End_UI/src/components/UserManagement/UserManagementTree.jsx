import { useEffect, useState } from "react";
import { Box, Button, Collapse, Text, VStack, Table, Thead, Tbody, Tr, Th, Td, useDisclosure, Spinner } from "@chakra-ui/react";
import { FaPlus, FaMinus } from "react-icons/fa";
import { useDispatch, useSelector } from "react-redux";
import { fetchDepartments, fetchDesignations } from "../../Redux/departmentSlice";
import { fetchEmployeesByDesignation, fetchEmployeesByDepartment, updateEmployeeRole, fetchEmployees } from "../../Redux/employeeSlice";
import { fetchRoles } from "../../Redux/roleSlice";

const UserManagementTree = () => {
  const dispatch = useDispatch();

  // ✅ Ensure `departments`, `designations`, and `employees` are defined
  const { departments = [], designations = [], loading } = useSelector((state) => state.departments || {});
  const { employees = [] } = useSelector((state) => state.employees || {});
  const [expandedDepartments, setExpandedDepartments] = useState({});
  const [selectedDesignation, setSelectedDesignation] = useState(null); // ✅ Track Selected Designation
  const { roles } = useSelector((state) => state.roles);


  useEffect(() => {
    dispatch(fetchEmployees());
    dispatch(fetchDepartments());
    dispatch(fetchDesignations());
    dispatch(fetchRoles());
  }, [dispatch]);

  console.log("🔹 Departments:", departments);
  console.log("🔹 Designations:", designations);
  console.log("🔹 Employees:", employees);

  // ✅ Expand/Collapse Departments
  const toggleDepartment = (departmentId) => {
    setExpandedDepartments((prev) => ({ ...prev, [departmentId]: !prev[departmentId] }));
    dispatch(fetchEmployeesByDepartment(departmentId)); // ✅ Fetch Employees in This Department
    setSelectedDesignation(null); // ✅ Reset Designation Selection
  };

  // ✅ Show Employees by Designation
  const showEmployeesByDesignation = (designation_id) => {
    dispatch(fetchEmployeesByDesignation(designation_id)); // ✅ Fetch Employees in This Designation
    setSelectedDesignation(designation_id); // ✅ Update Selected Designation
  };

  // ✅ Promote Employee to Admin/Superadmin
  const handleRoleChange = (id, newRole) => {
    dispatch(updateEmployeeRole({ id, newRole }));
  };

  const getRoleName = (roleId) => {
    const role = roles.find((r) => r.id === roleId);
    return role ? role.name : "Unknown Role";
  };

  return (
    <VStack align="start" w="full">
      {departments.length > 0 ? (
        departments.map((dept) => (
          <Box key={dept.id} w="full">
            {/* Department */}
            <Button onClick={() => toggleDepartment(dept.id)} w="full">
              {expandedDepartments[dept.id] ? <FaMinus /> : <FaPlus />} {dept.name}
            </Button>

            {/* Collapsible Designations */}
            <Collapse in={expandedDepartments[dept.id]}>
              <VStack align="start" pl={6}>
                {Array.isArray(designations) && designations.length > 0 // ✅ Ensure `designations` is valid
                  ? designations
                      .filter((desig) => desig?.department_id === dept.id) // ✅ Prevent `undefined` errors
                      .map((desig) => (
                        <Button key={desig.id} variant="ghost" onClick={() => showEmployeesByDesignation(desig.id)}>
                          {desig.name}
                        </Button>
                      ))
                  : <Text>No Designations Found</Text>}
              </VStack>
            </Collapse>
          </Box>
        ))
      ) : (
        <Text>No Departments Available</Text>
      )}

      {/* ✅ Employee Table */}
      {selectedDesignation && (
        <Box w="full" p={4} bg="gray.100" mt={4}>
          <Text fontWeight="bold" mb={2}>Employees in Selected Designation:</Text>

          <Table mt={2} variant="striped">
            <Thead>
              <Tr>
                <Th>Name</Th>
                <Th>Email</Th>
                <Th>Role</Th>
                <Th>Action</Th>
              </Tr>
            </Thead>
            <Tbody>
              {employees.length > 0 ? (
                employees.map((emp) => (
                  <Tr key={emp.id}>
                    <Td>{emp.first_name} {emp.last_name}</Td>
                    <Td>{emp.email}</Td>
                    <Td>
  {getRoleName(emp.role_id) === "organization_superadmin" ? "Superadmin" :
   getRoleName(emp.role_id) === "admin" ? "Admin" :
   getRoleName(emp.role_id) === "employee" ? "Employee" :
   getRoleName(emp.role_id)} 
</Td>

                    <Td>
                      {getRoleName(emp.role_id) === "employee" && (
                        <>
                          <Button size="sm" colorScheme="green" onClick={() => handleRoleChange(emp.id, "admin")}>
                            Promote to Admin
                          </Button>
                          <Button size="sm" colorScheme="purple" ml={2} onClick={() => handleRoleChange(emp.id, "organization_superadmin")}>
                            Promote to Superadmin
                          </Button>
                        </>
                      )}
                      {getRoleName(emp.role_id) === "admin" && (
                        <Button size="sm" colorScheme="purple" onClick={() => handleRoleChange(emp.id, "organization_superadmin")}>
                          Promote to Superadmin
                        </Button>
                      )}
                    </Td>
                  </Tr>
                ))
              ) : (
                <Tr>
                  <Td colSpan={3} textAlign="center">No Employees Found</Td>
                </Tr>
              )}
            </Tbody>
          </Table>
        </Box>
      )}
    </VStack>
  );
};

export default UserManagementTree;
