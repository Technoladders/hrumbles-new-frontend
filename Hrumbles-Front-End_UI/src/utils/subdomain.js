// src/utils/subdomain.js (Updated)

// IMPORTANT: Store your root domain in an environment variable
// In your .env file: VITE_APP_ROOT_DOMAIN=hrumbles.ai
const ROOT_DOMAIN = import.meta.env.VITE_APP_ROOT_DOMAIN || 'hrumbles.ai';

export const getOrganizationSubdomain = () => {
  const hostname = window.location.hostname;
  
  // Handles cases like 'technoladder.hrumbles.ai' and 'app.hrumbles.ai'
  if (hostname.endsWith(`.${ROOT_DOMAIN}`)) {
    const parts = hostname.split('.');
    // Assuming 'subdomain.root.domain' structure
    if (parts.length === 3) {
      const subdomain = parts[0];

      // --- THIS IS THE KEY MODIFICATION ---
      // If the subdomain is 'app' or 'www', we treat it as if no
      // organization is specified. Returning null triggers the
      // DomainVerificationPage in your App.jsx.
      if (subdomain === 'app' || subdomain === 'www') {
        return null;
      }
      
      // For any other subdomain, it's a valid organization.
      return subdomain;
    }
  }
  
  // Handles local development with 'localhost'
  // Example: http://technoladder.localhost:5173 -> returns 'technoladder'
  if (hostname.includes('localhost')) {
      const parts = hostname.split('.');
      if (parts.length > 1 && parts[1] === 'localhost') {
          const subdomain = parts[0];

          // --- APPLY THE SAME LOGIC FOR LOCAL DEVELOPMENT ---
          if (subdomain === 'app') {
            return null;
          }

          return subdomain;
      }
  }

  // If no subdomain is found (i.e., we are on 'hrumbles.ai' or 'localhost')
  return null;
};