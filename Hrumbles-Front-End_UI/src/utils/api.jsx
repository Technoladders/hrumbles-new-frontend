// api.jsx

// Remove the curly braces if it is a default export
import supabase from "../config/supabaseClient";

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
    return null;
  }
  return data.id;
};

// ====================================================================
// 🆕 COMPANY SEARCH FUNCTIONS - Added for company linking feature
// ====================================================================

/**
 * Search for companies in the master data
 * @param {string} searchTerm - Company name or CIN to search for
 * @param {number} limit - Maximum number of results (default: 10)
 * @returns {Promise<Array>} Array of matching companies with UUID id
 */
export const searchCompanies = async (searchTerm, limit = 10) => {
  if (!searchTerm || searchTerm.length < 2) {
    return [];
  }

  const { data, error } = await supabase.rpc('search_companies', {
    search_term: searchTerm,
    limit_count: limit
  });

  if (error) {
    console.error('Error searching companies:', error);
    throw new Error(`Failed to search companies: ${error.message}`);
  }

  return data || [];
};

/**
 * Parse address from company master data format
 * @param {string} registeredAddress - Full registered address from MCA
 * @returns {Object} Parsed address components
 */
export const parseCompanyAddress = (registeredAddress) => {
  // Format: "House details, Area, City, State, PIN-Country"
  const parts = registeredAddress.split(',').map(s => s.trim());
  
  const addressLine1 = parts[0] || '';
  const addressLine2 = parts.slice(1, parts.length - 3).join(', ') || '';
  
  // Get last part and split by '-' for country
  const lastPart = parts[parts.length - 1] || '';
  const [zipWithCountry] = lastPart.split('-');
  const zipCode = zipWithCountry?.match(/\d{6}/)?.[0] || '';
  const country = lastPart.split('-')[1]?.trim() || 'India';
  
  const state = parts[parts.length - 2] || '';
  const city = parts[parts.length - 3] || '';

  return {
    address_line1: addressLine1.substring(0, 200),
    address_line2: addressLine2.substring(0, 200),
    city: city.substring(0, 100),
    state: state.substring(0, 100),
    zip_code: zipCode,
    country: country
  };
};

// ====================================================================
// END OF COMPANY SEARCH FUNCTIONS
// ====================================================================

// ✅ Check if Global Superadmin Exists
export const isGlobalSuperadminExists = async () => {
  const roleId = await getRoleId("global_superadmin");

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

  const roleId = await getRoleId("global_superadmin");

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

  const { error: organizationError } = await supabase.from("hr_organizations").insert({
    name: orgName,
  });
  if (organizationError) throw organizationError;
  
  const orgId = await getOrgId(orgName);
  console.log("orgIDID", orgId)

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
    return await signUpFirstUser(email, password, firstName, lastName, orgName, phoneNo);
  } else {
    return await sendRequestToGlobalSuperadmin(email, firstName, lastName, orgName, phoneNo);
  }
};

// ✅ Sign In
export const signIn = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) throw error;
  if (!data.user) throw new Error("User sign-in failed.");

  const { data: profile, error: profileError } = await supabase
    .from("hr_employees")
    .select("role_id")
    .eq("id", data.user.id)
    .single();

  if (profileError) throw profileError;
  if (!profile) throw new Error("User profile not found.");

  const { data: roleData, error: roleError } = await supabase
    .from("hr_roles")
    .select("name")
    .eq("id", profile.role_id)
    .single();

  if (roleError) throw roleError;
  if (!roleData) throw new Error("Role not found.");

  return { user: data.user, role: roleData.name };
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

// ✅ Get Available Roles
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

// ✅ Create Organization with Superadmin - UPDATED with company linking
export const createOrganizationWithSuperadmin = async (
  email,
  password,
  firstName,
  lastName,
  orgName,
  roleName,
  phoneNo,
  subdomain,     
  roleLimits,   
  employeeId,   
  isRecruitmentFirm,
  isVerificationFirm,
  companyId = null  // 🆕 NEW PARAMETER: UUID of linked company (optional)
) => {
  const user = await getUser();
  if (!user) throw new Error("Auth session missing! Please log in.");

  const userRole = await getUserRole(user.id);
  if (userRole !== "global_superadmin") {
    throw new Error("Only Global Superadmin can create organizations.");
  }

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
        phone: phoneNo
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
      .insert([{ 
        name: orgName, 
        subdomain: subdomain,
        role_credit_limits: roleLimits,
        is_recruitment_firm: isRecruitmentFirm,
        is_verification_firm: isVerificationFirm,
        company_id: companyId  // 🆕 NEW: Link to company master data (UUID)
      }])
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
    phone: phoneNo,
    employee_id: employeeId,
    email: email,
  });

  if (profileError) throw profileError;

  // Clone Job Statuses for Recruitment Firms
  if (isRecruitmentFirm) {
    const TEMPLATE_ORG_ID = '53989f03-bdc9-439a-901c-45b274eff506';
    const { error: cloneError } = await supabase.rpc('clone_job_statuses', {
      source_org_id: TEMPLATE_ORG_ID,
      target_org_id: orgId
    });

    if (cloneError) {
      console.error("Failed to clone job statuses:", cloneError.message);
    }
  }

  return { user: data.user, organization: orgId, company_id: companyId };
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