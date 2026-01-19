// src/pages/SetPassword.tsx

import React, { useState, useEffect, FC, FormEvent, ChangeEvent, KeyboardEvent, ReactNode } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { supabase } from "@/integrations/supabase/client"; // Ensure this path is correct
import { Eye, EyeOff, Loader2, Lock } from 'lucide-react';
import { motion } from 'framer-motion';
import Silk from '../components/ui/Reactbits-theme/Silk'; // Adjust path if needed

type AuthStatus = 'checking' | 'authenticated' | 'error';

const SetPasswordPage: FC = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus>('checking');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  
  // State for input focus styles
  const [focusedField, setFocusedField] = useState<'password' | 'confirmPassword' | null>(null);

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  };

  // This effect runs on component mount to verify the magic link
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // This event fires when the Supabase client detects the password recovery token in the URL
      if ((event === 'SIGNED_IN' || event === 'PASSWORD_RECOVERY') && session) {
        setAuthStatus('authenticated');
      }
    });

    // If the event doesn't fire after a short delay, the link is likely invalid or expired.
    const timer = setTimeout(() => {
      if (authStatus === 'checking') {
        setAuthStatus('error');
        setError("Invalid or expired link. Please request a new one.");
      }
    }, 5000); // 5-second timeout

    // Cleanup subscription on component unmount
    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, [authStatus]); // Rerun if authStatus changes (though it shouldn't after the first load)

  const handleSetPassword = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    // --- Client-side validation ---
    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      // The user is already in a temporary session, so we can update their details
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) throw updateError;
      
      setMessage("Your password has been updated successfully!");
      
      // Redirect to login after a short delay
      setTimeout(() => {
        navigate('/login');
      }, 2000);

    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === "Enter") {
      handleSetPassword(e as FormEvent);
    }
  };

  // Render different content based on the authentication status
  const renderContent = (): ReactNode => {
    switch (authStatus) {
      case 'checking':
        return (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center flex flex-col items-center space-y-6"
          >
            <div className="space-y-2">
              <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-gray-900">
                Verifying your link...
              </h1>
            </div>
          </motion.div>
        );
      
      case 'error':
        return (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center flex flex-col items-center space-y-6"
          >
            <div className="space-y-2">
              <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-gray-900">
                Link Error
              </h1>
              <p className="text-gray-500 text-lg">
                {error}
              </p>
            </div>
            <motion.div variants={itemVariants}>
              <RouterLink 
                to="/login" 
                className="text-sm text-purple-600 font-semibold cursor-pointer hover:text-purple-700 hover:underline"
              >
                Go to Login
              </RouterLink>
            </motion.div>
          </motion.div>
        );

      case 'authenticated':
        return (
          <React.Fragment>
            {/* Header */}
            <motion.div variants={itemVariants} className="text-center flex flex-col items-center space-y-6">
              
              <div className="space-y-2">
                <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-gray-900">
                  Set Your Password
                </h1>
                <p className="text-gray-500 text-lg">
                  Please choose a secure new password.
                </p>
              </div>
            </motion.div>

            {/* Form */}
            <form 
              onSubmit={handleSetPassword} 
              className="space-y-6"
            >
              {/* PASSWORD INPUT */}
              <motion.div variants={itemVariants} className="space-y-2">
                <label htmlFor="password" className="text-sm font-semibold text-gray-700 ml-1">
                  New Password
                </label>

                <div 
                  className={`
                    relative flex items-center transition-all duration-300
                    bg-white border rounded-xl overflow-hidden shadow-sm
                    ${focusedField === 'password'
                      ? 'border-purple-600 ring-4 ring-purple-100/50 shadow-md' 
                      : 'border-gray-200 hover:border-gray-300'
                    }
                  `}
                  onMouseEnter={() => setFocusedField('password')}
                  onMouseLeave={() => focusedField !== 'password' && setFocusedField(null)}
                >
                  <div className="pl-4 pr-2 text-gray-400">
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
                    required
                    className="w-full h-14 bg-white border-none focus:ring-0 text-gray-900 placeholder-gray-400 text-lg font-medium pr-10"
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

              {/* CONFIRM PASSWORD INPUT */}
              <motion.div variants={itemVariants} className="space-y-2">
                <label htmlFor="confirm-password" className="text-sm font-semibold text-gray-700 ml-1">
                  Confirm New Password
                </label>

                <div 
                  className={`
                    relative flex items-center transition-all duration-300
                    bg-white border rounded-xl overflow-hidden shadow-sm
                    ${focusedField === 'confirmPassword'
                      ? 'border-purple-600 ring-4 ring-purple-100/50 shadow-md' 
                      : 'border-gray-200 hover:border-gray-300'
                    }
                  `}
                  onMouseEnter={() => setFocusedField('confirmPassword')}
                  onMouseLeave={() => focusedField !== 'confirmPassword' && setFocusedField(null)}
                >
                  <div className="pl-4 pr-2 text-gray-400">
                    <Lock className="w-5 h-5" />
                  </div>

                  <input
                    id="confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={() => setFocusedField('confirmPassword')}
                    onBlur={() => setFocusedField(null)}
                    required
                    className="w-full h-14 bg-white border-none focus:ring-0 text-gray-900 placeholder-gray-400 text-lg font-medium pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
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

              {/* SUCCESS MESSAGE */}
              {message && (
                <motion.div 
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 rounded-lg bg-green-50 border border-green-100 text-sm text-green-600 text-center font-medium"
                >
                  {message}
                </motion.div>
              )}

              {/* SET PASSWORD BUTTON */}
              <motion.button
                variants={itemVariants}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                type="submit"
                disabled={loading || !!message} // Disable after success
                className={`
                  w-full h-12 rounded-lg font-semibold text-white transition-all duration-300 flex items-center justify-center gap-2 shadow-sm
                  ${!loading && !message
                    ? 'bg-gray-900 hover:bg-gray-800 hover:shadow-lg' 
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none'}
                `}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  "Set New Password"
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
                Back to Sign In
              </RouterLink>
            </motion.div>
          </React.Fragment>
        );
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
            {renderContent()}
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

export default SetPasswordPage;