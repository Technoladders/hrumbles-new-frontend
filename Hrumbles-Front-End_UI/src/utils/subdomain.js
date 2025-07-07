// src/utils/subdomain.js

// IMPORTANT: Store your root domain in an environment variable
// In your .env file: VITE_APP_ROOT_DOMAIN=hrumbles.ai
const ROOT_DOMAIN = import.meta.env.VITE_APP_ROOT_DOMAIN || 'hrumbles.ai';

export const getOrganizationSubdomain = () => {
  const hostname = window.location.hostname;
  
  // Handles cases like 'technoladder.hrumbles.ai'
  if (hostname.endsWith(`.${ROOT_DOMAIN}`)) {
    const parts = hostname.split('.');
    // Assuming 'subdomain.root.domain' structure
    if (parts.length === 3) {
      return parts[0];
    }
  }
  
  // Handles local development with 'localhost'
  // Example: http://technoladder.localhost:5173
  if (hostname.includes('localhost')) {
      const parts = hostname.split('.');
      if (parts.length > 1 && parts[1] === 'localhost') {
          return parts[0];
      }
  }

  // If no subdomain is found (i.e., we are on 'hrumbles.ai' or 'localhost')
  return null;
};