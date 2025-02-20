import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import  supabase  from "../config/supabaseClient"; 

// ✅ Fetch Departments
const fetchDepartments = createAsyncThunk(
    "departments/fetch", 
    async (_, { getState, rejectWithValue }) => {
      const { organization_id } = getState().auth;
      
      if (!organization_id) return rejectWithValue("Missing organization ID.");
  
      const { data, error } = await supabase
        .from("hr_departments")
        .select("*")
        .eq("organization_id", organization_id);
  
      if (error) return rejectWithValue(error.message);
      return data;
  });
  
const createDepartment = createAsyncThunk(
    "departments/create",
    async ({ name, organization_id }, { rejectWithValue }) => {
      if (!organization_id) return rejectWithValue("Missing organization ID.");
  
      const { error } = await supabase.from("hr_departments").insert([{ name, organization_id }]);
      if (error) return rejectWithValue(error.message);
    }
  );
  

// ✅ Fetch Designations
const fetchDesignations = createAsyncThunk("designations/fetch", async () => {
    const { data, error } = await supabase.from("hr_designations").select("*");
  
    if (error) throw error;
    return data;
  });
  
  // ✅ Create Designation (Attach to Department)
const createDesignation = createAsyncThunk(
    "designations/create",
    async ({ department_id, name }, { rejectWithValue }) => {
      if (!department_id) return rejectWithValue("Missing department ID.");
  
      const { error } = await supabase.from("hr_designations").insert([{ department_id, name }]);
      if (error) return rejectWithValue(error.message);
    }
  );
  

const departmentSlice = createSlice({
  name: "departments",
  initialState: { departments: [], designations: [], loading: false, error: null },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchDepartments.fulfilled, (state, action) => { state.departments = action.payload; })
      .addCase(createDepartment.fulfilled, (state, action) => { state.departments.push(action.payload); })
      .addCase(fetchDesignations.fulfilled, (state, action) => { state.designations = action.payload; })
      .addCase(createDesignation.fulfilled, (state, action) => { state.designations.push(action.payload); });
  },
});

export default departmentSlice.reducer;
export { fetchDepartments, fetchDesignations, createDepartment, createDesignation };
