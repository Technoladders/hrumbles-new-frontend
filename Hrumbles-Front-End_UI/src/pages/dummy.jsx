// import supabase from "./supabaseClient";

// // Create Global Superadmin & Assign Organization
// export const createGlobalSuperadmin = async (email, password, name) => {
//   // Step 1: Sign Up User in Supabase Auth
//   const { data, error } = await supabase.auth.signUp({
//     email,
//     password,
//     options: {
//       data: {
//         name,
//         role: "global_superadmin",
//       },
//     },
//   });

//   if (error) {
//     console.error("Supabase Auth Error:", error);
//     throw error;
//   }

//   const userId = data.user?.id; // Get the Supabase Auth user ID
//   if (!userId) {
//     throw new Error("Error: Supabase Auth did not return a user ID.");
//   }

//   console.log("Superadmin User ID:", userId);

//   // Step 2: Check if an organization exists or create one
//   const { data: existingOrg, error: orgError } = await supabase
//     .from("organizations")
//     .select("id")
//     .single();

//   let organizationId;

//   if (!existingOrg) {
//     const { data: newOrg, error: newOrgError } = await supabase
//       .from("organizations")
//       .insert([{ name: "Global Organization" }])
//       .select()
//       .single();

//     if (newOrgError) {
//       console.error("Error creating organization:", newOrgError);
//       throw newOrgError;
//     }

//     organizationId = newOrg.id;
//   } else {
//     organizationId = existingOrg.id;
//   }

//   console.log("Organization ID:", organizationId);

//   // Step 3: Fetch Role ID for Global Superadmin
//   const roleId = await getRoleId("global_superadmin");

//   if (!roleId) {
//     console.error("Error: Role ID for global_superadmin not found!");
//     throw new Error("Role ID not found.");
//   }

//   console.log("Role ID for Global Superadmin:", roleId);

//   // Step 4: Insert User into `users` Table
//   const { error: dbError } = await supabase
//     .from("users")
//     .insert([
//       {
//         id: userId, // Required
//         email,
//         name,
//         organization_id: organizationId, // Nullable but should be set
//         role_id: roleId, // Nullable but should be set
//         is_sso_user: false, // Required field (Must be explicitly set)
//         is_anonymous: false, // Required field (Must be explicitly set)
//       },
//     ]);

//   if (dbError) {
//     console.error("Error inserting into users table:", dbError);
//     throw dbError;
//   }

//   console.log("Global Superadmin Created in `users` Table:", data);
//   return data;
// };

// // Get Role ID by Name
// const getRoleId = async (roleName) => {
//   const { data, error } = await supabase
//     .from("roles")
//     .select("id")
//     .eq("name", roleName)
//     .single();

//   if (error) {
//     console.error("Error fetching role ID:", error);
//     return null;
//   }
//   return data.id;
// };




// export const signIn = async (email, password) => {
//   const { data, error } = await supabase.auth.signInWithPassword({ email, password });

//   if (error) throw error;
//   return data;
// };

// // Sign Out User
// export const signOut = async () => {
//   await supabase.auth.signOut();
// };

// export const getUser = async () => {
//   const { data: authUser } = await supabase.auth.getUser();

//   if (!authUser.user) return null;

//   const { data: userData, error } = await supabase
//     .from("users")
//     .select("*")
//     .eq("id", authUser.user.id)
//     .single();

//   if (error) {
//     console.error("Error fetching user data:", error);
//     return null;
//   }

//   return { ...authUser.user, ...userData };
// };

// export const getUserRole = async (userId) => {
//   const { data, error } = await supabase
//     .from("users")
//     .select("role_id")
//     .eq("id", userId)
//     .single();

//   if (error) {
//     console.error("Error fetching user role:", error);
//     return null;
//   }

//   return data.role_id;
// };

// export const getOrganizations = async () => {
//   const { data, error } = await supabase
//     .from("organizations")
//     .select("id")
//     .headers({ Accept: "application/json" });

//   if (error) {
//     console.error("Error fetching organizations:", error);
//     throw error;
//   }

//   return data;
// };


////change to new db

import supabase from "./supabaseClient";





// Get the currently authenticated user
export const getUser = async () => {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
};

// Get the role of the authenticated user
export const getUserRole = async (userId) => {
  const { data, error } = await supabase
    .from("hr_employees")
    .select("role_id")
    .eq("id", userId)
    .single();

  if (error || !data) return null;

  // Fetch role name from hr_roles table
  const { data: roleData, error: roleError } = await supabase
    .from("hr_roles")
    .select("name")
    .eq("id", data.role_id)
    .single();

  if (roleError || !roleData) return null;
  return roleData.name;
};

// Sign Up First User (Global Superadmin)
export const signUpFirstUser = async (email, password, firstName, lastName) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        first_name: firstName,
        last_name: lastName,
      },
    },
  });

  if (error) throw error;

  return data;
};

// Global Superadmin Creates Organization Superadmin and Organization
export const createOrganizationSuperadmin = async (email, password, firstName, lastName, orgName) => {
  const user = await getUser();
  if (!user) throw new Error("Auth session missing! Please log in.");

  const role = await getUserRole(user.id);
  if (role !== "global_superadmin") throw new Error("Only Global Superadmin can create an Organization Superadmin");

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        first_name: firstName,
        last_name: lastName,
      },
    },
  });

  if (error) throw error;

  // Create organization & assign superadmin
  const { data: orgData, error: orgError } = await supabase.rpc("create_organization_with_superadmin", {
    org_name: orgName,
    user_id: data.user.id,
  });

  if (orgError) throw orgError;

  return { user: data.user, organization: orgData };
};

// Organization Superadmin Creates User (Admin/Employee)
export const createUserInOrganization = async (email, password, firstName, lastName, roleName, departmentId, designationId) => {


  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        first_name: firstName,
        last_name: lastName,
      },
    },
  });

  if (error) throw error;

  // Assign organization, role, department, and designation
  const { data: profileUpdate, error: profileUpdateError } = await supabase
    .from("hr_employees")
    .update({
      organization_id: user.organization_id,
      role_id: await getRoleId(roleName),
      department_id: departmentId,
      designation_id: designationId,
    })
    .eq("id", data.user.id);

  if (profileUpdateError) throw profileUpdateError;

  return { user: data.user, profile: profileUpdate };
};

// Sign in
export const signIn = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
};

// Sign out
export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

// Listen for authentication state changes
export const onAuthStateChange = (callback) => {
  return supabase.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });
};

// Helper function to get role ID by role name
const getRoleId = async (roleName) => {
  const { data, error } = await supabase.from("hr_roles").select("id").eq("name", roleName).single();
  if (error) throw new Error("Role not found");
  return data.id;
};


export const getUserSession = async () => {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) return null;
  return data.session;
};


// Check if a Global Superadmin already exists
export const isGlobalSuperadminExists = async () => {
  const { data, error } = await supabase
    .from("hr_employees")
    .select("id")
    .eq("role_id", await getRoleId("global_superadmin"))
    .limit(1);

  if (error) {
    console.error("Error checking for Global Superadmin:", error.message);
    return false;
  }

  return data.length > 0;
};




