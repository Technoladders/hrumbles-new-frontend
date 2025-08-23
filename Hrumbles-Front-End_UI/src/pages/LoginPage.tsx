import { useState, FC, ChangeEvent, KeyboardEvent, MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { ThunkDispatch } from '@reduxjs/toolkit';
import { AnyAction } from 'redux';

import { signIn } from "../utils/api"; // Assuming types are defined in this file
import { fetchUserSession } from "../Redux/authSlice"; // Assuming this is a standard Redux Thunk
import supabase from "../config/supabaseClient";
import { getOrganizationSubdomain } from "../utils/subdomain"; 
import { Eye, EyeOff } from 'lucide-react';

// --- Constants ---
const ITECH_ORGANIZATION_ID = "1961d419-1272-4371-8dc7-63a4ec71be83";
const ASCENDION_ORGANIZATION_ID = "22068cb4-88fb-49e4-9fb8-4fa7ae9c23e5";


// --- Icon and Spinner Components ---
// In a real project, you might import these from a library like 'react-icons'
// For example: import { FiSun, FiMoon } from "react-icons/fi";


// --- Type Definitions ---

interface UserDetails {
  role: string | null;
  departmentName: string | null;
  organizationId: string | null;
  status: string | null;
}

/*
 * To make TypeScript aware of your Vite environment variables,
 * create a `vite-env.d.ts` file in your `src` directory and add the following:
 *
 * /// <reference types="vite/client" />
 *
 * interface ImportMetaEnv {
 *   readonly VITE_SOME_ENV_VAR: string;
 *   // more env variables...
 * }
 *
 * interface ImportMeta {
 *   readonly env: ImportMetaEnv;
 * }
 */

const Spinner: FC = () => (
  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

const CheckCircleIcon: FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
    </svg>
);

const WarningTwoIcon: FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.21 3.031-1.742 3.031H4.42c-1.532 0-2.492-1.697-1.742-3.031l5.58-9.92zM10 13a1 1 0 110-2 1 1 0 010 2zm-1-8a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd" />
    </svg>
);

const CaretLeftIcon: FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="currentColor" viewBox="0 0 256 256">
        <path d="M165.66,202.34a8,8,0,0,1-11.32,0L88.68,136.68a8,8,0,0,1,0-11.32l65.66-65.66a8,8,0,0,1,11.32,11.32L105.32,128l60.34,63.02A8,8,0,0,1,165.66,202.34Z"></path>
    </svg>
);

const EyeIcon: FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
);

const EyeSlashIcon: FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7 1.274-4.057 5.064-7 9.542-7 .847 0 1.668.118 2.454.341M15 12a3 3 0 11-6 0 3 3 0 016 0zm6 2.25a10.048 10.048 0 01-3.172 4.075M3 3l18 18" />
    </svg>
);

// --- Main Page Component ---

const LoginPage: FC = () => {
  const navigate = useNavigate();
  // For full type safety with Redux Thunks, it's best practice to create a typed
  // `useAppDispatch` hook. See Redux Toolkit documentation for details.
  const dispatch = useDispatch<ThunkDispatch<any, any, AnyAction>>();

  const organizationSubdomain: string | undefined = getOrganizationSubdomain();

  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);

  const fetchUserDetails = async (userId: string): Promise<UserDetails> => {
    try {
      const { data: employeeData, error: employeeError } = await supabase
        .from("hr_employees")
        .select("role_id, department_id, organization_id, status")
        .eq("id", userId)
        .single();

      if (employeeError || !employeeData) {
        throw new Error("Employee profile not found for this user.");
      }
      
      console.log("[DEBUG] Raw employee data from DB:", employeeData);

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
      };

    } catch (error: any) {
      console.error("Error in fetchUserDetails:", error.message);
      return { role: null, departmentName: null, organizationId: null, status: null };
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

  const handleLogin = async (): Promise<void> => {
    setError(null);
    setIsLoading(true);
    console.log("--- LOGIN PROCESS STARTED ---");

    try {
      console.log(`[1] Reading subdomain from URL: "${organizationSubdomain}"`);
      const subdomainOrgId = await getOrganizationIdBySubdomain(organizationSubdomain);
      console.log(`[2] Fetched Organization ID for subdomain: "${subdomainOrgId}"`);

      if (!subdomainOrgId) {
        throw new Error("Invalid or unrecognized organization domain.");
      }

      console.log("[3] Attempting to sign in user:", email);
      const { user } = await signIn(email, password);
      console.log("[4] ✅ User authenticated successfully:", user);

      console.log("[5] Fetching employee details for user ID:", user.id);
      const { role, departmentName, organizationId: userOrgId, status } = await fetchUserDetails(user.id);
      console.log("[6] ✅ Fetched employee details:", { role, departmentName, userOrgId, status });

      // MODIFICATION: Add the new status check
    console.log(`[7] Verifying user status: "${status}"`);
    if (status !== 'active') {
      throw new Error("Your account is not active. Please contact your administrator.");
    }
    console.log("[8] ✅ User status is active.");
      
      if (!userOrgId) {
        throw new Error("Could not determine the user's organization. Please contact support.");
      }

      console.log(`[9] Comparing Org IDs -> User's Org ID: "${userOrgId}" vs Subdomain's Org ID: "${subdomainOrgId}"`);
      if (userOrgId !== subdomainOrgId) {
        throw new Error("Access Denied. Please log in from your organization's assigned domain.");
      }
      
      console.log("[10] ✅ Organization Match Verified. Proceeding to login.");

      await dispatch(fetchUserSession()).unwrap();

      let navigateTo = "/dashboard";
      if (role === "employee" && departmentName === "Finance") {
        navigateTo = "/finance";
      }
      if (userOrgId === ITECH_ORGANIZATION_ID || userOrgId === ASCENDION_ORGANIZATION_ID) {
        navigateTo = "/jobs";
      }
      
      console.log(`[9] Determining navigation path. Role: "${role}", Department: "${departmentName}". Navigating to: "${navigateTo}"`);
      console.log("--- LOGIN PROCESS COMPLETED SUCCESSFULLY ---");
      navigate(navigateTo);

    } catch (error: any) {
      console.error("🔴 LOGIN FAILED:", error.message);
      setError(error.message);
      console.log("--- LOGIN PROCESS HALTED DUE TO ERROR ---");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === "Enter") {
      handleLogin();
    }
  };

  return (
    <div className="min-h-screen bg-white font-sans grid grid-cols-1 lg:grid-cols-2">

      {/* --- Left Column: Testimonial/Info --- */}
      <div className="relative hidden lg:flex flex-col items-center justify-center p-12 login-gradient m-4" style={{borderRadius: '3rem' }}>
        {/* <a href="/" className="absolute top-12 left-6 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-800 bg-white rounded-full shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400">
            <CaretLeftIcon /> 
            Back to home
        </a> */}
        <div className="max-w-lg w-full">
               <img alt="hrumbles" className="h-44 w-full rounded-full" src="/hrumbles-wave-white.svg" />

            {/* <div className="bg-white/60 backdrop-blur-md rounded-2xl shadow-lg p-8"> */}
                <blockquote className="text-xl text-white leading-relaxed mb-8 space-y-4">
                    <p className='italic tracking-[.30rem] whitespace-nowrap' style={{marginLeft: '-40px'}}>"Reduce hiring risks and speed up decisions"</p>

                    {/* <p>Our platform brings instant pre-employment verification and smart candidate management together—so you can focus on making the right hires.</p> */}
                    {/* <p>A CRM, payments, subscriptions, email automation, gated content, segmentation, etc...</p> */}
                </blockquote>
                {/* <div className="flex items-center">
                    <img alt="Justin Welsh" className="h-14 w-14 rounded-full" src="https://i.pravatar.cc/150?u=justinwelsh" />
                    <div className="ml-4">
                        <p className="font-bold text-gray-900">Justin Welsh</p>
                        <p className="text-sm text-gray-600">Creator and Solopreneur</p>
                    </div>
                </div> */}
            {/* </div> */}
        </div>
      </div>

      {/* --- Right Column: Sign-in Form --- */}
      <main className="relative flex items-center justify-center p-8">
        {/* <img
          alt="hrumbles logo"
          className="absolute top-8 right-8 h-14 w-auto rounded-full"
          src="/1-cropped.svg"
        /> */}
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900">Sign In</h1>
            <p className="text-gray-500 mt-2">Securely log in to access your account.</p>
          </div>

          <form onSubmit={(e: FormEvent) => { e.preventDefault(); handleLogin(); }} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                id="email"
                type="text"
                placeholder="john@gmail.com"
                value={email}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full h-12 px-4 rounded-lg border border-gray-300 focus:border-gray-800 focus:ring-1 focus:ring-gray-800 transition-all duration-200"
              />
            </div>
            
           <div>
                <label htmlFor="password-login" className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                </label>
                <div className="relative w-full">
                    <input
                        id="password-login"
                        // Dynamically set the input type
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                        onKeyDown={handleKeyDown}
                        // Add padding to the right to make space for the icon
                        className="w-full h-12 px-4 pr-10 rounded-lg border border-gray-300 focus:border-gray-800 focus:ring-1 focus:ring-gray-800 transition-all duration-200"
                    />
                    <button
                        // Use type="button" to prevent form submission
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-600 hover:text-gray-900"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                        {/* Conditionally render the correct icon */}
                        {showPassword ? <EyeOff /> : <Eye />}
                    </button>
                </div>
            </div>

            {error && (
              <p className="text-sm text-red-600 text-center">{error}</p>
            )}

            <button
              type="submit"
              className="w-full flex justify-center items-center h-12 px-6 border border-transparent rounded-lg shadow-sm text-base font-medium text-white bg-gray-900 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              disabled={isLoading}
            >
              {isLoading ? <Spinner/> : "Login"}
            </button>

            <p
              className="text-center text-sm text-gray-600 cursor-pointer hover:text-gray-900 underline"
              onClick={() => navigate('/forgot-password')}
            >
              Forgot password?
            </p>
          </form>
        </div>
      </main>
    </div>
  );
};

export default LoginPage;