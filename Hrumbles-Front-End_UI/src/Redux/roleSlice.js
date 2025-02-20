import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import  supabase  from "../config/supabaseClient"; 

// ✅ Fetch Roles from `hr_roles`
const fetchRoles = createAsyncThunk("roles/fetch", async () => {
  const { data, error } = await supabase.from("hr_roles").select("id, name"); // ✅ Fetch only ID & Name
  if (error) throw error;
  return data;
});

const roleSlice = createSlice({
  name: "roles",
  initialState: { roles: [], loading: false, error: null },
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(fetchRoles.fulfilled, (state, action) => {
      state.roles = action.payload;
    });
  },
});

export default roleSlice.reducer;
export { fetchRoles };
