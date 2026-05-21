// Redux/authSlice.js

import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import supabase from "../config/supabaseClient";

// ── FIX: Spread pattern instead of || ─────────────────────────────────────────
// The old pattern  `JSON.parse(...) || defaultObj`  is all-or-nothing.
// If ANY valid object exists in localStorage the fallback never fires,
// so new fields (can_revert_status, org_revert_status_enabled) stay undefined.
// The spread pattern merges defaults first, then overlays whatever is stored.
const DEFAULTS = {
  user: null,
  role: null,
  permissions: [],
  organization_id: null,
  can_revert_status: false,
  org_revert_status_enabled: false,
  loading: false,
  error: null,
  isLoggingOut: false,
};

const storedRaw = (() => {
  try {
    return JSON.parse(localStorage.getItem("authState")) || {};
  } catch {
    return {};
  }
})();

// Defaults first → stored values on top.
// Any NEW field missing from old localStorage still gets its default (false/null/[]).
const storedAuth = { ...DEFAULTS, ...storedRaw };

// ── fetchUserSession ───────────────────────────────────────────────────────────
export const fetchUserSession = createAsyncThunk(
  "auth/fetchUserSession",
  async (_, { rejectWithValue }) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) return rejectWithValue("No session found");

      const userId = sessionData.session.user.id;

      // ── Step 1: employee profile ───────────────────────────────────────────
      const { data: profile, error: profileError } = await supabase
        .from("hr_employees")
        .select("role_id, organization_id, status, can_revert_status")
        .eq("id", userId)
        .single();

      if (profileError) return rejectWithValue("Profile not found.");

      if (profile.status !== "active") {
        await supabase.auth.signOut();
        localStorage.clear();
        return rejectWithValue("Account is inactive.");
      }

      if (!profile.organization_id)
        return rejectWithValue("Organization ID is missing.");

      // ── Step 2: parallel fetches ───────────────────────────────────────────
      const [orgResult, roleResult, permissionsResult] = await Promise.all([
        supabase
          .from("hr_organizations")
          .select("revert_status_enabled")
          .eq("id", profile.organization_id)
          .single(),

        supabase
          .from("hr_roles")
          .select("name")
          .eq("id", profile.role_id)
          .single(),

        supabase
          .from("hr_role_permissions")
          .select("permission_id")
          .eq("role_id", profile.role_id),
      ]);

      if (roleResult.error) return rejectWithValue(roleResult.error.message);
      if (permissionsResult.error)
        return rejectWithValue(permissionsResult.error.message);

      // org query failing is non-fatal — default false
      const orgRevertEnabled = orgResult.data?.revert_status_enabled ?? false;

      // ── Step 3: resolve permission names ──────────────────────────────────
      const permissionIds = permissionsResult.data.map((p) => p.permission_id);
      const { data: permissionNames, error: permNameError } = await supabase
        .from("hr_permissions")
        .select("name")
        .in("id", permissionIds);

      if (permNameError) return rejectWithValue(permNameError.message);

      // ── Step 4: build payload + persist ───────────────────────────────────
      const authData = {
        user: sessionData.session.user,
        role: roleResult.data.name,
        organization_id: profile.organization_id,
        permissions: permissionNames.map((p) => p.name),
        can_revert_status: profile.can_revert_status ?? false,
        org_revert_status_enabled: orgRevertEnabled,
      };

      localStorage.setItem("authState", JSON.stringify(authData));
      return authData;
    } catch (error) {
      localStorage.removeItem("authState");
      return rejectWithValue(error.message);
    }
  }
);

// ── Slice ──────────────────────────────────────────────────────────────────────
const authSlice = createSlice({
  name: "auth",
  initialState: storedAuth,
  reducers: {
    setLoggingOut: (state, action) => {
      state.isLoggingOut = action.payload;
    },
    logout: (state) => {
      Object.assign(state, DEFAULTS);
      state.isLoggingOut = false;
      localStorage.removeItem("authState");
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith("sb-")) localStorage.removeItem(key);
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
        state.user                     = action.payload.user;
        state.role                     = action.payload.role;
        state.organization_id          = action.payload.organization_id;
        state.permissions              = action.payload.permissions;
        state.can_revert_status        = action.payload.can_revert_status;
        state.org_revert_status_enabled = action.payload.org_revert_status_enabled;
        state.loading = false;
      })
      .addCase(fetchUserSession.rejected, (state, action) => {
        state.error                    = action.payload;
        state.user                     = null;
        state.can_revert_status        = false;
        state.org_revert_status_enabled = false;
        state.loading = false;
        localStorage.removeItem("authState");
      });
  },
});

export const { logout, setLoggingOut } = authSlice.actions;
export default authSlice.reducer;