// import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
// import  supabase  from "../config/supabaseClient"; 

// // ✅ Fetch user session, role, and permissions
// export const fetchUserSession = createAsyncThunk(
//   "auth/fetchUserSession",
//   async (_, { rejectWithValue }) => {
//     try {
//       const { data: session } = await supabase.auth.getSession();
//       if (!session || !session.session) return rejectWithValue("No session found");

//       const userId = session.session.user.id;

//       // ✅ Fetch role from `hr_employees`
//       const { data: profile, error: profileError } = await supabase
//       .from("hr_employees")
//       .select("role_id, organization_id") 
//       .eq("id", userId)
//       .single();

//     if (profileError || !profile.organization_id) {
//       return rejectWithValue("Organization ID is missing.");
//     }

//       // ✅ Fetch role name
//       const { data: roleData, error: roleError } = await supabase
//         .from("hr_roles")
//         .select("name")
//         .eq("id", profile.role_id)
//         .single();
//       if (roleError) return rejectWithValue(roleError.message);

//       // ✅ Fetch role permissions
//       const { data: permissions, error: permissionError } = await supabase
//         .from("hr_role_permissions")
//         .select("permission_id")
//         .eq("role_id", profile.role_id);
//       if (permissionError) return rejectWithValue(permissionError.message);

//       // ✅ Fetch permission names
//       const permissionIds = permissions.map((p) => p.permission_id);
//       const { data: permissionNames, error: permNameError } = await supabase
//         .from("hr_permissions")
//         .select("name")
//         .in("id", permissionIds);
//       if (permNameError) return rejectWithValue(permNameError.message);

//       return { user: session.session.user, role: roleData.name, organization_id: profile.organization_id, permissions: permissionNames.map(p => p.name) };
//     } catch (error) {
//       return rejectWithValue(error.message);
//     }
//   }
// );


// const authSlice = createSlice({
//   name: "auth",
//   initialState: {
//     user: null,
//     role: null,
//     permissions: [],
//     organization_id: null,
//     loading: false,
//     error: null,
//   },
//   reducers: {
//     logout: (state) => {
//       state.user = null;
//       state.role = null;
//       state.permissions = [];
//     },
//   },
//   extraReducers: (builder) => {
//     builder
//       .addCase(fetchUserSession.pending, (state) => {
//         state.loading = true;
//         state.error = null;
//       })
//       .addCase(fetchUserSession.fulfilled, (state, action) => {
//         state.user = action.payload.user;
//         state.role = action.payload.role;
//         state.organization_id = action.payload.organization_id;
//         state.permissions = action.payload.permissions;
//         state.loading = false;
//       })
//       .addCase(fetchUserSession.rejected, (state, action) => {
//         state.error = action.payload;
//         state.loading = false;
//       });
//   },
// });

// export const { logout } = authSlice.actions;
// export default authSlice.reducer;


//Temporary Auth for develop

import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import supabase from "../config/supabaseClient"; 

// Load stored session from localStorage (if available)
const storedAuth = JSON.parse(localStorage.getItem("authState")) || {
  user: null,
  role: null,
  permissions: [],
  organization_id: null,
  loading: false,
  error: null,
};

// ✅ Fetch user session, role, and permissions
export const fetchUserSession = createAsyncThunk(
  "auth/fetchUserSession",
  async (_, { rejectWithValue }) => {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session || !session.session) return rejectWithValue("No session found");

      const userId = session.session.user.id;

      // ✅ Fetch role from `hr_employees`
      const { data: profile, error: profileError } = await supabase
        .from("hr_employees")
        .select("role_id, organization_id") 
        .eq("id", userId)
        .single();

      if (profileError || !profile.organization_id) {
        return rejectWithValue("Organization ID is missing.");
      }

      // ✅ Fetch role name
      const { data: roleData, error: roleError } = await supabase
        .from("hr_roles")
        .select("name")
        .eq("id", profile.role_id)
        .single();
      if (roleError) return rejectWithValue(roleError.message);

      // ✅ Fetch role permissions
      const { data: permissions, error: permissionError } = await supabase
        .from("hr_role_permissions")
        .select("permission_id")
        .eq("role_id", profile.role_id);
      if (permissionError) return rejectWithValue(permissionError.message);

      // ✅ Fetch permission names
      const permissionIds = permissions.map((p) => p.permission_id);
      const { data: permissionNames, error: permNameError } = await supabase
        .from("hr_permissions")
        .select("name")
        .in("id", permissionIds);
      if (permNameError) return rejectWithValue(permNameError.message);

      const authData = {
        user: session.session.user,
        role: roleData.name,
        organization_id: profile.organization_id,
        permissions: permissionNames.map((p) => p.name),
      };

      // ✅ Save session in localStorage
      localStorage.setItem("authState", JSON.stringify(authData));

      return authData;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const authSlice = createSlice({
  name: "auth",
  initialState: storedAuth, // ✅ Load from localStorage
  reducers: {
    logout: (state) => {
      state.user = null;
      state.role = null;
      state.permissions = [];
      state.organization_id = null;
      localStorage.removeItem("authState"); // ✅ Clear session on logout
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUserSession.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserSession.fulfilled, (state, action) => {
        Object.assign(state, action.payload);
        state.loading = false;
      })
      .addCase(fetchUserSession.rejected, (state, action) => {
        state.error = action.payload;
        state.loading = false;
      });
  },
});

export const { logout } = authSlice.actions;
export default authSlice.reducer;

