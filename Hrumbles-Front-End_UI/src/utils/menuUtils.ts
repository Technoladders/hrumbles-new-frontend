// src/utils/menuUtils.ts
export const shouldShowCompanyAndContactMenu = (
    employees,
    departments,
    roles,
    user_id
  ) => {

    console.log("employees", employees);
    console.log("departments", departments);
    console.log("roles", roles);
    console.log("user_id", user_id);
    // Find the current employee based on user_id
    const currentEmployee = employees.find((emp) => emp.user_id === user_id);
    if (!currentEmployee) return false;
  
    // Get the employee's role name
    const role = roles.find((r) => r.id === currentEmployee.role_id);
    const roleName = role ? role.name : "Unknown Role";
  
    // Get the employee's department name
    const department = departments.find(
      (d) => d.id === currentEmployee.department_id
    );
    const departmentName = department ? department.name : "Unknown Department";
  
    // Check if the employee has the role "employee" and department "Sales & Marketing"
    return roleName === "Human Resource" && departmentName === "Human Resource";
  };