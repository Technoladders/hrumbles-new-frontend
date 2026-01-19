import { useState, FC, ChangeEvent, KeyboardEvent, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { ThunkDispatch } from '@reduxjs/toolkit';
import { AnyAction } from 'redux';
import { signIn } from "../utils/api"; 
import { fetchUserSession } from "../Redux/authSlice"; 
import supabase from "../config/supabaseClient";
import { getOrganizationSubdomain } from "../utils/subdomain"; 
import { Eye, EyeOff, Loader2, Mail, Lock } from 'lucide-react';
import { motion } from 'framer-motion';
import Orb from '../components/ui/Reactbits-theme/Orb'; // Adjust path if needed
import Silk from '../components/ui/Reactbits-theme/Silk'; // Adjust path if needed


// --- Constants ---
const ITECH_ORGANIZATION_ID = [
  "1961d419-1272-4371-8dc7-63a4ec71be83",
  "4d57d118-d3a2-493c-8c3f-2cf1f3113fe9",
];
const ASCENDION_ORGANIZATION_ID = "22068cb4-88fb-49e4-9fb8-4fa7ae9c23e5";

// --- Type Definitions ---
interface UserDetails {
  role: string | null;
  departmentName: string | null;
  organizationId: string | null;
  status: string | null;
  first_name?: string;
  last_name?: string;
  subscriptionStatus: string | null;
}

const LoginPage: FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch<ThunkDispatch<any, any, AnyAction>>();

  const organizationSubdomain: string | undefined = getOrganizationSubdomain();

  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [employeeData, setEmployeeData] = useState<{ first_name: string; last_name: string } | null>(null);
  
  // State for input focus styles
  const [focusedField, setFocusedField] = useState<'email' | 'password' | null>(null);

  // NEW: Track hover state for the left panel manually
  const [isLeftPanelHovered, setIsLeftPanelHovered] = useState(false);

  // ─── LOGIC SECTION (PRESERVED) ─────────────────────────────────────────────

  const logUserActivity = async (
    userId: string,
    organizationId: string,
    eventType: 'login' | 'logout' | 'failed_login',
    details?: {
      ip_address?: string;
      ipv6_address?: string;
      city?: string;
      country?: string;
      latitude?: string;
      longitude?: string;
      device_info?: string;
      errorMessage?: string;
    }
  ) => {
    try {
      if (!userId || !organizationId) {
        console.warn("Skipping activity log: Missing userId or organizationId.");
        return;
      }
      const { error } = await supabase
        .from('user_activity_logs')
        .insert({
          user_id: userId,
          organization_id: organizationId,
          event_type: eventType,
          ip_address: details?.ip_address,
          ipv6_address: details?.ipv6_address,
          city: details?.city,
          country: details?.country,
          latitude: details?.latitude,
          longitude: details?.longitude,
          device_info: details?.device_info || navigator.userAgent,
          details: details?.errorMessage ? { errorMessage: details.errorMessage } : null,
        });

      if (error) {
        console.error("Error logging user activity:", error.message);
      }
    } catch (err) {
      console.error("Unexpected error logging user activity:", err);
    }
  };


    const fetchUserDetails = async (userId: string): Promise<UserDetails> => {
    try {
      const { data: employeeData, error: employeeError } = await supabase
        .from("hr_employees")
        .select("role_id, department_id, organization_id, status, first_name, last_name, hr_organizations!inner (subscription_status)")
        .eq("id", userId)
        .single();

           console.log("[DEBUG] Supabase query result for user ID:", userId, { employeeData, employeeError });

      if (employeeError || !employeeData) {
        throw new Error("Employee profile not found for this user.");
      }
      
      console.log("[DEBUG] Raw employee data from DB:", employeeData);
      setEmployeeData(employeeData);

      let roleName: string | null = null;
      let departmentName: string | null = null;

      if (employeeData.role_id) {
        const { data: roleData, error: roleError } = await supabase
          .from("hr_roles").select("name").eq("id", employeeData.role_id).single();
        if (roleError) console.warn("Could not fetch role name:", roleError.message);
        else roleName = roleData.name;
      }

      if (employeeData.department_id) {
        const { data: departmentData, error: departmentError } = await supabase
          .from("hr_departments").select("name").eq("id", employeeData.department_id).single();
        if (departmentError) console.warn("Could not fetch department name:", departmentError.message);
        else departmentName = departmentData.name;
      }
      
      return {
        role: roleName,
        departmentName: departmentName,
        organizationId: employeeData.organization_id,
        status: employeeData.status,
        first_name: employeeData.first_name,
        last_name: employeeData.last_name,
        subscriptionStatus: employeeData.hr_organizations?.subscription_status
      };

    } catch (error: any) {
      console.error("Error in fetchUserDetails:", error.message);
       return { role: null, departmentName: null, organizationId: null, status: null, subscriptionStatus: null };
    }
  };

        const getIpAndLocationDetails = async () => {
    try {
      const response = await fetch('https://ipapi.co/json/');
      if (!response.ok) {
        throw new Error('Failed to fetch IP details from API');
      }
      const data = await response.json();
      return {
        ip: data.ip,
        city: data.city,
        region: data.region,
        country: data.country_name,
      };
    } catch (error) {
      console.error("Could not fetch IP and location details:", error);
      return {
        ip: 'Not available',
        city: 'Not available',
        region: 'Not available',
        country: 'Not available',
      };
    }
  };

   const getDeviceLocation = (): Promise<{ latitude: number; longitude: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation is not supported by this browser."));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          let errorMessage = "Could not get device location.";
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = "User denied the request for Geolocation.";
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = "Location information is unavailable.";
              break;
            case error.TIMEOUT:
              errorMessage = "The request to get user location timed out.";
              break;
          }
          reject(new Error(errorMessage));
        }
      );
    });
  };

    const getIPv6Address = async (): Promise<string> => {
    try {
      const response = await fetch('https://api6.ipify.org?format=json');
      if (!response.ok) {
        throw new Error('No IPv6 connection detected.');
      }
      const data = await response.json();
      return data.ip;
    } catch (error: any) {
      console.warn("Could not fetch IPv6 address:", error.message);
      return 'Not available';
    }
  };

  const getIPv4Address = async (): Promise<string> => {
    try {
      const response = await fetch('https://api4.ipify.org?format=json');
      if (!response.ok) throw new Error('No IPv4 connection.');
      const data = await response.json();
      return data.ip;
    } catch (error: any) {
      console.warn("Could not fetch IPv4 address:", error.message);
      return 'Not available';
    }
  };

  const getApproximateLocation = async (ipAddress: string) => {
    if (!ipAddress || ipAddress === 'Not available') {
        return { city: 'N/A', country: 'N/A' };
    }
    try {
      const response = await fetch(`https://ipapi.co/${ipAddress}/json/`);
      if (!response.ok) throw new Error('Failed to fetch location from ipapi');
      const data = await response.json();
      return {
        city: data.city || 'N/A',
        country: data.country_name || 'N/A',
      };
    } catch (error) {
      console.error("Could not fetch location details:", error);
      return { city: 'N/A', country: 'N/A' };
    }
  };

  const getOrganizationIdBySubdomain = async (subdomain: string | undefined): Promise<string | null> => {
    if (!subdomain) return null;
    const { data, error } = await supabase
      .from('hr_organizations').select('id').eq('subdomain', subdomain).single();
    if (error) {
      console.error("Error fetching organization by subdomain:", error.message);
      return null;
    }
    return data ? data.id : null;
  };

 const sendLoginNotificationInBackground = async (
    userDetails: { userEmail: string; organizationId: string | null; userId: string; firstName: string; lastName: string; } 
  ) => {
    try {
      const ipv4 = await getIPv4Address();
      const ipv6 = await getIPv6Address(); 
      const approxLocation = await getApproximateLocation(ipv4);
      let deviceLocation = { latitude: "Not available", longitude: "Not available" };
      try {
        const coords = await getDeviceLocation();
        deviceLocation = { latitude: coords.latitude.toString(), longitude: coords.longitude.toString() };
      } catch (locationError) {
        console.warn("Could not get precise device location (this is common).");
      }
      
      const notificationPayload  = {
        userEmail: userDetails.userEmail,
        organizationId: userDetails.organizationId,
        firstName: userDetails.firstName,
        lastName: userDetails.lastName,
        ipAddress: ipv4,
        ipv6Address: ipv6,
        location: `${approxLocation.city}, ${approxLocation.country}`,
        latitude: deviceLocation.latitude,
        longitude: deviceLocation.longitude,
      };

      if (userDetails.userId && userDetails.organizationId) {
        await logUserActivity(
          userDetails.userId,
          userDetails.organizationId,
          'login',
          {
            ip_address: ipv4,
            ipv6_address: ipv6,
            city: approxLocation.city,
            country: approxLocation.country,
            latitude: deviceLocation.latitude,
            longitude: deviceLocation.longitude,
            device_info: navigator.userAgent,
          }
        );
      }

      await fetch('https://kbpeyfietrwlhwcwqhjw.supabase.co/functions/v1/send-login-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notificationPayload),
      });

      console.log("Background login notification sent successfully.");

    } catch (error) {
      console.error("Failed to send login notification in the background:", error);
    }
  };

  const handleLogin = async (): Promise<void> => {
    setError(null);
    setIsLoading(true);
    console.log("--- Welcome ---");
    console.log("--- LOGIN PROCESS STARTED ---");

    let userId: string | null = null;
    let userOrgId: string | null = null;

    try {
        const subdomainOrgId = await getOrganizationIdBySubdomain(organizationSubdomain);
        if (!subdomainOrgId) throw new Error("Invalid organization domain.");
        userOrgId = subdomainOrgId;

        const { user } = await signIn(email, password);
        console.log("✅ User authenticated successfully");
        userId = user.id;

        const {
            role,
            departmentName,
            organizationId: fetchedOrgIdFromUserDetails,
            status,
            first_name,
            last_name,
            subscriptionStatus
        } = await fetchUserDetails(user.id);
        
        userOrgId = fetchedOrgIdFromUserDetails;
        if (!userOrgId) {
            throw new Error("User's organization ID could not be determined.");
        }
        
        if (status !== 'active') {
            if (userId && userOrgId) {
                await logUserActivity(userId, userOrgId, 'failed_login', { errorMessage: "Account not active" });
            }
            throw new Error("Your account is not active.");
        }
        if (userOrgId !== subdomainOrgId) {
            if (userId && userOrgId) {
                await logUserActivity(userId, userOrgId, 'failed_login', { errorMessage: "Organization domain mismatch" });
            }
            throw new Error("Access Denied. Please log in from your organization's domain.");
        }

        const isExpired = subscriptionStatus === 'expired' || subscriptionStatus === 'inactive';
        
        if (isExpired) {
            if (role !== 'organization_superadmin' && role !== 'global_superadmin') {
                await supabase.auth.signOut();
                throw new Error("Organization subscription expired. Please contact your administrator.");
            }
        }
        
        const { data: orgData, error: orgError } = await supabase
            .from('hr_organizations')
            .select('is_verification_firm')
            .eq('id', userOrgId)
            .single();

        if (orgError) {
            console.warn("Could not fetch organization verification status:", orgError.message);
        }

        const isVerificationFirm = orgData?.is_verification_firm || false;

        sendLoginNotificationInBackground({
            userEmail: email,
            organizationId: userOrgId,
            userId: userId,
            firstName: first_name || "",
            lastName: last_name || "",
        });

        await dispatch(fetchUserSession()).unwrap();

        let navigateTo = "/dashboard"; 
        if (isVerificationFirm) {
             navigateTo = "/all-candidates";
        } else if (role === "employee" && departmentName === "Finance") {
            navigateTo = "/finance";
        }

        console.log("--- LOGIN PROCESS COMPLETED ---");
        navigate(navigateTo);

    } catch (error: any) {
        console.error("🔴 LOGIN FAILED:", error.message);
        setError(error.message);
        
        if (userId && userOrgId) {
            await logUserActivity(userId, userOrgId, 'failed_login', { errorMessage: error.message });
        }
    } finally {
        setIsLoading(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === "Enter") {
      handleLogin();
    }
  };

  // ─── UI SECTION (UPDATED) ───────────────────────────────────────────────────

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  };

  return (
    <div className="min-h-screen w-full flex font-sans">
      
      {/* ── LEFT SIDE: Black Background + Orb + Tagline ──────────────────── */}
      <div 
        className="hidden lg:flex w-1/2 relative flex-col justify-center items-center p-12 overflow-hidden bg-black text-white"
        // We track mouse enter/leave on the PARENT container.
        onMouseEnter={() => setIsLeftPanelHovered(true)}
        onMouseLeave={() => setIsLeftPanelHovered(false)}
      >
        
        {/* Background Orb */}
        <div className="absolute inset-0 z-0">
     <Silk
  speed={5}
  scale={1}
  color="#5227ff"
  noiseIntensity={1.5}
  rotation={0}
/>
        </div>
        
        {/* Content Layer (Tagline) */}
<div className="relative z-10 w-full max-w-lg text-center lg:text-center pointer-events-none">
  <motion.h1 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.8, delay: 0.2 }}
    className="text-4xl md:text-5xl lg:text-6xl font-bold [line-height:2rem] md:[line-height:2.5rem] lg:[line-height:4.5rem] tracking-tight text-white"
  >
    One platform.{" "}
    <span className="text-transparent bg-clip-text text-white">
      Every function. Zero chaos.
    </span>
  </motion.h1>
</div>

        {/* Fixed Footer Text */}
        <div className="absolute bottom-12 left-12 z-20 text-sm text-gray-300 font-medium">
          © {new Date().getFullYear()} Xrilic ai.
        </div>
      </div>

       {/* ── RIGHT SIDE: Soft Light Theme + Logo + Form ───────────────────── */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-6 lg:p-12 relative z-20 bg-slate-50 text-gray-900 selection:bg-purple-100 selection:text-purple-900 overflow-hidden">
        
        {/* Subtle Ambient Mesh Gradient Background for Right Side */}
        <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-purple-50 via-slate-50 to-gray-100 opacity-70 pointer-events-none" />

        {/* Logo positioned at top-right corner */}
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="absolute top-6 right-6 lg:top-12 lg:right-16 z-30"
        >
          <img 
            src="/xrilic/Xrilic logo.svg" 
            alt="Xrilic Logo" 
            className="h-24 w-auto object-contain"  // Increased from h-14 to h-16
          />
        </motion.div>

        <motion.div 
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
          }}
          className="w-full max-w-md space-y-8 relative z-10"
        >
          {/* Header (no logo here now) */}
          <motion.div variants={itemVariants} className="text-center flex flex-col items-center space-y-6">
            
            <div className="space-y-2">
              <h1 className="text-3xl lg:text-4xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-zinc-900 via-zinc-600 to-zinc-300">
                Sign In
              </h1>
              <p className="text-gray-500 text-md">
                Securely log in to your account.
              </p>
            </div>
          </motion.div>

          {/* Form */}
          <form 
            onSubmit={(e: FormEvent) => { e.preventDefault(); handleLogin(); }} 
            className="space-y-6"
          >
            {/* EMAIL INPUT */}
            <motion.div variants={itemVariants} className="space-y-2">
              <label htmlFor="email" className="text-sm font-semibold text-gray-700 ml-1">
                Email Address
              </label>

              <div 
                className={`
                  relative flex items-center transition-all duration-300
                  bg-white border rounded-xl overflow-hidden shadow-sm
                  ${focusedField === 'email'
                    ? 'border-purple-600 ring-4 ring-purple-100/50 shadow-md' 
                    : 'border-gray-200 hover:border-gray-300'
                  }
                `}
              >
               <div className={`pl-4 pr-2 ${focusedField === 'email' ? 'text-purple-600' : 'text-gray-400'}`}>
                    <Mail className="w-5 h-5" />
                </div>

                <input
                  id="email"
                  type="text"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  className="w-full h-14 bg-white border-none outline-none focus:ring-0 text-gray-900 placeholder-gray-400 text-md font-medium autofill-white"
                />
              </div>
            </motion.div>
            
            {/* PASSWORD INPUT */}
            <motion.div variants={itemVariants} className="space-y-2">
               <div className="flex items-center justify-between ml-1">
                    <label htmlFor="password" className="text-sm font-semibold text-gray-700">
                        Password
                    </label>
                    <p
                        className="text-sm text-purple-600 font-semibold cursor-pointer hover:text-purple-700 hover:underline"
                        onClick={() => navigate('/forgot-password')}
                    >
                        Forgot password?
                    </p>
               </div>

                <div className={`
                    relative flex items-center transition-all duration-300
                    bg-white border rounded-xl overflow-hidden shadow-sm
                    ${focusedField === 'password'
                        ? 'border-purple-600 ring-4 ring-purple-100/50 shadow-md' 
                        : 'border-gray-200 hover:border-gray-300'
                    }
                `}>
                    <div className={`pl-4 pr-2 ${focusedField === 'password' ? 'text-purple-600' : 'text-gray-400'}`}>
                        <Lock className="w-5 h-5" />
                    </div>

                    <input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onFocus={() => setFocusedField('password')}
                        onBlur={() => setFocusedField(null)}
                        className="w-full h-14 bg-white border-none outline-none focus:ring-0 text-gray-900 placeholder-gray-400 text-md font-medium pr-10 autofill-white"
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-400 hover:text-gray-600 transition-colors"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                </div>
            </motion.div>

            {/* ERROR MESSAGE */}
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 rounded-lg bg-red-50 border border-red-100 text-sm text-red-600 text-center font-medium"
              >
                {error}
              </motion.div>
            )}

            {/* LOGIN BUTTON */}
            <motion.button
              variants={itemVariants}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              type="submit"
              disabled={isLoading}
              className={`
                w-full h-12 rounded-lg font-semibold text-white transition-all duration-300 flex items-center justify-center gap-2 shadow-sm
                ${!isLoading 
                  ? 'bg-gradient-to-r from-zinc-900 via-zinc-500 to-zinc-400 hover:bg-gray-800 hover:shadow-lg' 
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none'}
              `}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Logging in...</span>
                </>
              ) : (
                "Sign In"
              )}
            </motion.button>

          </form>
        </motion.div>

        {/* Footer Links */}
        <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-6 text-xs text-gray-400 font-medium z-10">
           <a href="#" className="hover:text-gray-900 transition-colors">Privacy Policy</a>
           <a href="#" className="hover:text-gray-900 transition-colors">Terms of Service</a>
           <a href="#" className="hover:text-gray-900 transition-colors">Help Center</a>
        </div>

      </div>
    </div>
  );
};

export default LoginPage;