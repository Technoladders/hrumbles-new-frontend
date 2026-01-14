import { useState, useEffect, FC, FormEvent, ChangeEvent } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight
} from 'lucide-react';

import useDebounce from '../hooks/useDebounce';
import { supabase } from "@/integrations/supabase/client";
import Orb from '../components/ui/Reactbits-theme/Orb';

// ── Helper: Get current root domain ─────────────────────────────────────
export const getRootDomain = (): string => {
  if (import.meta.env.VITE_APP_ROOT_DOMAIN) {
    const envDomain = import.meta.env.VITE_APP_ROOT_DOMAIN as string;
    if (['hrumbles.ai', 'xrilic.ai'].includes(envDomain)) return envDomain;
    if (envDomain.endsWith('.xrilic.ai')) return 'xrilic.ai';
    if (envDomain.endsWith('.hrumbles.ai')) return 'hrumbles.ai';
    return envDomain;
  }
  const hostname = window.location.hostname.replace(/:\d+$/, '');
  const prefixStripPatterns = [/^dev\./, /^staging\./, /^preview\./, /^test\./, /^qa\./, /^ci\./];
  let cleanHost = hostname;
  for (const pattern of prefixStripPatterns) {
    if (pattern.test(cleanHost)) {
      cleanHost = cleanHost.replace(pattern, '');
      break;
    }
  }
  if (cleanHost === 'localhost' || cleanHost.startsWith('127.0.') || cleanHost.startsWith('192.168.')) {
    return 'localhost';
  }
  const parts = cleanHost.split('.');
  if (parts.length >= 2) return parts.slice(-2).join('.');
  return 'xrilic.ai';
};

// ── Main Component ───────────────────────────────────────────────────────

const DomainVerificationPage: FC = () => {
  const [subdomain, setSubdomain] = useState<string>('');
  const [validationStatus, setValidationStatus] = useState<'idle' | 'validating' | 'valid' | 'invalid'>('idle');
  const [isRedirecting, setIsRedirecting] = useState<boolean>(false);
  const [isFocused, setIsFocused] = useState(false);

  const debouncedSubdomain = useDebounce(subdomain, 500);
  const rootDomain = getRootDomain();

  useEffect(() => {
    const checkSubdomain = async () => {
      if (!debouncedSubdomain.trim()) {
        setValidationStatus('idle');
        return;
      }
      setValidationStatus('validating');
      try {
        const { data, error } = await supabase
          .from('hr_organizations')
          .select('subdomain')
          .eq('subdomain', debouncedSubdomain.toLowerCase().trim())
          .single();

        if (error || !data) {
          setValidationStatus('invalid');
        } else {
          setValidationStatus('valid');
        }
      } catch (e) {
        console.error('Subdomain check failed:', e);
        setValidationStatus('invalid');
      }
    };
    checkSubdomain();
  }, [debouncedSubdomain]);

  const handleContinue = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (validationStatus !== 'valid') return;
    setIsRedirecting(true);
    const protocol = window.location.protocol;
    const port = window.location.port ? `:${window.location.port}` : '';
    const targetUrl = `${protocol}//${debouncedSubdomain.trim().toLowerCase()}.${rootDomain}${port}/login`;
    window.location.href = targetUrl;
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  };

  return (
    <div className="min-h-screen w-full flex font-sans">
      
      {/* ── LEFT SIDE: Black Background + Orb + Tagline ──────────────────── */}
      <div className="hidden lg:flex w-1/2 relative flex-col justify-center items-center p-12 overflow-hidden bg-black text-white">
        
        {/* Background Orb */}
        <div className="absolute inset-0 z-0">
          <Orb
            hoverIntensity={0.5}
            rotateOnHover={true}
            hue={0}
            forceHoverState={false}
          />
        </div>
        
        {/* Content Layer (Tagline Only) */}
        <div className="p-8 relative z-10 w-full max-w-lg text-center lg:text-left">
           <motion.h1 
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ duration: 0.8, delay: 0.2 }}
             className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight tracking-tight text-white"
           >
             One platform.{" "}
             <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
               Every function. Zero chaos.
             </span>
           </motion.h1>
        </div>

        {/* Fixed Footer Text - Snapped to the bottom left */}
        <div className="absolute bottom-12 left-12 z-20 text-sm text-gray-500 font-medium">
          © {new Date().getFullYear()} Xrilic AI.
        </div>
      </div>

      {/* ── RIGHT SIDE: Soft Light Theme + Logo + Form ───────────────────── */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-6 lg:p-12 relative z-20 bg-slate-50 text-gray-900 selection:bg-purple-100 selection:text-purple-900 overflow-hidden">
        
        {/* Subtle Ambient Mesh Gradient Background for Right Side */}
        <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-purple-50 via-slate-50 to-gray-100 opacity-70 pointer-events-none" />

        <motion.div 
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
          }}
          className="w-full max-w-md space-y-8 relative z-10"
        >
          {/* Header with LOGO */}
          <motion.div variants={itemVariants} className="text-center flex flex-col items-center space-y-6">
            
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <img 
                 src="/xrilic/Xrilic logo.svg" 
                 alt="Xrilic Logo" 
                 className="h-16 w-auto object-contain"
               />
            </motion.div>

            <div className="space-y-2">
              <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-gray-900">
                Verify your workspace
              </h1>
              <p className="text-gray-500 text-lg">
                Enter your organization's domain to continue.
              </p>
            </div>
          </motion.div>

          {/* Form */}
          <motion.form 
            variants={itemVariants} 
            onSubmit={handleContinue} 
            className="space-y-6"
          >
            <div className="space-y-2">
              <label htmlFor="domain" className="text-sm font-semibold text-gray-700 ml-1">
                Workspace URL
              </label>

              {/* The input container is explicitly pure white (bg-white) to pop off the bg-slate-50 background */}
              <div 
                className={`
                  relative flex items-center transition-all duration-300
                  bg-white border rounded-xl overflow-hidden shadow-sm
                  ${isFocused 
                    ? 'border-purple-600 ring-4 ring-purple-100/50 shadow-md' 
                    : 'border-gray-200 hover:border-gray-300'
                  }
                  ${validationStatus === 'invalid' ? '!border-red-500 !ring-red-100' : ''}
                  ${validationStatus === 'valid' ? '!border-emerald-500 !ring-emerald-100' : ''}
                `}
              >
                <div className="pl-4 pr-2 select-none flex items-center gap-2 bg-white">
                  <span className="text-xs uppercase font-bold tracking-wider text-gray-400">https://</span>
                </div>

                <input
                  type="text"
                  id="domain"
                  className="w-full h-14 bg-white border-none outline-none focus:outline-none focus:ring-0 text-gray-900 placeholder-gray-400 text-lg font-medium"
                  placeholder="your-company"
                  value={subdomain}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setSubdomain(e.target.value.trimStart())}
                  autoComplete="off"
                  autoCapitalize="none"
                />

                <div className="pr-4 flex items-center gap-2 bg-white text-gray-400 font-medium">
                  <span className="hidden sm:inline-block">.{rootDomain}</span>
                  
                  {/* Status Icons */}
                  <div className="w-6 h-6 flex items-center justify-center">
                    <AnimatePresence mode="wait">
                      {validationStatus === 'validating' && (
                        <motion.div
                          key="loading"
                          initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                        >
                          <Loader2 className="w-5 h-5 animate-spin text-purple-600" />
                        </motion.div>
                      )}
                      {validationStatus === 'valid' && (
                        <motion.div
                          key="valid"
                          initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                        >
                          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        </motion.div>
                      )}
                      {validationStatus === 'invalid' && (
                        <motion.div
                          key="invalid"
                          initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                        >
                          <AlertCircle className="w-5 h-5 text-red-500" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>

              {/* Validation Message */}
              <div className="h-6 ml-1">
                <AnimatePresence>
                  {validationStatus === 'invalid' && (
                    <motion.p 
                      initial={{ opacity: 0, y: -5 }} 
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="text-sm text-red-600 flex items-center gap-1.5 font-medium"
                    >
                      <AlertCircle className="w-3 h-3" />
                      Workspace not found. Please check the spelling.
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              type="submit"
              disabled={validationStatus !== 'valid' || isRedirecting}
              className={`
                w-full h-12 rounded-lg font-semibold text-white transition-all duration-300 flex items-center justify-center gap-2 shadow-sm
                ${validationStatus === 'valid' 
                  ? 'bg-gray-900 hover:bg-gray-800 hover:shadow-lg' 
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none'}
              `}
            >
              {isRedirecting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Redirecting...</span>
                </>
              ) : (
                <>
                  <span>Continue to Workspace</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </motion.button>

            <motion.p variants={itemVariants} className="text-center text-sm text-gray-500 mt-6">
              Don't have a workspace yet?{' '}
              <RouterLink 
                to="/signup" 
                className="text-purple-600 hover:text-purple-700 font-semibold transition-colors hover:underline underline-offset-4"
              >
                Create one now
              </RouterLink>
            </motion.p>
          </motion.form>
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

export default DomainVerificationPage;