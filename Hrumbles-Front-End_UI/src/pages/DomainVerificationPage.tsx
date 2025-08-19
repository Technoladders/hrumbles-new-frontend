import { useState, useEffect, FC, FormEvent, ChangeEvent } from 'react';
import { Link as RouterLink } from 'react-router-dom';

import useDebounce from '../hooks/useDebounce'; // Assuming this hook has its own types or is typed as `(value: T, delay: number) => T`
import { supabase } from "@/integrations/supabase/client"; // Your Supabase client

// --- Icon and Spinner Components ---
// In a real project, you might import these from a library like 'react-icons'

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

// --- Type Definitions ---

type ValidationStatus = 'idle' | 'validating' | 'valid' | 'invalid';

/*
 * To make TypeScript aware of your Vite environment variables,
 * create a `vite-env.d.ts` file in your `src` directory and add the following:
 *
 * /// <reference types="vite/client" />
 *
 * interface ImportMetaEnv {
 *   readonly VITE_APP_ROOT_DOMAIN: string;
 *   // more env variables...
 * }
 *
 * interface ImportMeta {
 *   readonly env: ImportMetaEnv;
 * }
 */


// --- Main Page Component ---

const DomainVerificationPage: FC = () => {
  const [subdomain, setSubdomain] = useState<string>('');
  const [validationStatus, setValidationStatus] = useState<ValidationStatus>('idle');
  const [isRedirecting, setIsRedirecting] = useState<boolean>(false);
  const debouncedSubdomain: string = useDebounce(subdomain, 500);

  useEffect(() => {
    const checkSubdomain = async () => {
      if (debouncedSubdomain.length === 0) {
        setValidationStatus('idle');
        return;
      }
      setValidationStatus('validating');
      try {
        // Supabase client is typed, so `data` and `error` have types inferred
        const { data, error } = await supabase
          .from('hr_organizations')
          .select('subdomain')
          .eq('subdomain', debouncedSubdomain.toLowerCase().trim())
          .single();
        if (error || !data) setValidationStatus('invalid');
        else setValidationStatus('valid');
      } catch (e) {
        setValidationStatus('invalid');
      }
    };
    checkSubdomain();
  }, [debouncedSubdomain]);

  const handleContinue = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (validationStatus !== 'valid') return;
    setIsRedirecting(true);
    const rootDomain = import.meta.env.VITE_APP_ROOT_DOMAIN || 'hrumbles.ai';
    const port = window.location.port ? `:${window.location.port}` : '';
    const protocol = window.location.protocol;
    const host = window.location.hostname === 'localhost' ? 'localhost' : rootDomain;
    window.location.href = `${protocol}//${debouncedSubdomain}.${host}${port}/login`;
  };
  
  const getValidationIcon = (): JSX.Element | null => {
    switch (validationStatus) {
      case 'validating': return <Spinner />;
      case 'valid': return <CheckCircleIcon />;
      case 'invalid': return <WarningTwoIcon />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-white font-sans grid grid-cols-1 lg:grid-cols-2">
      
      {/* --- Left Column: Testimonial/Info --- */}
     <div className="relative hidden lg:flex flex-col items-center justify-center p-12 login-gradient m-4" style={{borderRadius: '3rem' }}>

        {/* <RouterLink to="/" className="absolute top-12 left-6 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-800 bg-white rounded-full shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400">

            <CaretLeftIcon />
            Back to home
        </RouterLink> */}
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
          className="absolute top-14 right-14 h-20 w-auto rounded-full" // Use w-auto to maintain aspect ratio
          src="/1-cropped.svg"
        /> */}
        
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            {/* <div className="inline-flex items-center justify-center h-16 w-36 bg-yellow-400 rounded-2xl mb-6 shadow-md">
             
               <img alt="hrumbles" className="h-14 w-30 rounded-full" src="/1-cropped.svg" />
            </div> */}
            <h1 className="text-4xl font-bold text-gray-900">Verify Domain</h1>
            <p className="text-gray-500 mt-2">to access your company's workspace</p>
          </div>

          <form onSubmit={handleContinue} className="space-y-6">
            <div>
              <label htmlFor="domain" className="block text-sm font-medium text-gray-700 mb-1">
                Your Domain <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center rounded-lg border border-gray-300 focus-within:border-gray-800 focus-within:ring-1 focus-within:ring-gray-800 transition-all duration-200">
                <span className="pl-4 pr-2 text-gray-500">https://</span>
                <div className="relative flex-grow">
                  <input
                    type="text"
                    name="domain"
                    id="domain"
                    className="w-full h-12 border-none focus:outline-none text-gray-900 placeholder-gray-400"

                    placeholder="your-company"
                    value={subdomain} 
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setSubdomain(e.target.value)}
                    autoComplete="off"
                    autoCapitalize="none"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    {validationStatus !== 'idle' && getValidationIcon()}
                  </div>
                </div>
                <span className="pr-4 pl-1 text-gray-500">.{import.meta.env.VITE_APP_ROOT_DOMAIN || 'hrumbles.ai'}</span>
              </div>
              {validationStatus === 'invalid' && (
                <p className="mt-2 text-sm text-red-600">
                    This domain does not exist. Please check the name or sign up.
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={validationStatus !== 'valid' || isRedirecting}
              className="w-full flex justify-center items-center h-12 px-6 border border-transparent rounded-lg shadow-sm text-base font-medium text-white bg-gray-900 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isRedirecting ? <Spinner /> : 'Continue'}
            </button>
            
            <p className="text-center text-sm text-gray-600">
              Are you new?{' '}
              <RouterLink to="/signup" className="font-medium text-gray-800 hover:text-gray-900 underline">
                Sign up for a free trial
              </RouterLink>
            </p>
          </form>
        </div>
      </main>
    </div>
  );
};

export default DomainVerificationPage;