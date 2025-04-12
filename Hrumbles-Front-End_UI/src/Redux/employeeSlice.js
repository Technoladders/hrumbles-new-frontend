import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import  supabase  from "../config/supabaseClient"; 

// ✅ Helper function to get Role ID
const getRoleId = async (roleName) => {
  const { data, error } = await supabase.from("hr_roles").select("id").eq("name", roleName).single();
  if (error) throw new Error(`Role '${roleName}' not found.`);
  return data.id;
};

// ✅ Fetch Employees
const fetchEmployees = createAsyncThunk("employees/fetchEmployees", async (_, { getState, rejectWithValue }) => {
    const { organization_id } = getState().auth; // ✅ Get organization_id from Redux
  
    if (!organization_id) return rejectWithValue("Organization ID is missing.");
  
    const { data, error } = await supabase
      .from("hr_employees")
      .select("id, first_name, last_name, email, department_id, designation_id, role_id, organization_id, phone")
      .eq("organization_id", organization_id); // ✅ Fetch employees only from this organization
  
    if (error) return rejectWithValue(error.message);
    return data;
  });

// ✅ Create Employee
const createEmployee = createAsyncThunk("employees/createEmployee", async (employeeData, { rejectWithValue }) => {
    try {
      // 1️⃣ ✅ Sign Up Employee in Authentication (`auth.users`)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: employeeData.email,
        password: employeeData.password,
        options: {
          data: { first_name: employeeData.firstName, last_name: employeeData.lastName, phone: employeeData.phone, employee_id: employeeData.employee_id },
        },
      });
  
      if (authError) return rejectWithValue(authError.message);
      const userId = authData.user?.id;
  
      if (!userId) return rejectWithValue("User ID missing after signup.");
  
      // 2️⃣ ✅ Insert Employee Data into `hr_employees`
      const role_id = await getRoleId("employee"); // ✅ Assign default "employee" role
      const { error: profileError } = await supabase.from("hr_employees").upsert({
        id: userId, // ✅ Use `auth.users` ID
        organization_id: employeeData.organization_id,
        first_name: employeeData.firstName,
        last_name: employeeData.lastName,
        email: employeeData.email,
        employee_id: employeeData.employee_id,
        phone: employeeData.phone,
        department_id: employeeData.department_id,
        designation_id: employeeData.designation_id,
        role_id,
      });
  
      if (profileError) return rejectWithValue(profileError.message);
  
    } catch (error) {
      return rejectWithValue(error.message);
    }
  });

// ✅ Update Employee Role (Fix Duplicate Export)
const updateEmployeeRole = createAsyncThunk("employees/updateEmployeeRole", async ({ id, newRole }) => {
  const roleId = await getRoleId(newRole);
  const { error } = await supabase.from("hr_employees").update({ role_id: roleId }).eq("id", id);
  if (error) throw error;
});

// ✅ Fetch Employees by Department
 const fetchEmployeesByDepartment = createAsyncThunk("employees/fetchByDepartment", async (department_id) => {
    const { data, error } = await supabase
      .from("hr_employees")
      .select("id, first_name, last_name, email, designation_id, role_id")
      .eq("department_id", department_id);
  
    if (error) throw error;
    return data;
  });
  
  // ✅ Fetch Employees by Designation
 const fetchEmployeesByDesignation = createAsyncThunk("employees/fetchByDesignation", async (designation_id) => {
    const { data, error } = await supabase
      .from("hr_employees")
      .select("id, first_name, last_name, email, role_id")
      .eq("designation_id", designation_id);
  
    if (error) throw error;
    return data;
  });

const employeeSlice = createSlice({
  name: "employees",
  initialState: { employees: [], loading: false, error: null },
  extraReducers: (builder) => {
    builder
      .addCase(fetchEmployees.pending, (state) => { state.loading = true; })
      .addCase(fetchEmployees.fulfilled, (state, action) => {
        state.employees = action.payload;
        state.loading = false;
      })
      .addCase(fetchEmployees.rejected, (state, action) => {
        state.error = action.error.message;
        state.loading = false;
      })
      .addCase(fetchEmployeesByDepartment.fulfilled, (state, action) => {
        state.employees = action.payload;
      })
      .addCase(fetchEmployeesByDesignation.fulfilled, (state, action) => {
        state.employees = action.payload;
      })
      .addCase(createEmployee.pending, (state) => { state.loading = true; })
      .addCase(createEmployee.fulfilled, (state) => { state.loading = false; })
      .addCase(createEmployee.rejected, (state, action) => {
        state.error = action.payload;
        state.loading = false;
      });
  },
});

export default employeeSlice.reducer;
export { fetchEmployees, createEmployee, updateEmployeeRole, fetchEmployeesByDepartment, fetchEmployeesByDesignation }; // ✅ Ensure Single Export
