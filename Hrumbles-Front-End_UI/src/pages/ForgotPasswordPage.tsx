// src/pages/ForgotPasswordPage.tsx

import React, { useState, FC, FormEvent, ChangeEvent } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { supabase } from "@/integrations/supabase/client";
import { getOrganizationSubdomain } from "../utils/subdomain";
import { Mail, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import Silk from '../components/ui/Reactbits-theme/Silk'; // Adjust path if needed

const ForgotPasswordPage: FC = () => {
  const navigate = useNavigate();

  const organizationSubdomain: string | undefined = getOrganizationSubdomain();

  const [email, setEmail] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  // State for input focus styles
  const [focusedField, setFocusedField] = useState<'email' | null>(null);

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  };

  const handlePasswordReset = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (!organizationSubdomain) {
        throw new Error("Could not determine organization. Please access this page via your organization's domain (e.g., your-company.hrumbles.ai).");
      }
      
      // Construct the redirect URL with the subdomain
      const redirectTo = `https://${organizationSubdomain}.hrumbles.ai/set-password`;

      const { error: supabaseError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectTo,
      });

      if (supabaseError) throw supabaseError;

      setError(null); // Clear any previous errors
      // Optionally set a success message state here if you add a message display

    } catch (err: any) {
      setError(err.message || 'Failed to send password reset email.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === "Enter") {
      handlePasswordReset(e as FormEvent);
    }
  };

  return (
    <div className="min-h-screen w-full flex font-sans">
      
      {/* ── LEFT SIDE: Black Background + Silk + Tagline ──────────────────── */}
      <div 
        className="hidden lg:flex w-1/2 relative flex-col justify-center items-center p-12 overflow-hidden bg-black text-white"
      >
        
        {/* Background Silk */}
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
          className="absolute top-6 right-6 lg:top-12 lg:right-12 z-30"
        >
          <img 
            src="/xrilic/Xrilic logo.svg" 
            alt="Xrilic Logo" 
            className="h-16 w-auto object-contain"  // Increased size
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
          {/* Header */}
          <motion.div variants={itemVariants} className="text-center flex flex-col items-center space-y-6">
            
            <div className="space-y-2">
              <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-gray-900">
                Forgot Password?
              </h1>
              <p className="text-gray-500 text-lg">
                Enter your email to receive a reset link.
              </p>
            </div>
          </motion.div>

          {/* Form */}
          <form 
            onSubmit={handlePasswordReset} 
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
                onMouseEnter={() => setFocusedField('email')}
                onMouseLeave={() => focusedField !== 'email' && setFocusedField(null)}
              >
                <div className="pl-4 pr-2 text-gray-400">
                  <Mail className="w-5 h-5" />
                </div>

                <input
                  id="email"
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  required
                  className="w-full h-14 bg-white border-none focus:ring-0 text-gray-900 placeholder-gray-400 text-lg font-medium"
                />
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

            {/* RESET BUTTON */}
            <motion.button
              variants={itemVariants}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              type="submit"
              disabled={isLoading}
              className={`
                w-full h-12 rounded-lg font-semibold text-white transition-all duration-300 flex items-center justify-center gap-2 shadow-sm
                ${!isLoading 
                  ? 'bg-gray-900 hover:bg-gray-800 hover:shadow-lg' 
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none'}
              `}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Sending...</span>
                </>
              ) : (
                "Send Reset Link"
              )}
            </motion.button>

          </form>

          {/* Back to Login Link */}
          <motion.div 
            variants={itemVariants} 
            className="text-center"
          >
            <RouterLink 
              to="/login" 
              className="text-sm text-purple-600 font-semibold cursor-pointer hover:text-purple-700 hover:underline"
            >
              Remember your password? Sign In
            </RouterLink>
          </motion.div>
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

export default ForgotPasswordPage;