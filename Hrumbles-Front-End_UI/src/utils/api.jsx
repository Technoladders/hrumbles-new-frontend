import  supabase  from "../config/supabaseClient"; 

// ✅ Get role ID by role name
const getRoleId = async (roleName) => {

  const { data, error } = await supabase
    .from("hr_roles")
    .select("id")
    .eq("name", roleName)
    .maybeSingle(); 
  if (error) {
    console.error(`Error fetching role ID for '${roleName}':`, error.message);
    throw new Error("Failed to fetch role ID.");
  }
  if (!data || !data.id) {
    throw new Error(`Role '${roleName}' not found in database! Please check hr_roles table.`);
  }

  return data.id;
};

const getOrgId = async (orgName) => {
  console.log("orgName", orgName);

  const { data, error } = await supabase
    .from("hr_organizations")
    .select("id")
    .eq("name", orgName)
    .maybeSingle();

  console.log("getorgID", data);

  if (error) {
    console.error(`Error fetching org ID for '${orgName}':`, error.message);
    throw new Error("Failed to fetch org ID.");
  }
  if (!data || !data.id) {
    console.error(`Organization '${orgName}' not found in database.`);
    return null;  // Explicitly return null
  }

  return data.id;
};




// ✅ Check if Global Superadmin Exists
export const isGlobalSuperadminExists = async () => {
  const roleId = await getRoleId("global_superadmin");  // Ensure role exists first

  const { data, error } = await supabase
    .from("hr_employees")
    .select("id")
    .eq("role_id", roleId)
    .limit(1);

  if (error) {
    console.error("Error checking for Global Superadmin:", error.message);
    return false;
  }

  return data.length > 0;
};

// ✅ Register the First User as Global Superadmin
export const signUpFirstUser = async (email, password, firstName, lastName, orgName, phoneNo) => {
  const exists = await isGlobalSuperadminExists();

  if (exists) {
    throw new Error("Global Superadmin already exists! New requests will be sent to the existing Superadmin.");
  }

  // ✅ Get global_superadmin role ID
  const roleId = await getRoleId("global_superadmin");

  // ✅ Create user in Supabase Authentication
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: null,
      data: {
        first_name: firstName,
        last_name: lastName,
        phone: phoneNo,
        role: "global_superadmin",
        organization_name: orgName,
        employee_id: "HR001",
      },
    },
  });

  if (error) throw error;
  if (!data.user) throw new Error("User registration failed. No user data returned.");


  // Insert into hr_organization
  const { error: organizationError } = await supabase.from("hr_organizations").insert({
    name: orgName,
  });
  if (organizationError) throw organizationError;
  const orgId = await getOrgId(orgName);
console.log("orgIDID", orgId)
  // ✅ Insert into hr_employees
  const { error: profileError } = await supabase.from("hr_employees").upsert({
    id: data.user.id,
    role_id: roleId,
    first_name: firstName,
    last_name: lastName,
    organization_id: orgId,
    phone: phoneNo,
    employee_id: "HR001",
    email: email,
  });
  console.log("Inserting into hr_employees:", {
    id: data.user.id,
    role_id: roleId,
    first_name: firstName,
    last_name: lastName,
    organization_id: orgId,
    phone: phoneNo,
    employee_id: "HR001",
  });
  

  if (profileError) throw profileError;
  

  return data;
};


// ✅ Register New User Request (Main Signup Function)
export const registerNewUser = async (email, password, firstName, lastName, orgName, phoneNo) => {
  const exists = await isGlobalSuperadminExists();

  if (!exists) {
    // ✅ No Global Superadmin → Create the first one
    return await signUpFirstUser(email, password, firstName, lastName, orgName, phoneNo);
  } else {
    // ✅ Global Superadmin exists → Send request email
    return await sendRequestToGlobalSuperadmin(email, firstName, lastName, orgName, phoneNo);
  }
};

// ✅ Sign In
export const signIn = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) throw error;
  if (!data.user) throw new Error("User sign-in failed.");

  // ✅ Get user's role from hr_employees
  const { data: profile, error: profileError } = await supabase
    .from("hr_employees")
    .select("role_id")
    .eq("id", data.user.id)
    .single();

  if (profileError) throw profileError;
  if (!profile) throw new Error("User profile not found.");

  // ✅ Fetch role name
  const { data: roleData, error: roleError } = await supabase
    .from("hr_roles")
    .select("name")
    .eq("id", profile.role_id)
    .single();

  if (roleError) throw roleError;
  if (!roleData) throw new Error("Role not found.");

  return { user: data.user, role: roleData.name }; // Returning user and role
};


// ✅ Sign Out
export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

// ✅ Listen for Authentication State Changes
export const onAuthStateChange = (callback) => {
  return supabase.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });
};

// ✅ Get User Session
export const getUserSession = async () => {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) return null;
  return data.session;
};


///Organization Superadmnin

export const getAvailableRoles = async () => {
  const { data, error } = await supabase
    .from("hr_roles")
    .select("id, name")
    .neq("name", "global_superadmin"); 

  if (error) {
    console.error("Error fetching roles:", error.message);
    throw new Error("Failed to fetch roles.");
  }
  return data;
};

export const createOrganizationWithSuperadmin = async (
  email,
  password,
  firstName,
  lastName,
  orgName,
  roleName,
  phoneNo
) => {
  const user = await getUser();
  if (!user) throw new Error("Auth session missing! Please log in.");

  const userRole = await getUserRole(user.id);
  if (userRole !== "global_superadmin") throw new Error("Only Global Superadmin can create organizations.");

  // ✅ Get role ID for selected role
  const roleId = await getRoleId(roleName);

  // ✅ Create user in Supabase Auth
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        first_name: firstName,
        last_name: lastName,
        phone:phoneNo
      },
    },
  });

  if (error) throw error;
  if (!data.user) throw new Error("User registration failed. No user data returned.");

  // ✅ Create Organization (if it doesn't exist)
  let orgId = await getOrgId(orgName);
  if (!orgId) {
    const { data: newOrg, error: orgError } = await supabase
      .from("hr_organizations")
      .insert([{ name: orgName }])
      .select("id")
      .single();

    if (orgError) throw orgError;
    orgId = newOrg.id;
  }

  // ✅ Insert into hr_employees
  const { error: profileError } = await supabase.from("hr_employees").upsert({
    id: data.user.id,
    organization_id: orgId,
    role_id: roleId,
    first_name: firstName,
    last_name: lastName,
    phone:phoneNo,
    employee_id: "ASC-001",
    email: email,
  });

  if (profileError) throw profileError;

  return { user: data.user, organization: orgId };
};

// ✅ Get authenticated user
export const getUser = async () => {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
};

// ✅ Get user's role
export const getUserRole = async (userId) => {
  const { data, error } = await supabase
    .from("hr_employees")
    .select("role_id")
    .eq("id", userId)
    .single();

  if (error || !data) return null;

  const { data: roleData, error: roleError } = await supabase
    .from("hr_roles")
    .select("name")
    .eq("id", data.role_id)
    .single();

  if (roleError || !roleData) return null;
  return roleData.name;
};
// 