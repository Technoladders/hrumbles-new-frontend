// Redux/authSlice.js

import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import supabase from "../config/supabaseClient"; 

// Load stored session from localStorage
const storedAuth = JSON.parse(localStorage.getItem("authState")) || {
  user: null,
  role: null,
  permissions: [],
  organization_id: null,
  loading: false,
  error: null,
  isLoggingOut: false,
};

// ✅ Fetch user session, role, and permissions
export const fetchUserSession = createAsyncThunk(
  "auth/fetchUserSession",
  async (_, { rejectWithValue }) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData || !sessionData.session) return rejectWithValue("No session found");

      const userId = sessionData.session.user.id;

      // ✅ Fetch role AND STATUS from `hr_employees`
      const { data: profile, error: profileError } = await supabase
        .from("hr_employees")
        .select("role_id, organization_id, status") // <--- ADD status HERE
        .eq("id", userId)
        .single();

      if (profileError) {
        return rejectWithValue("Profile not found.");
      }

      // 🛑 CRITICAL CHECK: Enforce Active Status
      if (profile.status !== 'active') {
         // Force signout immediately so the token is killed on the client
         await supabase.auth.signOut();
         localStorage.clear();
         return rejectWithValue("Account is inactive.");
      }

      if (!profile.organization_id) {
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
        user: sessionData.session.user,
        role: roleData.name,
        organization_id: profile.organization_id,
        permissions: permissionNames.map((p) => p.name),
      };

      // ✅ Save session in localStorage
      localStorage.setItem("authState", JSON.stringify(authData));

      return authData;
    } catch (error) {
      // Ensure local storage is cleared if anything fails
      localStorage.removeItem("authState");
      return rejectWithValue(error.message);
    }
  }
);

const authSlice = createSlice({
  name: "auth",
  initialState: storedAuth,
  reducers: {
    setLoggingOut: (state, action) => {
      state.isLoggingOut = action.payload;
    },
    logout: (state) => {
      state.user = null;
      state.role = null;
      state.permissions = [];
      state.organization_id = null;
      state.isLoggingOut = false;
      localStorage.removeItem("authState");
      // Also clear Supabase keys to prevent auto-relogin
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('sb-')) localStorage.removeItem(key);
      });
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUserSession.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserSession.fulfilled, (state, action) => {
        // Use functional state update to ensure immutability is handled by Immer
        state.user = action.payload.user;
        state.role = action.payload.role;
        state.organization_id = action.payload.organization_id;
        state.permissions = action.payload.permissions;
        state.loading = false;
      })
      .addCase(fetchUserSession.rejected, (state, action) => {
        state.error = action.payload;
        state.user = null; // Ensure user is null on failure
        state.loading = false;
        localStorage.removeItem("authState"); // Clear bad state
      });
  },
});

export const { logout, setLoggingOut } = authSlice.actions;
export default authSlice.reducer;