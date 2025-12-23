// src/utils/subdomain.js (NEW AND IMPROVED VERSION)

export const getOrganizationSubdomain = () => {
  const hostname = window.location.hostname;
  
  // This is loaded from your .env files (.env.dev, .env.staging, etc.)
  const rootDomain = import.meta.env.VITE_APP_ROOT_DOMAIN;

  // If the environment variable is not set, we can't proceed.
  if (!rootDomain) {
    // Check for localhost as a fallback for local development
    if (hostname.includes('localhost')) {
        const parts = hostname.split('.');
        if (parts.length > 1 && parts[1] === 'localhost' && parts[0] !== 'www' && parts[0] !== 'app') {
            return parts[0];
        }
    }
    return null;
  }

  // --- CORE LOGIC ---

  // Case 1: The user is on the root domain itself (e.g., "xrilic.ai" or "www.xrilic.ai")
  // This should show the domain verification page.
  if (hostname === rootDomain || hostname === `www.${rootDomain}`) {
    return null;
  }

  // Case 2: The hostname ends with the root domain (e.g., "demo.xrilic.ai" or "demo.dev.xrilic.ai")
  // This is the main logic that will extract the organization's name.
  if (hostname.endsWith(`.${rootDomain}`)) {
    // This robustly removes the root part from the end to get the subdomain.
    // "demo.dev.xrilic.ai".split(".dev.xrilic.ai") => ["demo", ""]
    // "demo.xrilic.ai".split(".xrilic.ai") => ["demo", ""]
    const subdomain = hostname.split(`.${rootDomain}`)[0];
    return subdomain;
  }
  
  // If none of the above conditions are met, return null.
  return null;
};